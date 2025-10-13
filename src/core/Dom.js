let Browser;
import('./Browser.js').then(module => {
    Browser = module;
});
import {
    stamp,
    splitWords,
    trim,
    indexOf
} from './Util.js';
import {
    Point,
    toPoint
} from '../geo/Point.js';

export const TRANSFORM = testProp(
    ['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform']);
export const TRANSITION = testProp(
    ['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);
export const TRANSITION_END =
    TRANSITION === 'webkitTransition' || TRANSITION === 'OTransition' ? TRANSITION + 'End' : 'transitionend';

export function get(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
}

export function getStyle(el, style) {
    var value = el.style[style] || (el.currentStyle && el.currentStyle[style]);

    if ((!value || value === 'auto') && document.defaultView) {
        var css = document.defaultView.getComputedStyle(el, null);
        value = css ? css[style] : null;
    }
    return value === 'auto' ? null : value;
}

export function create(tagName, className, container) {
    var el = document.createElement(tagName);
    el.className = className || '';

    if (container) {
        container.appendChild(el);
    }
    return el;
}

export function remove(el) {
    var parent = el.parentNode;
    if (parent) {
        parent.removeChild(el);
    }
}

export function empty(el) {
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
}

export function toFront(el) {
    var parent = el.parentNode;
    if (parent && parent.lastChild !== el) {
        parent.appendChild(el);
    }
}

export function toBack(el) {
    var parent = el.parentNode;
    if (parent && parent.firstChild !== el) {
        parent.insertBefore(el, parent.firstChild);
    }
}

export function hasClass(el, name) {
    if (el.classList !== undefined) {
        return el.classList.contains(name);
    }
    var className = getClass(el);
    return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
}

export function addClass(el, name) {
    if (el.classList !== undefined) {
        var classes = splitWords(name);
        for (var i = 0, len = classes.length; i < len; i++) {
            el.classList.add(classes[i]);
        }
    } else if (!hasClass(el, name)) {
        var className = getClass(el);
        setClass(el, (className ? className + ' ' : '') + name);
    }
}

export function removeClass(el, name) {
    if (el.classList !== undefined) {
        el.classList.remove(name);
    } else {
        setClass(el, trim((' ' + getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
    }
}

export function setClass(el, name) {
    if (el.className.baseVal === undefined) {
        el.className = name;
    } else {
        el.className.baseVal = name;
    }
}

export function getClass(el) {
    if (el.correspondingElement) {
        el = el.correspondingElement;
    }
    return el.className.baseVal === undefined ? el.className : el.className.baseVal;
}

export function setOpacity(el, value) {
    if ('opacity' in el.style) {
        el.style.opacity = value;
    } else if ('filter' in el.style) {
        _setOpacityIE(el, value);
    }
}

function _setOpacityIE(el, value) {
    var filter = false,
        filterName = 'DXImageTransform.Microsoft.Alpha';
    try {
        filter = el.filters.item(filterName);
    } catch (e) {
        if (value === 1) {
            return;
        }
    }
    value = Math.round(value * 100);
    if (filter) {
        filter.Enabled = (value !== 100);
        filter.Opacity = value;
    } else {
        el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
    }
}

export function testProp(props) {
    var style = document.documentElement.style;
    for (var i = 0; i < props.length; i++) {
        if (props[i] in style) {
            return props[i];
        }
    }
    return false;
}

export function setTransform(el, offset, scale) {
    var pos = offset || new Point(0, 0);
    el.style[TRANSFORM] =
        (Browser.ie3d ?
            'translate(' + pos.x + 'px,' + pos.y + 'px)' :
            'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
        (scale ? ' scale(' + scale + ')' : '');
}

export function setPosition(el, point) {
    el._atlas_pos = point;
    if (Browser.any3d) {
        setTransform(el, point);
    } else {
        el.style.left = point.x + 'px';
        el.style.top = point.y + 'px';
    }
}

export function getPosition(el) {
    return el._atlas_pos || new Point(0, 0);
}

export var disableTextSelection;
export var enableTextSelection;
var _userSelect;
if ('onselectstart' in document) {
    disableTextSelection = function() {
        on(window, 'selectstart', preventDefault);
    };
    enableTextSelection = function() {
        off(window, 'selectstart', preventDefault);
    };
} else {
    var userSelectProperty = testProp(
        ['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);
    disableTextSelection = function() {
        if (userSelectProperty) {
            var style = document.documentElement.style;
            _userSelect = style[userSelectProperty];
            style[userSelectProperty] = 'none';
        }
    };
    enableTextSelection = function() {
        if (userSelectProperty) {
            document.documentElement.style[userSelectProperty] = _userSelect;
            _userSelect = undefined;
        }
    };
}

export function disableImageDrag() {
    on(window, 'dragstart', preventDefault);
}

export function enableImageDrag() {
    off(window, 'dragstart', preventDefault);
}

var _outlineElement, _outlineStyle;

export function preventOutline(element) {
    while (element.tabIndex === -1) {
        element = element.parentNode;
    }
    if (!element.style) {
        return;
    }
    restoreOutline();
    _outlineElement = element;
    _outlineStyle = element.style.outlineStyle;
    element.style.outlineStyle = 'none';
    on(window, 'keydown', restoreOutline);
}

export function restoreOutline() {
    if (!_outlineElement) {
        return;
    }
    _outlineElement.style.outlineStyle = _outlineStyle;
    _outlineElement = undefined;
    _outlineStyle = undefined;
    off(window, 'keydown', restoreOutline);
}

export function getSizedParentNode(element) {
    do {
        element = element.parentNode;
    } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
    return element;
}

export function getScale(element) {
    var rect = element.getBoundingClientRect();
    return {
        x: rect.width / element.offsetWidth || 1,
        y: rect.height / element.offsetHeight || 1,
        boundingClientRect: rect
    };
}

// @function falseFn(): Function
// Returns `false`. Used as a placeholder function.
export function falseFn() {
	return false;
}

export function on(obj, types, fn, context) {
    if (types && typeof types === 'object') {
        for (var type in types) {
            addOne(obj, type, types[type], fn);
        }
    } else {
        types = splitWords(types);
        for (var i = 0, len = types.length; i < len; i++) {
            addOne(obj, types[i], fn, context);
        }
    }
    return this;
}

var eventsKey = '_atlas_events';

export function off(obj, types, fn, context) {
    if (arguments.length === 1) {
        batchRemove(obj);
        delete obj[eventsKey];
    } else if (types && typeof types === 'object') {
        for (var type in types) {
            removeOne(obj, type, types[type], fn);
        }
    } else {
        types = splitWords(types);
        if (arguments.length === 2) {
            batchRemove(obj, function(type) {
                return indexOf(types, type) !== -1;
            });
        } else {
            for (var i = 0, len = types.length; i < len; i++) {
                removeOne(obj, types[i], fn, context);
            }
        }
    }
    return this;
}

function batchRemove(obj, filterFn) {
    for (var id in obj[eventsKey]) {
        var type = id.split(/\d/)[0];
        if (!filterFn || filterFn(type)) {
            removeOne(obj, type, null, null, id);
        }
    }
}

var mouseSubst = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout',
    wheel: !('onwheel' in window) && 'mousewheel'
};

function addOne(obj, type, fn, context) {
    var id = type + stamp(fn) + (context ? '_' + stamp(context) : '');
    if (obj[eventsKey] && obj[eventsKey][id]) {
        return this;
    }
    var handler = function(e) {
        return fn.call(context || obj, e || window.event);
    };
    var originalHandler = handler;
    if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
        handler = addPointerListener(obj, type, handler);
    } else if (Browser.touch && (type === 'dblclick')) {
        handler = addDoubleTapListener(obj, handler);
    } else if ('addEventListener' in obj) {
        if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
            obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? {
                passive: false
            } : false);
        } else if (type === 'mouseenter' || type === 'mouseleave') {
            handler = function(e) {
                e = e || window.event;
                if (isExternalTarget(obj, e)) {
                    originalHandler(e);
                }
            };
            obj.addEventListener(mouseSubst[type], handler, false);
        } else {
            obj.addEventListener(type, originalHandler, false);
        }
    } else {
        obj.attachEvent('on' + type, handler);
    }
    obj[eventsKey] = obj[eventsKey] || {};
    obj[eventsKey][id] = handler;
}

function removeOne(obj, type, fn, context, id) {
    id = id || type + stamp(fn) + (context ? '_' + stamp(context) : '');
    var handler = obj[eventsKey] && obj[eventsKey][id];
    if (!handler) {
        return this;
    }
    if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
        removePointerListener(obj, type, handler);
    } else if (Browser.touch && (type === 'dblclick')) {
        removeDoubleTapListener(obj, handler);
    } else if ('removeEventListener' in obj) {
        obj.removeEventListener(mouseSubst[type] || type, handler, false);
    } else {
        obj.detachEvent('on' + type, handler);
    }
    obj[eventsKey][id] = null;
}

export function stopPropagation(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    } else if (e.originalEvent) {
        e.originalEvent._stopped = true;
    } else {
        e.cancelBubble = true;
    }
    return this;
}

export function disableScrollPropagation(el) {
    addOne(el, 'wheel', stopPropagation);
    return this;
}

export function disableClickPropagation(el) {
    on(el, 'mousedown touchstart dblclick contextmenu', stopPropagation);
    el['_atlas_disable_click'] = true;
    return this;
}

export function preventDefault(e) {
    if (e.preventDefault) {
        e.preventDefault();
    } else {
        e.returnValue = false;
    }
    return this;
}

export function stop(e) {
    preventDefault(e);
    stopPropagation(e);
    return this;
}

export function getPropagationPath(ev) {
    if (ev.composedPath) {
        return ev.composedPath();
    }
    var path = [];
    var el = ev.target;
    while (el) {
        path.push(el);
        el = el.parentNode;
    }
    return path;
}

export function getMousePosition(e, container) {
    if (!container) {
        return new Point(e.clientX, e.clientY);
    }
    var scale = getScale(container),
        offset = scale.boundingClientRect;
    return new Point(
        (e.clientX - offset.left) / scale.x - container.clientLeft,
        (e.clientY - offset.top) / scale.y - container.clientTop
    );
}

var wheelPxFactor =
    (Browser.linux && Browser.chrome) ? window.devicePixelRatio :
    Browser.mac ? window.devicePixelRatio * 3 :
    window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;

export function getWheelDelta(e) {
    return (Browser.edge) ? e.wheelDeltaY / 2 :
        (e.deltaY && e.deltaMode === 0) ? -e.deltaY / wheelPxFactor :
        (e.deltaY && e.deltaMode === 1) ? -e.deltaY * 20 :
        (e.deltaY && e.deltaMode === 2) ? -e.deltaY * 60 :
        (e.deltaX || e.deltaZ) ? 0 :
        e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 :
        (e.detail && Math.abs(e.detail) < 32765) ? -e.detail * 20 :
        e.detail ? e.detail / -32765 * 60 :
        0;
}

export function isExternalTarget(el, e) {
    var related = e.relatedTarget;
    if (!related) {
        return true;
    }
    try {
        while (related && (related !== el)) {
            related = related.parentNode;
        }
    } catch (err) {
        return false;
    }
    return (related !== el);
}

var POINTER_DOWN = Browser.msPointer ? 'MSPointerDown' : 'pointerdown';
var POINTER_MOVE = Browser.msPointer ? 'MSPointerMove' : 'pointermove';
var POINTER_UP = Browser.msPointer ? 'MSPointerUp' : 'pointerup';
var POINTER_CANCEL = Browser.msPointer ? 'MSPointerCancel' : 'pointercancel';
var pEvent = {
    touchstart: POINTER_DOWN,
    touchmove: POINTER_MOVE,
    touchend: POINTER_UP,
    touchcancel: POINTER_CANCEL
};
var handle = {
    touchstart: _onPointerStart,
    touchmove: _handlePointer,
    touchend: _handlePointer,
    touchcancel: _handlePointer
};
var _pointers = {};
var _pointerDocListener = false;

function addPointerListener(obj, type, handler) {
    if (type === 'touchstart') {
        _addPointerDocListener();
    }
    if (!handle[type]) {
        console.warn('wrong event specified:', type);
        return falseFn;
    }
    handler = handle[type].bind(this, handler);
    obj.addEventListener(pEvent[type], handler, false);
    return handler;
}

function removePointerListener(obj, type, handler) {
    if (!pEvent[type]) {
        console.warn('wrong event specified:', type);
        return;
    }
    obj.removeEventListener(pEvent[type], handler, false);
}

function _globalPointerDown(e) {
    _pointers[e.pointerId] = e;
}

function _globalPointerMove(e) {
    if (_pointers[e.pointerId]) {
        _pointers[e.pointerId] = e;
    }
}

function _globalPointerUp(e) {
    delete _pointers[e.pointerId];
}

function _addPointerDocListener() {
    if (!_pointerDocListener) {
        document.addEventListener(POINTER_DOWN, _globalPointerDown, true);
        document.addEventListener(POINTER_MOVE, _globalPointerMove, true);
        document.addEventListener(POINTER_UP, _globalPointerUp, true);
        document.addEventListener(POINTER_CANCEL, _globalPointerUp, true);
        _pointerDocListener = true;
    }
}

function _handlePointer(handler, e) {
    if (e.pointerType === (e.MSPOINTER_TYPE_MOUSE || 'mouse')) {
        return;
    }
    e.touches = [];
    for (var i in _pointers) {
        e.touches.push(_pointers[i]);
    }
    e.changedTouches = [e];
    handler(e);
}

function _onPointerStart(handler, e) {
    if (e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH) {
        preventDefault(e);
    }
    _handlePointer(handler, e);
}

function makeDblclick(event) {
    var newEvent = {},
        prop, i;
    for (i in event) {
        prop = event[i];
        newEvent[i] = prop && prop.bind ? prop.bind(event) : prop;
    }
    event = newEvent;
    newEvent.type = 'dblclick';
    newEvent.detail = 2;
    newEvent.isTrusted = false;
    newEvent._simulated = true;
    return newEvent;
}
var delay = 200;

function addDoubleTapListener(obj, handler) {
    obj.addEventListener('dblclick', handler);
    var last = 0,
        detail;

    function simDblclick(e) {
        if (e.detail !== 1) {
            detail = e.detail;
            return;
        }
        if (e.pointerType === 'mouse' ||
            (e.sourceCapabilities && !e.sourceCapabilities.firesTouchEvents)) {
            return;
        }
        var path = getPropagationPath(e);
        if (path.some(function(el) {
                return el instanceof HTMLLabelElement && el.attributes.for;
            }) &&
            !path.some(function(el) {
                return (
                    el instanceof HTMLInputElement ||
                    el instanceof HTMLSelectElement
                );
            })
        ) {
            return;
        }
        var now = Date.now();
        if (now - last <= delay) {
            detail++;
            if (detail === 2) {
                handler(makeDblclick(e));
            }
        } else {
            detail = 1;
        }
        last = now;
    }
    obj.addEventListener('click', simDblclick);
    return {
        dblclick: handler,
        simDblclick: simDblclick
    };
}

function removeDoubleTapListener(obj, handlers) {
    obj.removeEventListener('dblclick', handlers.dblclick);
    obj.removeEventListener('click', handlers.simDblclick);
}