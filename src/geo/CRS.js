import {
    extend,
    wrapNum
} from '../core/Util.js';
import {
    LatLng,
    toLatLng
} from './LatLng.js';
import {
    LatLngBounds
} from './LatLngBounds.js';
import {
    Bounds
} from './Bounds.js';

export const CRS = {
    latLngToPoint: function(latlng, zoom) {
        var projectedPoint = this.projection.project(latlng),
            scale = this.scale(zoom);

        return this.transformation._transform(projectedPoint, scale);
    },

    pointToLatLng: function(point, zoom) {
        var scale = this.scale(zoom),
            untransformedPoint = this.transformation.untransform(point, scale);

        return this.projection.unproject(untransformedPoint);
    },

    project: function(latlng) {
        return this.projection.project(latlng);
    },

    unproject: function(point) {
        return this.projection.unproject(point);
    },

    scale: function(zoom) {
        return 256 * Math.pow(2, zoom);
    },

    zoom: function(scale) {
        return Math.log(scale / 256) / Math.LN2;
    },

    getProjectedBounds: function(zoom) {
        if (this.infinite) {
            return null;
        }

        var b = this.projection.bounds,
            s = this.scale(zoom),
            min = this.transformation.transform(b.min, s),
            max = this.transformation.transform(b.max, s);

        return new Bounds(min, max);
    },

    infinite: false,

    wrapLatLng: function(latlng) {
        var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
            lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat,
            alt = latlng.alt;

        return new LatLng(lat, lng, alt);
    },

    wrapLatLngBounds: function(bounds) {
        var center = bounds.getCenter(),
            newCenter = this.wrapLatLng(center),
            latShift = center.lat - newCenter.lat,
            lngShift = center.lng - newCenter.lng;

        if (latShift === 0 && lngShift === 0) {
            return bounds;
        }

        var sw = bounds.getSouthWest(),
            ne = bounds.getNorthEast(),
            newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift),
            newNe = new LatLng(ne.lat - latShift, ne.lng - lngShift);

        return new LatLngBounds(newSw, newNe);
    }
};

export const Earth = extend({}, CRS, {
    wrapLng: [-180, 180],

    R: 6371000,

    distance: function(latlng1, latlng2) {
        var rad = Math.PI / 180,
            lat1 = latlng1.lat * rad,
            lat2 = latlng2.lat * rad,
            sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
            sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2),
            a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.R * c;
    }
});