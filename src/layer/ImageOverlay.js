import {
    Layer
} from './Layer.js';
import {
    toLatLngBounds
} from '../geo/LatLngBounds.js';
import {
    setOptions,
    bind
} from '../core/Util.js';
import {
    falseFn
} from '../core/Dom.js';
import {
    setTransform,
    setPosition,
    addClass,
    remove,
    toFront,
    toBack,
    setOpacity,
    create
} from '../core/Dom.js';
import {
    Bounds
} from '../geo/Bounds.js';

export const ImageOverlay = Layer.extend({
    options: {
        opacity: 1,
        alt: '',
        interactive: false,
        crossOrigin: false,
        errorOverlayUrl: '',
        zIndex: 1,
        className: ''
    },

    initialize: function(url, bounds, options) {
        this._url = url;
        this._bounds = toLatLngBounds(bounds);

        setOptions(this, options);
    },

    onAdd: function() {
        if (!this._image) {
            this._initImage();

            if (this.options.opacity < 1) {
                this._updateOpacity();
            }
        }

        if (this.options.interactive) {
            addClass(this._image, 'atlas-interactive');
            this.addInteractiveTarget(this._image);
        }

        this.getPane().appendChild(this._image);
        this._reset();
    },

    onRemove: function() {
        remove(this._image);
        if (this.options.interactive) {
            this.removeInteractiveTarget(this._image);
        }
    },

    setOpacity: function(opacity) {
        this.options.opacity = opacity;
        if (this._image) {
            this._updateOpacity();
        }
        return this;
    },

    setStyle: function(styleOpts) {
        if (styleOpts.opacity) {
            this.setOpacity(styleOpts.opacity);
        }
        return this;
    },

    bringToFront: function() {
        if (this._map) {
            toFront(this._image);
        }
        return this;
    },

    bringToBack: function() {
        if (this._map) {
            toBack(this._image);
        }
        return this;
    },

    setUrl: function(url) {
        this._url = url;

        if (this._image) {
            this._image.src = url;
        }
        return this;
    },

    setBounds: function(bounds) {
        this._bounds = toLatLngBounds(bounds);
        if (this._map) {
            this._reset();
        }
        return this;
    },

    getEvents: function() {
        var events = {
            zoom: this._reset,
            viewreset: this._reset
        };

        if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
        }

        return events;
    },

    setZIndex: function(value) {
        this.options.zIndex = value;
        this._updateZIndex();
        return this;
    },

    getBounds: function() {
        return this._bounds;
    },

    getElement: function() {
        return this._image;
    },

    _initImage: function() {
        var wasElementSupplied = this._url.tagName === 'IMG';
        var img = this._image = wasElementSupplied ? this._url : create('img');

        addClass(img, 'atlas-image-layer');
        if (this._zoomAnimated) {
            addClass(img, 'atlas-zoom-animated');
        }
        if (this.options.className) {
            addClass(img, this.options.className);
        }

        img.onselectstart = falseFn;
        img.onmousemove = falseFn;

        img.onload = bind(this.fire, this, 'load');
        img.onerror = bind(this._overlayOnError, this, 'error');

        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }

        if (this.options.zIndex) {
            this._updateZIndex();
        }

        if (wasElementSupplied) {
            this._url = img.src;
            return;
        }

        img.src = this._url;
        img.alt = this.options.alt;
    },

    _animateZoom: function(e) {
        var scale = this._map.getZoomScale(e.zoom),
            offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;

        setTransform(this._image, offset, scale);
    },

    _reset: function() {
        var image = this._image,
            bounds = new Bounds(
                this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
                this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
            size = bounds.getSize();

        setPosition(image, bounds.min);

        image.style.width = size.x + 'px';
        image.style.height = size.y + 'px';
    },

    _updateOpacity: function() {
        setOpacity(this._image, this.options.opacity);
    },

    _updateZIndex: function() {
        if (this._image && this.options.zIndex !== undefined && this.options.zIndex !== null) {
            this._image.style.zIndex = this.options.zIndex;
        }
    },

    _overlayOnError: function() {
        this.fire('error');
        var errorUrl = this.options.errorOverlayUrl;
        if (errorUrl && this._url !== errorUrl) {
            this._url = errorUrl;
            this._image.src = errorUrl;
        }
    },

    getCenter: function() {
        return this._bounds.getCenter();
    }
});

export function imageOverlay(url, bounds, options) {
    return new ImageOverlay(url, bounds, options);
}