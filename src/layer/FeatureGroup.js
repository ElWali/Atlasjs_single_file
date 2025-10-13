import {
    LayerGroup
} from './LayerGroup.js';
import {
    LatLngBounds
} from '../geo/LatLngBounds.js';

export const FeatureGroup = LayerGroup.extend({
    addLayer: function(layer) {
        if (this.hasLayer(layer)) {
            return this;
        }

        layer.addEventParent(this);

        LayerGroup.prototype.addLayer.call(this, layer);

        return this.fire('layeradd', {
            layer: layer
        });
    },

    removeLayer: function(layer) {
        if (!this.hasLayer(layer)) {
            return this;
        }
        if (layer in this._layers) {
            layer = this._layers[layer];
        }

        layer.removeEventParent(this);

        LayerGroup.prototype.removeLayer.call(this, layer);

        return this.fire('layerremove', {
            layer: layer
        });
    },

    setStyle: function(style) {
        return this.invoke('setStyle', style);
    },

    bringToFront: function() {
        return this.invoke('bringToFront');
    },

    bringToBack: function() {
        return this.invoke('bringToBack');
    },

    getBounds: function() {
        var bounds = new LatLngBounds();

        for (var id in this._layers) {
            var layer = this._layers[id];
            bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
        }
        return bounds;
    }
});

export function featureGroup(layers, options) {
    return new FeatureGroup(layers, options);
}