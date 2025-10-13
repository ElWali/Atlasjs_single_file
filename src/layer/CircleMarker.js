import {
    Path
} from './Path.js';
import {
    toLatLng
} from '../geo/LatLng.js';
import {
    Bounds
} from '../geo/Bounds.js';
import {
    setOptions
} from '../core/Util.js';

export const CircleMarker = Path.extend({
    options: {
        fill: true,
        radius: 10
    },

    initialize: function(latlng, options) {
        setOptions(this, options);
        this._latlng = toLatLng(latlng);
        this._radius = this.options.radius;
    },

    setLatLng: function(latlng) {
        var oldLatLng = this._latlng;
        this._latlng = toLatLng(latlng);
        this.redraw();
        return this.fire('move', {
            oldLatLng: oldLatLng,
            latlng: this._latlng
        });
    },

    getLatLng: function() {
        return this._latlng;
    },

    setRadius: function(radius) {
        this.options.radius = this._radius = radius;
        return this.redraw();
    },

    getRadius: function() {
        return this._radius;
    },

    setStyle: function(options) {
        var radius = options && options.radius || this._radius;
        Path.prototype.setStyle.call(this, options);
        this.setRadius(radius);
        return this;
    },

    _project: function() {
        this._point = this._map.latLngToLayerPoint(this._latlng);
        this._updateBounds();
    },

    _updateBounds: function() {
        var r = this._radius,
            r2 = this._radiusY || r,
            w = this._clickTolerance(),
            p = [r + w, r2 + w];
        this._pxBounds = new Bounds(this._point.subtract(p), this._point.add(p));
    },

    _update: function() {
        if (this._map) {
            this._updatePath();
        }
    },

    _updatePath: function() {
        this._renderer._updateCircle(this);
    },

    _empty: function() {
        return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
    },

    _containsPoint: function(p) {
        return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
    }
});

export function circleMarker(latlng, options) {
    return new CircleMarker(latlng, options);
}