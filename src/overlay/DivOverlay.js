import { Layer } from '../layer/Layer.js';
import { on, off, remove, getPosition, setPosition, getScale } from '../core/Dom.js';
import { Point } from '../geo/Point.js';
import { stamp } from '../core/Util.js';

export const DivOverlay = Layer.extend({
    options: {
        interactive: false,
        offset: [0, 7],
        className: '',
        pane: 'popupPane'
    },

    initialize: function(options, source) {
        setOptions(this, options);
        this._source = source;
    },

    onAdd: function(map) {
        this._zoomAnimated = map._zoomAnimated;
        if (!this._container) {
            this._initLayout();
        }
        if (map._fadeAnimated) {
            setOpacity(this._container, 0);
        }
        clearTimeout(this._removeTimeout);
        this.getPane().appendChild(this._container);
        this.update();
        if (map._fadeAnimated) {
            setOpacity(this._container, 1);
        }
        this.bringToFront();
    },

    onRemove: function(map) {
        if (map._fadeAnimated) {
            setOpacity(this._container, 0);
            this._removeTimeout = setTimeout(bind(remove, undefined, this._container), 200);
        } else {
            remove(this._container);
        }
    },

    getLatLng: function() {
        return this._latlng;
    },

    setLatLng: function(latlng) {
        this._latlng = toLatLng(latlng);
        if (this._map) {
            this._updatePosition();
            this._adjustPan();
        }
        return this;
    },

    getContent: function() {
        return this._content;
    },

    setContent: function(content) {
        this._content = content;
        this.update();
        return this;
    },

    getElement: function() {
        return this._container;
    },

    update: function() {
        if (!this._map) {
            return;
        }
        this._container.style.visibility = 'hidden';
        this._updateContent();
        this._updateLayout();
        this._updatePosition();
        this._container.style.visibility = '';
        this._adjustPan();
    },

    getEvents: function() {
        return {
            zoom: this._updatePosition,
            viewreset: this._updatePosition
        };
    },

    isOpen: function() {
        return !!this._map && this._map.hasLayer(this);
    },

    bringToFront: function() {
        if (this._map) {
            toFront(this._container);
        }
        return this;
    },

    bringToBack: function() {
        if (this._map) {
            toBack(this._container);
        }
        return this;
    },

    _prepareOpen: function(parent, layer, latlng) {
        if (!(layer instanceof Layer)) {
            latlng = layer;
            layer = parent;
        }

        if (layer instanceof FeatureGroup) {
            for (var id in parent._layers) {
                layer = parent._layers[id];
                break;
            }
        }

        if (!latlng) {
            if (layer.getCenter) {
                latlng = layer.getCenter();
            } else if (layer.getLatLng) {
                latlng = layer.getLatLng();
            } else {
                throw new Error('Unable to get source layer LatLng.');
            }
        }
        this._source = layer;
        this.setLatLng(latlng);

        if (this._map) {
            this.update();
        }
        return this;
    },

    _updateContent: function() {
        if (!this._content) {
            return;
        }

        var node = this._contentNode;
        var content = (typeof this._content === 'function') ? this._content(this._source || this) : this._content;

        if (typeof content === 'string') {
            node.innerHTML = content;
        } else {
            while (node.hasChildNodes()) {
                node.removeChild(node.firstChild);
            }
            node.appendChild(content);
        }
        this.fire('contentupdate');
    },

    _updatePosition: function() {
        if (!this._map) {
            return;
        }

        var pos = this._map.latLngToLayerPoint(this._latlng),
            offset = toPoint(this.options.offset),
            anchor = this._getAnchor();

        if (this._zoomAnimated) {
            setPosition(this._container, pos.add(anchor));
        } else {
            offset = offset.add(pos).add(anchor);
        }

        var bottom = this._containerBottom = -offset.y,
            left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

        this._container.style.bottom = bottom + 'px';
        this._container.style.left = left + 'px';
    },

    _getAnchor: function() {
        return new Point(0, 0);
    }
});