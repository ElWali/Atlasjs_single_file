import {
    Polygon
} from './Polygon.js';
import {
    toLatLngBounds
} from '../geo/LatLngBounds.js';

export const Rectangle = Polygon.extend({
    initialize: function(latLngBounds, options) {
        Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
    },

    setBounds: function(latLngBounds) {
        return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
    },

    _boundsToLatLngs: function(latLngBounds) {
        latLngBounds = toLatLngBounds(latLngBounds);
        return [
            latLngBounds.getSouthWest(),
            latLngBounds.getNorthWest(),
            latLngBounds.getNorthEast(),
            latLngBounds.getSouthEast()
        ];
    }
});

export function rectangle(latLngBounds, options) {
    return new Rectangle(latLngBounds, options);
}