import {
    Evented
} from '../core/Events.js';
import {
    setOptions
} from '../core/Util.js';
import {
    on,
    off,
    addClass,
    removeClass,
    setPosition,
    getPosition,
    getSizedParentNode,
    getScale,
    disableImageDrag,
    enableImageDrag,
    disableTextSelection,
    enableTextSelection,
    preventOutline,
    preventDefault
} from '../core/Dom.js';
import * as Browser from '../core/Browser.js';
import {
    Point
} from '../geo/Point.js';

const START = Browser.touch ? 'touchstart mousedown' : 'mousedown';

export const Draggable = Evented.extend({
    options: {
        clickTolerance: 3
    },

    initialize: function(element, dragStartTarget, preventOutline, options) {
        setOptions(this, options);

        this._element = element;
        this._dragStartTarget = dragStartTarget || element;
        this._preventOutline = preventOutline;
    },

    enable: function() {
        if (this._enabled) {
            return;
        }

        on(this._dragStartTarget, START, this._onDown, this);

        this._enabled = true;
    },

    disable: function() {
        if (!this._enabled) {
            return;
        }

        if (Draggable._dragging === this) {
            this.finishDrag(true);
        }

        off(this._dragStartTarget, START, this._onDown, this);

        this._enabled = false;
        this._moved = false;
    },

    _onDown: function(e) {
        if (!this._enabled) {
            return;
        }

        this._moved = false;

        if (hasClass(this._element, 'atlas-zoom-anim')) {
            return;
        }

        if (e.touches && e.touches.length !== 1) {
            if (Draggable._dragging === this) {
                this.finishDrag();
            }
            return;
        }

        if (Draggable._dragging || e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches)) {
            return;
        }
        Draggable._dragging = this;

        if (this._preventOutline) {
            preventOutline(this._element);
        }

        disableImageDrag();
        disableTextSelection();

        if (this._moving) {
            return;
        }

        this.fire('down');

        var first = e.touches ? e.touches[0] : e,
            sizedParent = getSizedParentNode(this._element);

        this._startPoint = new Point(first.clientX, first.clientY);
        this._startPos = getPosition(this._element);

        this._parentScale = getScale(sizedParent);

        var mouseevent = e.type === 'mousedown';
        on(document, mouseevent ? 'mousemove' : 'touchmove', this._onMove, this);
        on(document, mouseevent ? 'mouseup' : 'touchend touchcancel', this._onUp, this);
    },

    _onMove: function(e) {
        if (!this._enabled) {
            return;
        }

        if (e.touches && e.touches.length > 1) {
            this._moved = true;
            return;
        }

        var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
            offset = new Point(first.clientX, first.clientY)._subtract(this._startPoint);

        if (!offset.x && !offset.y) {
            return;
        }
        if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
            return;
        }

        offset.x /= this._parentScale.x;
        offset.y /= this._parentScale.y;

        preventDefault(e);

        if (!this._moved) {
            this.fire('dragstart');
            this._moved = true;

            addClass(document.body, 'atlas-dragging');

            this._lastTarget = e.target || e.srcElement;
            if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
                this._lastTarget = this._lastTarget.correspondingUseElement;
            }
            addClass(this._lastTarget, 'atlas-drag-target');
        }

        this._newPos = this._startPos.add(offset);
        this._moving = true;

        this._lastEvent = e;
        this._updatePosition();
    },

    _updatePosition: function() {
        var e = {
            originalEvent: this._lastEvent
        };
        this.fire('predrag', e);
        setPosition(this._element, this._newPos);
        this.fire('drag', e);
    },

    _onUp: function() {
        if (!this._enabled) {
            return;
        }
        this.finishDrag();
    },

    finishDrag: function(noInertia) {
        removeClass(document.body, 'atlas-dragging');

        if (this._lastTarget) {
            removeClass(this._lastTarget, 'atlas-drag-target');
            this._lastTarget = null;
        }

        off(document, 'mousemove touchmove', this._onMove, this);
        off(document, 'mouseup touchend touchcancel', this._onUp, this);

        enableImageDrag();
        enableTextSelection();

        var fireDragend = this._moved && this._moving;

        this._moving = false;
        Draggable._dragging = false;

        if (fireDragend) {
            this.fire('dragend', {
                noInertia: noInertia,
                distance: this._newPos.distanceTo(this._startPos)
            });
        }
    }
});