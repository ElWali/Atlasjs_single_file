import {
    Handler
} from './Handler.js';
import {
    on,
    off,
    preventDefault
} from '../core/Dom.js';
import {
    bind
} from '../core/Util.js';
import {
    Point
} from '../geo/Point.js';
import {
    Map
} from '../map/Map.js';
import * as Browser from '../core/Browser.js';

const tapHoldDelay = 600;

export const TapHold = Handler.extend({
    addHooks: function() {
        on(this._map._container, 'touchstart', this._onDown, this);
    },

    removeHooks: function() {
        off(this._map._container, 'touchstart', this._onDown, this);
    },

    _onDown: function(e) {
        clearTimeout(this._holdTimeout);
        if (e.touches.length !== 1) {
            return;
        }

        var first = e.touches[0];
        this._startPos = this._newPos = new Point(first.clientX, first.clientY);

        this._holdTimeout = setTimeout(bind(function() {
            this._cancel();
            if (!this._isTapValid()) {
                return;
            }

            on(document, 'touchend', preventDefault);
            on(document, 'touchend touchcancel', this._cancelClickPrevent);
            this._simulateEvent('contextmenu', first);
        }, this), tapHoldDelay);

        on(document, 'touchend touchcancel contextmenu', this._cancel, this);
        on(document, 'touchmove', this._onMove, this);
    },

    _cancelClickPrevent: function cancelClickPrevent() {
        off(document, 'touchend', preventDefault);
        off(document, 'touchend touchcancel', cancelClickPrevent);
    },

    _cancel: function() {
        clearTimeout(this._holdTimeout);
        off(document, 'touchend touchcancel contextmenu', this._cancel, this);
        off(document, 'touchmove', this._onMove, this);
    },

    _onMove: function(e) {
        var first = e.touches[0];
        this._newPos = new Point(first.clientX, first.clientY);
    },

    _isTapValid: function() {
        return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
    },

    _simulateEvent: function(type, e) {
        var simulatedEvent = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
        });

        simulatedEvent._simulated = true;

        e.target.dispatchEvent(simulatedEvent);
    }
});

Map.mergeOptions({
    tapHold: Browser.touchNative && Browser.safari && Browser.mobile,
    tapTolerance: 15
});

Map.addInitHook('addHandler', 'tapHold', TapHold);