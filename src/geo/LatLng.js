import {
    formatNum,
    isArray,
    wrapNum
} from '../core/Util.js';
let Earth;
import('./CRS.js').then(module => {
    Earth = module.Earth;
});

export function LatLng(lat, lng, alt) {
    if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
    }

    this.lat = +lat;
    this.lng = +lng;

    if (alt !== undefined) {
        this.alt = +alt;
    }
}

LatLng.prototype = {
    equals: function(obj, maxMargin) {
        if (!obj) {
            return false;
        }

        obj = toLatLng(obj);

        var margin = Math.max(
            Math.abs(this.lat - obj.lat),
            Math.abs(this.lng - obj.lng));

        return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
    },

    toString: function(precision) {
        return 'LatLng(' +
            formatNum(this.lat, precision) + ', ' +
            formatNum(this.lng, precision) + ')';
    },

    distanceTo: function(other) {
        return Earth.distance(this, toLatLng(other));
    },

    wrap: function() {
        return Earth.wrapLatLng(this);
    },

    toBounds: function(sizeInMeters) {
        var latAccuracy = 180 * sizeInMeters / 40075017,
            lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

        return import('./LatLngBounds.js').then(({
            toLatLngBounds
        }) => {
            return toLatLngBounds(
                [this.lat - latAccuracy, this.lng - lngAccuracy], [this.lat + latAccuracy, this.lng + lngAccuracy]);
        });
    },

    clone: function() {
        return new LatLng(this.lat, this.lng, this.alt);
    }
};

export function toLatLng(a, b, c) {
    if (a instanceof LatLng) {
        return a;
    }
    if (isArray(a) && typeof a[0] !== 'object') {
        if (a.length === 3) {
            return new LatLng(a[0], a[1], a[2]);
        }
        if (a.length === 2) {
            return new LatLng(a[0], a[1]);
        }
        return null;
    }
    if (a === undefined || a === null) {
        return a;
    }
    if (typeof a === 'object' && 'lat' in a) {
        return new LatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
    }
    if (b === undefined) {
        return null;
    }
    return new LatLng(a, b, c);
}