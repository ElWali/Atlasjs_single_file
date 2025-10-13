import {
    Handler
} from './Handler.js';
import {
    on,
    off,
    create,
    remove,
    addClass,
    removeClass,
    setPosition,
    disableImageDrag,
    enableImageDrag,
    disableTextSelection,
    enableTextSelection,
    stop
} from '../core/Dom.js';
import {
    LatLngBounds
} from '../geo/LatLngBounds.js';
import {
    Bounds
} from '../geo/Bounds.js';
import {
    Map
} from '../map/Map.js';
import {
    bind
} from '../core/Util.js';

export const BoxZoom = Handler.extend({
    initialize: function(map) {
        this._map = map;
        this._container = map._container;
        this._pane = map._panes.overlayPane;
        this._resetStateTimeout = 0;
        map.on('unload', this._destroy, this);
    },

    addHooks: function() {
        on(this._container, 'mousedown', this._onMouseDown, this);
    },

    removeHooks: function() {
        off(this._container, 'mousedown', this._onMouseDown, this);
    },

    moved: function() {
        return this._moved;
    },

    _destroy: function() {
        remove(this._pane);
        delete this._pane;
    },

    _resetState: function() {
        this._resetStateTimeout = 0;
        this._moved = false;
    },

    _clearDeferredResetState: function() {
        if (this._resetStateTimeout !== 0) {
            clearTimeout(this._resetStateTimeout);
            this._resetStateTimeout = 0;
        }
    },

    _onMouseDown: function(e) {
        if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) {
            return false;
        }

        this._clearDeferredResetState();
        this._resetState();

        disableTextSelection();
        disableImageDrag();

        this._startPoint = this._map.mouseEventToContainerPoint(e);

        on(document, {
            contextmenu: stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
        }, this);
    },

    _onMouseMove: function(e) {
        if (!this._moved) {
            this._moved = true;

            this._box = create('div', 'atlas-zoom-box', this._container);
            addClass(this._container, 'atlas-crosshair');

            this._map.fire('boxzoomstart');
        }

        this._point = this._map.mouseEventToContainerPoint(e);

        var bounds = new Bounds(this._point, this._startPoint),
            size = bounds.getSize();

        setPosition(this._box, bounds.min);

        this._box.style.width = size.x + 'px';
        this._box.style.height = size.y + 'px';
    },

    _finish: function() {
        if (this._moved) {
            remove(this._box);
            removeClass(this._container, 'atlas-crosshair');
        }

        enableTextSelection();
        enableImageDrag();

        off(document, {
            contextmenu: stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
        }, this);
    },

    _onMouseUp: function(e) {
        if ((e.which !== 1) && (e.button !== 1)) {
            return;
        }

        this._finish();

        if (!this._moved) {
            return;
        }
        this._clearDeferredResetState();
        this._resetStateTimeout = setTimeout(bind(this._resetState, this), 0);

        var bounds = new LatLngBounds(
            this._map.containerPointToLatLng(this._startPoint),
            this._map.containerPointToLatLng(this._point));

        this._map
            .fitBounds(bounds)
            .fire('boxzoomend', {
                boxZoomBounds: bounds
            });
    },

    _onKeyDown: function(e) {
        if (e.keyCode === 27) {
            this._finish();
            this._clearDeferredResetState();
            this._resetState();
        }
    }
});

Map.addInitHook('addHandler', 'boxZoom', BoxZoom);