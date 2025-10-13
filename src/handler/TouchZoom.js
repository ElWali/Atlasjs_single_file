import {
    Handler
} from './Handler.js';
import {
    on,
    off,
    addClass,
    removeClass,
    preventDefault
} from '../core/Dom.js';
import {
    bind,
    requestAnimFrame,
    cancelAnimFrame
} from '../core/Util.js';
import {
    Map
} from '../map/Map.js';
import * as Browser from '../core/Browser.js';

export const TouchZoom = Handler.extend({
    addHooks: function() {
        addClass(this._map._container, 'atlas-touch-zoom');
        on(this._map._container, 'touchstart', this._onTouchStart, this);
    },

    removeHooks: function() {
        removeClass(this._map._container, 'atlas-touch-zoom');
        off(this._map._container, 'touchstart', this._onTouchStart, this);
    },

    _onTouchStart: function(e) {
        var map = this._map;
        if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) {
            return;
        }

        var p1 = map.mouseEventToContainerPoint(e.touches[0]),
            p2 = map.mouseEventToContainerPoint(e.touches[1]);

        this._centerPoint = map.getSize()._divideBy(2);
        this._startLatLng = map.containerPointToLatLng(this._centerPoint);
        if (map.options.touchZoom !== 'center') {
            this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2)._divideBy(2));
        }

        this._startDist = p1.distanceTo(p2);
        this._startZoom = map.getZoom();

        this._moved = false;
        this._zooming = true;

        map._stop();

        on(document, 'touchmove', this._onTouchMove, this);
        on(document, 'touchend touchcancel', this._onTouchEnd, this);

        preventDefault(e);
    },

    _onTouchMove: function(e) {
        if (!e.touches || e.touches.length !== 2 || !this._zooming) {
            return;
        }

        var map = this._map,
            p1 = map.mouseEventToContainerPoint(e.touches[0]),
            p2 = map.mouseEventToContainerPoint(e.touches[1]),
            scale = p1.distanceTo(p2) / this._startDist;

        this._zoom = map.getScaleZoom(scale, this._startZoom);

        if (!map.options.bounceAtZoomLimits && (
                (this._zoom < map.getMinZoom() && scale < 1) ||
                (this._zoom > map.getMaxZoom() && scale > 1))) {
            this._zoom = map._limitZoom(this._zoom);
        }

        if (map.options.touchZoom === 'center') {
            this._center = this._startLatLng;
            if (scale === 1) {
                return;
            }
        } else {
            var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
            if (scale === 1 && delta.x === 0 && delta.y === 0) {
                return;
            }
            this._center = map.unproject(map.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
        }

        if (!this._moved) {
            map._moveStart(true, false);
            this._moved = true;
        }

        cancelAnimFrame(this._animRequest);

        var moveFn = bind(map._move, map, this._center, this._zoom, {
            pinch: true,
            round: false
        }, undefined);
        this._animRequest = requestAnimFrame(moveFn, this, true);

        preventDefault(e);
    },

    _onTouchEnd: function() {
        if (!this._moved || !this._zooming) {
            this._zooming = false;
            return;
        }

        this._zooming = false;
        cancelAnimFrame(this._animRequest);
        off(document, 'touchmove', this._onTouchMove, this);
        off(document, 'touchend touchcancel', this._onTouchEnd, this);

        if (this._map.options.zoomAnimation) {
            this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
        } else {
            this._map._resetView(this._center, this._map._limitZoom(this._zoom));
        }
    }
});

Map.addInitHook('addHandler', 'touchZoom', TouchZoom);
Map.mergeOptions({
    touchZoom: Browser.touch,
    bounceAtZoomLimits: true
});