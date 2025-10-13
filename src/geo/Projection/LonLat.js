import {
    Point
} from '../Point.js';
import {
    Bounds
} from '../Bounds.js';
import {
    LatLng
} from '../LatLng.js';

export const LonLat = {
    project: function(latlng) {
        return new Point(latlng.lng, latlng.lat);
    },

    unproject: function(point) {
        return new LatLng(point.y, point.x);
    },

    bounds: new Bounds([-180, -90], [180, 90])
};