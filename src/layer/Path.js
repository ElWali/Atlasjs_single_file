import {
    Layer
} from './Layer.js';
import {
    setOptions
} from '../core/Util.js';

export const Path = Layer.extend({
    options: {
        stroke: true,
        color: '#3388ff',
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: null,
        dashOffset: null,
        fill: false,
        fillColor: null,
        fillOpacity: 0.2,
        fillRule: 'evenodd',
        interactive: true,
        bubblingMouseEvents: true
    },

    beforeAdd: function(map) {
        this._renderer = map.getRenderer(this);
    },

    onAdd: function() {
        this._renderer._initPath(this);
        this._reset();
        this._renderer._addPath(this);
    },

    onRemove: function() {
        this._renderer._removePath(this);
    },

    redraw: function() {
        if (this._map) {
            this._renderer._updatePath(this);
        }
        return this;
    },

    setStyle: function(style) {
        setOptions(this, style);
        if (this._renderer) {
            this._renderer._updateStyle(this);
            if (this.options.stroke && style && Object.prototype.hasOwnProperty.call(style, 'weight')) {
                this._updateBounds();
            }
        }
        return this;
    },

    bringToFront: function() {
        if (this._renderer) {
            this._renderer._bringToFront(this);
        }
        return this;
    },

    bringToBack: function() {
        if (this._renderer) {
            this._renderer._bringToBack(this);
        }
        return this;
    },

    getElement: function() {
        return this._path;
    },

    _reset: function() {
        this._project();
        this._update();
    },

    _clickTolerance: function() {
        return (this.options.stroke ? this.options.weight / 2 : 0) +
            (this._renderer.options.tolerance || 0);
    }
});