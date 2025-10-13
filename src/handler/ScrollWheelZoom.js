import {
    Handler
} from './Handler.js';
import {
    on,
    off,
    getWheelDelta,
    stop
} from '../core/Dom.js';
import {
    bind
} from '../core/Util.js';
import {
    Map
} from '../map/Map.js';

export const ScrollWheelZoom = Handler.extend({
    addHooks: function() {
        on(this._map._container, 'wheel', this._onWheelScroll, this);
        this._delta = 0;
    },

    removeHooks: function() {
        off(this._map._container, 'wheel', this._onWheelScroll, this);
    },

    _onWheelScroll: function(e) {
        var delta = getWheelDelta(e);
        var debounce = this._map.options.wheelDebounceTime;

        this._delta += delta;
        this._lastMousePos = this._map.mouseEventToContainerPoint(e);

        if (!this._startTime) {
            this._startTime = +new Date();
        }

        var left = Math.max(debounce - (+new Date() - this._startTime), 0);

        clearTimeout(this._timer);
        this._timer = setTimeout(bind(this._performZoom, this), left);

        stop(e);
    },

    _performZoom: function() {
        var map = this._map,
            zoom = map.getZoom(),
            snap = this._map.options.zoomSnap || 0;
        map._stop();

        var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4),
            d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2,
            d4 = snap ? Math.ceil(d3 / snap) * snap : d3,
            delta = map._limitZoom(zoom + (this._delta > 0 ? d4 : -d4)) - zoom;

        this._delta = 0;
        this._startTime = null;

        if (!delta) {
            return;
        }

        if (map.options.scrollWheelZoom === 'center') {
            map.setZoom(zoom + delta);
        } else {
            map.setZoomAround(this._lastMousePos, zoom + delta);
        }
    }
});

Map.addInitHook('addHandler', 'scrollWheelZoom', ScrollWheelZoom);