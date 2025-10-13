import {
    Layer
} from '../layer/Layer.js';
import {
    Bounds
} from '../geo/Bounds.js';
import {
    setOptions,
    stamp
} from '../core/Util.js';
import * as Browser from '../core/Browser.js';
import {
    addClass,
    setPosition,
    setTransform
} from '../core/Dom.js';

export const Renderer = Layer.extend({
    options: {
        padding: 0.1
    },

    initialize: function(options) {
        setOptions(this, options);
        stamp(this);
        this._layers = this._layers || {};
    },

    onAdd: function() {
        if (!this._container) {
            this._initContainer();

            addClass(this._container, 'atlas-zoom-animated');
        }

        this.getPane().appendChild(this._container);
        this._update();
        this.on('update', this._updatePaths, this);
    },

    onRemove: function() {
        this.off('update', this._updatePaths, this);
        this._destroyContainer();
    },

    getEvents: function() {
        var events = {
            viewreset: this._reset,
            zoom: this._onZoom,
            moveend: this._update,
            zoomend: this._onZoomEnd
        };
        if (this._zoomAnimated) {
            events.zoomanim = this._onAnimZoom;
        }
        return events;
    },

    _onAnimZoom: function(ev) {
        this._updateTransform(ev.center, ev.zoom);
    },

    _onZoom: function() {
        this._updateTransform(this._map.getCenter(), this._map.getZoom());
    },

    _updateTransform: function(center, zoom) {
        var scale = this._map.getZoomScale(zoom, this._zoom),
            viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
            currentCenterPoint = this._map.project(this._center, zoom),
            topLeftOffset = viewHalf.multiplyBy(-scale).add(currentCenterPoint)
            .subtract(this._map._getNewPixelOrigin(center, zoom));

        if (Browser.any3d) {
            setTransform(this._container, topLeftOffset, scale);
        } else {
            setPosition(this._container, topLeftOffset);
        }
    },

    _reset: function() {
        this._update();
        this._updateTransform(this._center, this._zoom);

        for (var id in this._layers) {
            this._layers[id]._reset();
        }
    },

    _onZoomEnd: function() {
        for (var id in this._layers) {
            this._layers[id]._project();
        }
    },

    _updatePaths: function() {
        for (var id in this._layers) {
            this._layers[id]._update();
        }
    },

    _update: function() {
        var p = this.options.padding,
            size = this._map.getSize(),
            min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

        this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());

        this._center = this._map.getCenter();
        this._zoom = this._map.getZoom();
    }
});