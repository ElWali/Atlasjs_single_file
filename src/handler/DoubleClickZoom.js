import {
    Handler
} from './Handler.js';
import {
    Map
} from '../map/Map.js';

export const DoubleClickZoom = Handler.extend({
    addHooks: function() {
        this._map.on('dblclick', this._onDoubleClick, this);
    },

    removeHooks: function() {
        this._map.off('dblclick', this._onDoubleClick, this);
    },

    _onDoubleClick: function(e) {
        var map = this._map,
            oldZoom = map.getZoom(),
            delta = map.options.zoomDelta,
            zoom = e.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;

        if (map.options.doubleClickZoom === 'center') {
            map.setZoom(zoom);
        } else {
            map.setZoomAround(e.containerPoint, zoom);
        }
    }
});

Map.addInitHook('addHandler', 'doubleClickZoom', DoubleClickZoom);