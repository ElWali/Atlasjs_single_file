/*
 * Atlas.js 1.0.0
 * Mon, 13 Oct 2025 22:12:21 GMT
 */
var atlas = (function (exports) {
	'use strict';

	// @function extend(dest: Object, src?: Object): Object
	// Merges the properties of the `src` object (or objects) into the `dest` object and returns the latter. Has an `L.extend` shortcut.
	function extend(dest) {
		var i, j, len, src;

		for (j = 1, len = arguments.length; j < len; j++) {
			src = arguments[j];
			for (i in src) {
				dest[i] = src[i];
			}
		}
		return dest;
	}

	// @function create(proto: Object, properties?: Object): Object
	// Creates an object from a given prototype and properties. The new object inherits from the prototype and not from `Object`.
	const create$1 = Object.create || (function () {
		function F() {}
		return function (proto) {
			F.prototype = proto;
			return new F();
		};
	})();

	// @function bind(fn: Function, obj: Object): Function
	// Returns a new function bound to the arguments passed, like [Function.prototype.bind](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function/bind).
	// Has a `L.bind()` shortcut.
	function bind$1(fn, obj) {
		var slice = Array.prototype.slice;

		if (fn.bind) {
			return fn.bind.apply(fn, slice.call(arguments, 1));
		}

		var args = slice.call(arguments, 2);

		return function () {
			return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
		};
	}

	// @property lastId: Number
	// Last unique ID used by [`stamp()`](#util-stamp)
	let lastId = 0;

	// @function stamp(obj: Object): Number
	// Returns the unique ID of an object, assigning it one if it doesn't have it.
	function stamp(obj) {
		if (!('_atlas_id' in obj)) {
			obj['_atlas_id'] = ++lastId;
		}
		return obj._atlas_id;
	}

	// @function throttle(fn: Function, time: Number, context: Object): Function
	// Returns a function which executes `fn` every `time` milliseconds.
	function throttle(fn, time, context) {
		var lock, args, wrapperFn, later;

		later = function () {
			// reset lock and call if queued
			lock = false;
			if (args) {
				wrapperFn.apply(context, args);
				args = false;
			}
		};

		wrapperFn = function () {
			if (lock) {
				// called too soon, queue to call later
				args = arguments;

			} else {
				// call and lock until later
				fn.apply(context, arguments);
				setTimeout(later, time);
				lock = true;
			}
		};

		return wrapperFn;
	}

	// @function wrapNum(num: Number, range: Number[], includeMax?: Boolean): Number
	// Returns the number `num` modulo `range` in such a way so it lies within `range`. The returned value will be in the range `[min, max)` or `[min, max]` if `includeMax` is set to `true`.
	function wrapNum(x, range, includeMax) {
		var max = range[1],
		    min = range[0],
		    d = max - min;
		return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
	}


	// @function formatNum(num: Number, precision?: Number|false): Number
	// Returns the number `num` rounded to `precision` decimal places.
	// If `precision` is `false`, returns the number as is.
	function formatNum(num, precision) {
		if (precision === false) { return num; }
		var pow = Math.pow(10, precision === undefined ? 6 : precision);
		return Math.round(num * pow) / pow;
	}

	// @function trim(str: String): String
	// Trims and splits the string on whitespace and returns the array of parts.
	function trim(str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	}

	// @function splitWords(str: String): String[]
	// Trims and splits the string on whitespace and returns the array of parts.
	function splitWords(str) {
		return trim(str).split(/\s+/);
	}

	// @function setOptions(obj: Object, options: Object): Object
	// Merges the given properties to the `options` of the `obj` object, returning the resulting options. See `Class options`. Has an `L.setOptions` shortcut.
	function setOptions$1(obj, options) {
		if (!Object.prototype.hasOwnProperty.call(obj, 'options')) {
			obj.options = obj.options ? create$1(obj.options) : {};
		}
		for (var i in options) {
			obj.options[i] = options[i];
		}
		return obj.options;
	}

	// @function getParamString(obj: Object, existingUrl?: String, uppercase?: Boolean): String
	// Converts an object into a parameter URL string, e.g. `{a: "foo", b: "bar"}`
	// translates to `'?a=foo&b=bar'`. If `existingUrl` is set, the parameters will
	// be appended at the end. If `uppercase` is `true`, the parameter names will
	// be uppercased.
	function getParamString(obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	}

	// @function template(str: String, data: Object): String
	// Simple templating facility, accepts a template string of the form `'Hello {a}, {b}'`
	// and a data object like `{a: 'foo', b: 'bar'}`, returns evaluated string
	// `('Hello foo, bar')`. You can also specify functions instead of strings for
	// data values — they will be evaluated passing `data` as an argument.
	var templateRe = /\{ *([\w_ -]+) *\}/g;
	function template(str, data) {
		return str.replace(templateRe, function (str, key) {
			var value = data[key];

			if (value === undefined) {
				throw new Error('No value provided for variable ' + str);
			} else if (typeof value === 'function') {
				value = value(data);
			}
			return value;
		});
	}

	// @function isArray(obj): Boolean
	// Returns `true` if the given object is an array.
	const isArray$1 = Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	};

	// @function toPoint(a: Number, b: Number, round?: Boolean): Point
	// Creates a Point object from a given coordinate array or object.
	function toPoint$2(a, b, round) {
		if (a instanceof Point) {
			return a;
		}
		if (isArray$1(a)) {
			return new Point(a[0], a[1]);
		}
		if (a === undefined || a === null) {
			return a;
		}
		if (typeof a === 'object' && 'x' in a && 'y' in a) {
			return new Point(a.x, a.y);
		}
		return new Point(a, b, round);
	}

	// @function empty(el: HTMLElement): undefined
	// Clears all the child nodes from an element.
	function empty$1(el) {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	}

	// @function indexOf(array: Array, el: Object): Number
	// Returns the index at which the given element can be found in the array, or -1 if it is not present.
	function indexOf(array, el) {
		for (var i = 0; i < array.length; i++) {
			if (array[i] === el) { return i; }
		}
		return -1;
	}

	// @property emptyImageUrl: String
	// Data URI string containing a base64-encoded empty GIF image.
	// Used as a hack to free memory from unused images on WebKit-powered
	// mobile devices (by setting image `src` to this string).
	const emptyImageUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		return window['webkit' + name] || window['moz' + name] || window['ms' + name];
	}

	var lastTime = 0;

	// fallback for IE 9, see #2241
	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame || getPrefixed('RequestAnimationFrame') || timeoutDefer;
	var cancelFn = window.cancelAnimationFrame || getPrefixed('CancelAnimationFrame') ||
			getPrefixed('CancelRequestAnimationFrame') || function (id) { window.clearTimeout(id); };

	// @function requestAnimFrame(fn: Function, context?: Object, immediate?: Boolean): Number
	// Schedules `fn` to be executed when the browser repaints. `fn` is bound to
	// `context` if given. When `immediate` is set, `fn` is called immediately if
	// the browser doesn't have native support for
	// [`requestAnimationFrame`](https://developer.mozilla.org/docs/Web/API/window/requestAnimationFrame),
	// otherwise it's delayed. Returns a request ID that can be used to cancel the request.
	function requestAnimFrame(fn, context, immediate) {
		if (immediate && requestFn === timeoutDefer) {
			fn.call(context);
		} else {
			return requestFn.call(window, bind$1(fn, context));
		}
	}

	// @function cancelAnimFrame(id: Number): undefined
	// Cancels a previous `requestAnimFrame`. See also [window.cancelAnimationFrame](https://developer.mozilla.org/docs/Web/API/window/cancelAnimationFrame).
	function cancelAnimFrame$1(id) {
		if (id) {
			cancelFn.call(window, id);
		}
	}

	function Class() {}

	Class.extend = function(props) {
	    var NewClass = function() {
	        setOptions$1(this);
	        if (this.initialize) {
	            this.initialize.apply(this, arguments);
	        }
	        this.callInitHooks();
	    };

	    var parentProto = NewClass.__super__ = this.prototype;
	    var proto = create$1(parentProto);
	    proto.constructor = NewClass;
	    NewClass.prototype = proto;

	    for (var i in this) {
	        if (Object.prototype.hasOwnProperty.call(this, i) && i !== 'prototype' && i !== '__super__') {
	            NewClass[i] = this[i];
	        }
	    }

	    if (props.statics) {
	        extend(NewClass, props.statics);
	    }

	    if (props.includes) {
	        checkDeprecatedMixinEvents(props.includes);
	        extend.apply(null, [proto].concat(props.includes));
	    }

	    extend(proto, props);
	    delete proto.statics;
	    delete proto.includes;

	    if (proto.options) {
	        proto.options = parentProto.options ? create$1(parentProto.options) : {};
	        extend(proto.options, props.options);
	    }

	    proto._initHooks = [];
	    proto.callInitHooks = function() {
	        if (this._initHooksCalled) {
	            return;
	        }

	        if (parentProto.callInitHooks) {
	            parentProto.callInitHooks.call(this);
	        }

	        this._initHooksCalled = true;

	        for (var i = 0, len = proto._initHooks.length; i < len; i++) {
	            proto._initHooks[i].call(this);
	        }
	    };

	    return NewClass;
	};

	Class.include = function(props) {
	    var parentOptions = this.prototype.options;
	    extend(this.prototype, props);
	    if (props.options) {
	        this.prototype.options = parentOptions;
	        this.mergeOptions(props.options);
	    }
	    return this;
	};

	Class.mergeOptions = function(options) {
	    extend(this.prototype.options, options);
	    return this;
	};

	Class.addInitHook = function(fn) {
	    var args = Array.prototype.slice.call(arguments, 1);

	    var init = typeof fn === 'function' ? fn : function() {
	        this[fn].apply(this, args);
	    };

	    this.prototype._initHooks = this.prototype._initHooks || [];
	    this.prototype._initHooks.push(init);
	    return this;
	};

	function checkDeprecatedMixinEvents(includes) {
	    if (typeof atlas === 'undefined' || !atlas || !atlas.Mixin) {
	        return;
	    }

	    includes = isArray$1(includes) ? includes : [includes];

	    for (var i = 0; i < includes.length; i++) {
	        if (includes[i] === atlas.Mixin.Events) {
	            console.warn('Deprecated include of atlas.Mixin.Events: ' +
	                'this property will be removed in future releases, ' +
	                'please inherit from atlas.Evented instead.', new Error().stack);
	        }
	    }
	}

	function Point$1(x, y, round) {
	    this.x = (round ? Math.round(x) : x);
	    this.y = (round ? Math.round(y) : y);
	}

	const trunc = Math.trunc || function(v) {
	    return v > 0 ? Math.floor(v) : Math.ceil(v);
	};

	Point$1.prototype = {
	    clone: function() {
	        return new Point$1(this.x, this.y);
	    },

	    add: function(point) {
	        return this.clone()._add(toPoint$1(point));
	    },

	    _add: function(point) {
	        this.x += point.x;
	        this.y += point.y;
	        return this;
	    },

	    subtract: function(point) {
	        return this.clone()._subtract(toPoint$1(point));
	    },

	    _subtract: function(point) {
	        this.x -= point.x;
	        this.y -= point.y;
	        return this;
	    },

	    divideBy: function(num) {
	        return this.clone()._divideBy(num);
	    },

	    _divideBy: function(num) {
	        this.x /= num;
	        this.y /= num;
	        return this;
	    },

	    multiplyBy: function(num) {
	        return this.clone()._multiplyBy(num);
	    },

	    _multiplyBy: function(num) {
	        this.x *= num;
	        this.y *= num;
	        return this;
	    },

	    scaleBy: function(point) {
	        return new Point$1(this.x * point.x, this.y * point.y);
	    },

	    unscaleBy: function(point) {
	        return new Point$1(this.x / point.x, this.y / point.y);
	    },

	    round: function() {
	        return this.clone()._round();
	    },

	    _round: function() {
	        this.x = Math.round(this.x);
	        this.y = Math.round(this.y);
	        return this;
	    },

	    floor: function() {
	        return this.clone()._floor();
	    },

	    _floor: function() {
	        this.x = Math.floor(this.x);
	        this.y = Math.floor(this.y);
	        return this;
	    },

	    ceil: function() {
	        return this.clone()._ceil();
	    },

	    _ceil: function() {
	        this.x = Math.ceil(this.x);
	        this.y = Math.ceil(this.y);
	        return this;
	    },

	    trunc: function() {
	        return this.clone()._trunc();
	    },

	    _trunc: function() {
	        this.x = trunc(this.x);
	        this.y = trunc(this.y);
	        return this;
	    },

	    distanceTo: function(point) {
	        point = toPoint$1(point);

	        var x = point.x - this.x,
	            y = point.y - this.y;

	        return Math.sqrt(x * x + y * y);
	    },

	    equals: function(point) {
	        point = toPoint$1(point);

	        return point.x === this.x &&
	            point.y === this.y;
	    },

	    contains: function(point) {
	        point = toPoint$1(point);

	        return Math.abs(point.x) <= Math.abs(this.x) &&
	            Math.abs(point.y) <= Math.abs(this.y);
	    },

	    toString: function() {
	        return 'Point(' +
	            formatNum(this.x) + ', ' +
	            formatNum(this.y) + ')';
	    }
	};

	function toPoint$1(x, y, round) {
	    if (x instanceof Point$1) {
	        return x;
	    }
	    if (isArray$1(x)) {
	        return new Point$1(x[0], x[1]);
	    }
	    if (x === undefined || x === null) {
	        return x;
	    }
	    if (typeof x === 'object' && 'x' in x && 'y' in x) {
	        return new Point$1(x.x, x.y);
	    }
	    return new Point$1(x, y, round);
	}

	let Browser$2;
	Promise.resolve().then(function () { return Browser$1; }).then(module => {
	    Browser$2 = module;
	});

	const TRANSFORM = testProp(
	    ['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform']);
	const TRANSITION = testProp(
	    ['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);
	const TRANSITION_END =
	    TRANSITION === 'webkitTransition' || TRANSITION === 'OTransition' ? TRANSITION + 'End' : 'transitionend';

	function get(id) {
	    return typeof id === 'string' ? document.getElementById(id) : id;
	}

	function getStyle(el, style) {
	    var value = el.style[style] || (el.currentStyle && el.currentStyle[style]);

	    if ((!value || value === 'auto') && document.defaultView) {
	        var css = document.defaultView.getComputedStyle(el, null);
	        value = css ? css[style] : null;
	    }
	    return value === 'auto' ? null : value;
	}

	function create(tagName, className, container) {
	    var el = document.createElement(tagName);
	    el.className = className || '';

	    if (container) {
	        container.appendChild(el);
	    }
	    return el;
	}

	function remove(el) {
	    var parent = el.parentNode;
	    if (parent) {
	        parent.removeChild(el);
	    }
	}

	function empty(el) {
	    while (el.firstChild) {
	        el.removeChild(el.firstChild);
	    }
	}

	function toFront$1(el) {
	    var parent = el.parentNode;
	    if (parent && parent.lastChild !== el) {
	        parent.appendChild(el);
	    }
	}

	function toBack$1(el) {
	    var parent = el.parentNode;
	    if (parent && parent.firstChild !== el) {
	        parent.insertBefore(el, parent.firstChild);
	    }
	}

	function hasClass$1(el, name) {
	    if (el.classList !== undefined) {
	        return el.classList.contains(name);
	    }
	    var className = getClass(el);
	    return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
	}

	function addClass$1(el, name) {
	    if (el.classList !== undefined) {
	        var classes = splitWords(name);
	        for (var i = 0, len = classes.length; i < len; i++) {
	            el.classList.add(classes[i]);
	        }
	    } else if (!hasClass$1(el, name)) {
	        var className = getClass(el);
	        setClass(el, (className ? className + ' ' : '') + name);
	    }
	}

	function removeClass$1(el, name) {
	    if (el.classList !== undefined) {
	        el.classList.remove(name);
	    } else {
	        setClass(el, trim((' ' + getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
	    }
	}

	function setClass(el, name) {
	    if (el.className.baseVal === undefined) {
	        el.className = name;
	    } else {
	        el.className.baseVal = name;
	    }
	}

	function getClass(el) {
	    if (el.correspondingElement) {
	        el = el.correspondingElement;
	    }
	    return el.className.baseVal === undefined ? el.className : el.className.baseVal;
	}

	function setOpacity$1(el, value) {
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

	function testProp(props) {
	    var style = document.documentElement.style;
	    for (var i = 0; i < props.length; i++) {
	        if (props[i] in style) {
	            return props[i];
	        }
	    }
	    return false;
	}

	function setTransform(el, offset, scale) {
	    var pos = offset || new Point$1(0, 0);
	    el.style[TRANSFORM] =
	        (Browser$2.ie3d ?
	            'translate(' + pos.x + 'px,' + pos.y + 'px)' :
	            'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
	        (scale ? ' scale(' + scale + ')' : '');
	}

	function setPosition$1(el, point) {
	    el._atlas_pos = point;
	    if (Browser$2.any3d) {
	        setTransform(el, point);
	    } else {
	        el.style.left = point.x + 'px';
	        el.style.top = point.y + 'px';
	    }
	}

	function getPosition$1(el) {
	    return el._atlas_pos || new Point$1(0, 0);
	}

	exports.disableTextSelection = void 0;
	exports.enableTextSelection = void 0;
	var _userSelect;
	if ('onselectstart' in document) {
	    exports.disableTextSelection = function() {
	        on(window, 'selectstart', preventDefault);
	    };
	    exports.enableTextSelection = function() {
	        off(window, 'selectstart', preventDefault);
	    };
	} else {
	    var userSelectProperty = testProp(
	        ['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);
	    exports.disableTextSelection = function() {
	        if (userSelectProperty) {
	            var style = document.documentElement.style;
	            _userSelect = style[userSelectProperty];
	            style[userSelectProperty] = 'none';
	        }
	    };
	    exports.enableTextSelection = function() {
	        if (userSelectProperty) {
	            document.documentElement.style[userSelectProperty] = _userSelect;
	            _userSelect = undefined;
	        }
	    };
	}

	function disableImageDrag() {
	    on(window, 'dragstart', preventDefault);
	}

	function enableImageDrag() {
	    off(window, 'dragstart', preventDefault);
	}

	var _outlineElement, _outlineStyle;

	function preventOutline(element) {
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

	function restoreOutline() {
	    if (!_outlineElement) {
	        return;
	    }
	    _outlineElement.style.outlineStyle = _outlineStyle;
	    _outlineElement = undefined;
	    _outlineStyle = undefined;
	    off(window, 'keydown', restoreOutline);
	}

	function getSizedParentNode(element) {
	    do {
	        element = element.parentNode;
	    } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
	    return element;
	}

	function getScale(element) {
	    var rect = element.getBoundingClientRect();
	    return {
	        x: rect.width / element.offsetWidth || 1,
	        y: rect.height / element.offsetHeight || 1,
	        boundingClientRect: rect
	    };
	}

	// @function falseFn(): Function
	// Returns `false`. Used as a placeholder function.
	function falseFn() {
		return false;
	}

	function on(obj, types, fn, context) {
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

	function off(obj, types, fn, context) {
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
	    if (!Browser$2.touchNative && Browser$2.pointer && type.indexOf('touch') === 0) {
	        handler = addPointerListener(obj, type, handler);
	    } else if (Browser$2.touch && (type === 'dblclick')) {
	        handler = addDoubleTapListener(obj, handler);
	    } else if ('addEventListener' in obj) {
	        if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
	            obj.addEventListener(mouseSubst[type] || type, handler, Browser$2.passiveEvents ? {
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
	    if (!Browser$2.touchNative && Browser$2.pointer && type.indexOf('touch') === 0) {
	        removePointerListener(obj, type, handler);
	    } else if (Browser$2.touch && (type === 'dblclick')) {
	        removeDoubleTapListener(obj, handler);
	    } else if ('removeEventListener' in obj) {
	        obj.removeEventListener(mouseSubst[type] || type, handler, false);
	    } else {
	        obj.detachEvent('on' + type, handler);
	    }
	    obj[eventsKey][id] = null;
	}

	function stopPropagation$1(e) {
	    if (e.stopPropagation) {
	        e.stopPropagation();
	    } else if (e.originalEvent) {
	        e.originalEvent._stopped = true;
	    } else {
	        e.cancelBubble = true;
	    }
	    return this;
	}

	function disableScrollPropagation$1(el) {
	    addOne(el, 'wheel', stopPropagation$1);
	    return this;
	}

	function disableClickPropagation(el) {
	    on(el, 'mousedown touchstart dblclick contextmenu', stopPropagation$1);
	    el['_atlas_disable_click'] = true;
	    return this;
	}

	function preventDefault(e) {
	    if (e.preventDefault) {
	        e.preventDefault();
	    } else {
	        e.returnValue = false;
	    }
	    return this;
	}

	function stop$1(e) {
	    preventDefault(e);
	    stopPropagation$1(e);
	    return this;
	}

	function getPropagationPath(ev) {
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

	function getMousePosition(e, container) {
	    if (!container) {
	        return new Point$1(e.clientX, e.clientY);
	    }
	    var scale = getScale(container),
	        offset = scale.boundingClientRect;
	    return new Point$1(
	        (e.clientX - offset.left) / scale.x - container.clientLeft,
	        (e.clientY - offset.top) / scale.y - container.clientTop
	    );
	}

	var wheelPxFactor =
	    (Browser$2.linux && Browser$2.chrome) ? window.devicePixelRatio :
	    Browser$2.mac ? window.devicePixelRatio * 3 :
	    window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;

	function getWheelDelta(e) {
	    return (Browser$2.edge) ? e.wheelDeltaY / 2 :
	        (e.deltaY && e.deltaMode === 0) ? -e.deltaY / wheelPxFactor :
	        (e.deltaY && e.deltaMode === 1) ? -e.deltaY * 20 :
	        (e.deltaY && e.deltaMode === 2) ? -e.deltaY * 60 :
	        (e.deltaX || e.deltaZ) ? 0 :
	        e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 :
	        (e.detail && Math.abs(e.detail) < 32765) ? -e.detail * 20 :
	        e.detail ? e.detail / -32765 * 60 :
	        0;
	}

	function isExternalTarget(el, e) {
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

	var POINTER_DOWN = Browser$2.msPointer ? 'MSPointerDown' : 'pointerdown';
	var POINTER_MOVE = Browser$2.msPointer ? 'MSPointerMove' : 'pointermove';
	var POINTER_UP = Browser$2.msPointer ? 'MSPointerUp' : 'pointerup';
	var POINTER_CANCEL = Browser$2.msPointer ? 'MSPointerCancel' : 'pointercancel';
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

	const Events = {
	    on: function(types, fn, context) {
	        if (typeof types === 'object') {
	            for (var type in types) {
	                this._on(type, types[type], fn);
	            }
	        } else {
	            types = splitWords(types);
	            for (var i = 0, len = types.length; i < len; i++) {
	                this._on(types[i], fn, context);
	            }
	        }
	        return this;
	    },

	    off: function(types, fn, context) {
	        if (!arguments.length) {
	            delete this._events;
	        } else if (typeof types === 'object') {
	            for (var type in types) {
	                this._off(type, types[type], fn);
	            }
	        } else {
	            types = splitWords(types);
	            var removeAll = arguments.length === 1;
	            for (var i = 0, len = types.length; i < len; i++) {
	                if (removeAll) {
	                    this._off(types[i]);
	                } else {
	                    this._off(types[i], fn, context);
	                }
	            }
	        }
	        return this;
	    },

	    _on: function(type, fn, context, _once) {
	        if (typeof fn !== 'function') {
	            console.warn('wrong listener type: ' + typeof fn);
	            return;
	        }

	        if (this._listens(type, fn, context) !== false) {
	            return;
	        }

	        if (context === this) {
	            context = undefined;
	        }

	        var newListener = {
	            fn: fn,
	            ctx: context
	        };
	        if (_once) {
	            newListener.once = true;
	        }

	        this._events = this._events || {};
	        this._events[type] = this._events[type] || [];
	        this._events[type].push(newListener);
	    },

	    _off: function(type, fn, context) {
	        var listeners,
	            i,
	            len;

	        if (!this._events) {
	            return;
	        }

	        listeners = this._events[type];

	        if (!listeners) {
	            return;
	        }

	        if (arguments.length === 1) {
	            if (this._firingCount) {
	                for (i = 0, len = listeners.length; i < len; i++) {
	                    listeners[i].fn = falseFn;
	                }
	            }
	            delete this._events[type];
	            return;
	        }

	        if (typeof fn !== 'function') {
	            console.warn('wrong listener type: ' + typeof fn);
	            return;
	        }

	        var index = this._listens(type, fn, context);
	        if (index !== false) {
	            var listener = listeners[index];
	            if (this._firingCount) {
	                listener.fn = falseFn;
	                this._events[type] = listeners = listeners.slice();
	            }
	            listeners.splice(index, 1);
	        }
	    },

	    fire: function(type, data, propagate) {
	        if (!this.listens(type, propagate)) {
	            return this;
	        }

	        var event = extend({}, data, {
	            type: type,
	            target: this,
	            sourceTarget: data && data.sourceTarget || this
	        });

	        if (this._events) {
	            var listeners = this._events[type];
	            if (listeners) {
	                this._firingCount = (this._firingCount + 1) || 1;
	                for (var i = 0, len = listeners.length; i < len; i++) {
	                    var l = listeners[i];
	                    var fn = l.fn;
	                    if (l.once) {
	                        this.off(type, fn, l.ctx);
	                    }
	                    fn.call(l.ctx || this, event);
	                }
	                this._firingCount--;
	            }
	        }

	        if (propagate) {
	            this._propagateEvent(event);
	        }

	        return this;
	    },

	    listens: function(type, fn, context, propagate) {
	        if (typeof type !== 'string') {
	            console.warn('"string" type argument expected');
	        }
	        var _fn = fn;
	        if (typeof fn !== 'function') {
	            propagate = !!fn;
	            _fn = undefined;
	            context = undefined;
	        }
	        var listeners = this._events && this._events[type];
	        if (listeners && listeners.length) {
	            if (this._listens(type, _fn, context) !== false) {
	                return true;
	            }
	        }

	        if (propagate) {
	            for (var id in this._eventParents) {
	                if (this._eventParents[id].listens(type, fn, context, propagate)) {
	                    return true;
	                }
	            }
	        }
	        return false;
	    },

	    _listens: function(type, fn, context) {
	        if (!this._events) {
	            return false;
	        }

	        var listeners = this._events[type] || [];
	        if (!fn) {
	            return !!listeners.length;
	        }

	        if (context === this) {
	            context = undefined;
	        }

	        for (var i = 0, len = listeners.length; i < len; i++) {
	            if (listeners[i].fn === fn && listeners[i].ctx === context) {
	                return i;
	            }
	        }
	        return false;
	    },

	    once: function(types, fn, context) {
	        if (typeof types === 'object') {
	            for (var type in types) {
	                this._on(type, types[type], fn, true);
	            }
	        } else {
	            types = splitWords(types);
	            for (var i = 0, len = types.length; i < len; i++) {
	                this._on(types[i], fn, context, true);
	            }
	        }
	        return this;
	    },

	    addEventParent: function(obj) {
	        this._eventParents = this._eventParents || {};
	        this._eventParents[stamp(obj)] = obj;
	        return this;
	    },

	    removeEventParent: function(obj) {
	        if (this._eventParents) {
	            delete this._eventParents[stamp(obj)];
	        }
	        return this;
	    },

	    _propagateEvent: function(e) {
	        for (var id in this._eventParents) {
	            this._eventParents[id].fire(e.type, extend({
	                layer: e.target,
	                propagatedFrom: e.target
	            }, e), true);
	        }
	    }
	};

	Events.addEventListener = Events.on;
	Events.removeEventListener = Events.clearAllEventListeners = Events.off;
	Events.addOneTimeEventListener = Events.once;
	Events.fireEvent = Events.fire;
	Events.hasEventListeners = Events.listens;

	const Evented = Class.extend(Events);

	const ie = 'ActiveXObject' in window;
	const ielt9 = ie && !document.addEventListener;
	const edge = 'msLaunchUri' in navigator && !('documentMode' in document);
	const webkit = userAgentContains('webkit');
	const android = userAgentContains('android');
	const android23 = userAgentContains('android 2') || userAgentContains('android 3');
	const webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10);
	const androidStock = android && userAgentContains('Google') && webkitVer < 537 && !('AudioNode' in window);
	const opera = !!window.opera;
	const chrome = !edge && userAgentContains('chrome');
	const gecko = userAgentContains('gecko') && !webkit && !opera && !ie;
	const safari = !chrome && userAgentContains('safari');
	const phantom = userAgentContains('phantom');
	const opera12 = 'OTransition' in document.documentElement.style;
	const win = navigator.platform.indexOf('Win') === 0;
	const ie3d = ie && ('transition' in document.documentElement.style);
	const webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23;
	const gecko3d = 'MozPerspective' in document.documentElement.style;
	const any3d = !window.ATLAS_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;
	const mobile = typeof orientation !== 'undefined' || userAgentContains('mobile');
	const mobileWebkit = mobile && webkit;
	const mobileWebkit3d = mobile && webkit3d;
	const msPointer = !window.PointerEvent && window.MSPointerEvent;
	const pointer = !!(window.PointerEvent || msPointer);
	const touchNative = 'ontouchstart' in window || !!window.TouchEvent;
	const touch = !window.ATLAS_NO_TOUCH && (touchNative || pointer);
	const mobileOpera = mobile && opera;
	const mobileGecko = mobile && gecko;
	const retina = (window.devicePixelRatio || (window.screen.deviceXDPI / window.screen.logicalXDPI)) > 1;
	const passiveEvents = (function() {
	    var supportsPassiveOption = false;
	    try {
	        var opts = Object.defineProperty({}, 'passive', {
	            get: function() {
	                supportsPassiveOption = true;
	            }
	        });
	        window.addEventListener('testPassiveEventSupport', falseFn, opts);
	        window.removeEventListener('testPassiveEventSupport', falseFn, opts);
	    } catch (e) {
	        // Do nothing
	    }
	    return supportsPassiveOption;
	}());
	const canvas$1 = (function() {
	    return !!document.createElement('canvas').getContext;
	}());
	const svg$1 = !!(document.createElementNS && svgCreate('svg').createSVGRect);
	const inlineSvg = !!svg$1 && (function() {
	    var div = document.createElement('div');
	    div.innerHTML = '<svg/>';
	    return (div.firstChild && div.firstChild.namespaceURI) === 'http://www.w3.org/2000/svg';
	})();
	const vml = !svg$1 && (function() {
	    try {
	        var div = document.createElement('div');
	        div.innerHTML = '<v:shape adj="1"/>';

	        var shape = div.firstChild;
	        shape.style.behavior = 'url(#default#VML)';

	        return shape && (typeof shape.adj === 'object');

	    } catch (e) {
	        return false;
	    }
	}());
	const mac = navigator.platform.indexOf('Mac') === 0;
	const linux = navigator.platform.indexOf('Linux') === 0;

	function userAgentContains(str) {
	    return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
	}

	function svgCreate(name) {
	    return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	var Browser$1 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		android: android,
		android23: android23,
		androidStock: androidStock,
		any3d: any3d,
		canvas: canvas$1,
		chrome: chrome,
		edge: edge,
		gecko: gecko,
		gecko3d: gecko3d,
		ie: ie,
		ie3d: ie3d,
		ielt9: ielt9,
		inlineSvg: inlineSvg,
		linux: linux,
		mac: mac,
		mobile: mobile,
		mobileGecko: mobileGecko,
		mobileOpera: mobileOpera,
		mobileWebkit: mobileWebkit,
		mobileWebkit3d: mobileWebkit3d,
		msPointer: msPointer,
		opera: opera,
		opera12: opera12,
		passiveEvents: passiveEvents,
		phantom: phantom,
		pointer: pointer,
		retina: retina,
		safari: safari,
		svg: svg$1,
		svgCreate: svgCreate,
		touch: touch,
		touchNative: touchNative,
		vml: vml,
		webkit: webkit,
		webkit3d: webkit3d,
		win: win
	});

	let Earth$1;
	Promise.resolve().then(function () { return CRS$1; }).then(module => {
	    Earth$1 = module.Earth;
	});

	function LatLng$1(lat, lng, alt) {
	    if (isNaN(lat) || isNaN(lng)) {
	        throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
	    }

	    this.lat = +lat;
	    this.lng = +lng;

	    if (alt !== undefined) {
	        this.alt = +alt;
	    }
	}

	LatLng$1.prototype = {
	    equals: function(obj, maxMargin) {
	        if (!obj) {
	            return false;
	        }

	        obj = toLatLng$1(obj);

	        var margin = Math.max(
	            Math.abs(this.lat - obj.lat),
	            Math.abs(this.lng - obj.lng));

	        return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
	    },

	    toString: function(precision) {
	        return 'LatLng(' +
	            formatNum(this.lat, precision) + ', ' +
	            formatNum(this.lng, precision) + ')';
	    },

	    distanceTo: function(other) {
	        return Earth$1.distance(this, toLatLng$1(other));
	    },

	    wrap: function() {
	        return Earth$1.wrapLatLng(this);
	    },

	    toBounds: function(sizeInMeters) {
	        var latAccuracy = 180 * sizeInMeters / 40075017,
	            lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

	        return Promise.resolve().then(function () { return LatLngBounds$2; }).then(({
	            toLatLngBounds
	        }) => {
	            return toLatLngBounds(
	                [this.lat - latAccuracy, this.lng - lngAccuracy], [this.lat + latAccuracy, this.lng + lngAccuracy]);
	        });
	    },

	    clone: function() {
	        return new LatLng$1(this.lat, this.lng, this.alt);
	    }
	};

	function toLatLng$1(a, b, c) {
	    if (a instanceof LatLng$1) {
	        return a;
	    }
	    if (isArray$1(a) && typeof a[0] !== 'object') {
	        if (a.length === 3) {
	            return new LatLng$1(a[0], a[1], a[2]);
	        }
	        if (a.length === 2) {
	            return new LatLng$1(a[0], a[1]);
	        }
	        return null;
	    }
	    if (a === undefined || a === null) {
	        return a;
	    }
	    if (typeof a === 'object' && 'lat' in a) {
	        return new LatLng$1(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
	    }
	    if (b === undefined) {
	        return null;
	    }
	    return new LatLng$1(a, b, c);
	}

	function LatLngBounds$1(corner1, corner2) {
	    if (!corner1) {
	        return;
	    }

	    var latlngs = corner2 ? [corner1, corner2] : corner1;

	    for (var i = 0, len = latlngs.length; i < len; i++) {
	        this.extend(latlngs[i]);
	    }
	}

	LatLngBounds$1.prototype = {
	    extend: function(obj) {
	        var sw = this._southWest,
	            ne = this._northEast,
	            sw2, ne2;

	        if (obj instanceof LatLng$1) {
	            sw2 = obj;
	            ne2 = obj;

	        } else if (obj instanceof LatLngBounds$1) {
	            sw2 = obj._southWest;
	            ne2 = obj._northEast;

	            if (!sw2 || !ne2) {
	                return this;
	            }

	        } else {
	            return obj ? this.extend(toLatLng$1(obj) || toLatLngBounds$1(obj)) : this;
	        }

	        if (!sw && !ne) {
	            this._southWest = new LatLng$1(sw2.lat, sw2.lng);
	            this._northEast = new LatLng$1(ne2.lat, ne2.lng);
	        } else {
	            sw.lat = Math.min(sw2.lat, sw.lat);
	            sw.lng = Math.min(sw2.lng, sw.lng);
	            ne.lat = Math.max(ne2.lat, ne.lat);
	            ne.lng = Math.max(ne2.lng, ne.lng);
	        }

	        return this;
	    },

	    pad: function(bufferRatio) {
	        var sw = this._southWest,
	            ne = this._northEast,
	            heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
	            widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

	        return new LatLngBounds$1(
	            new LatLng$1(sw.lat - heightBuffer, sw.lng - widthBuffer),
	            new LatLng$1(ne.lat + heightBuffer, ne.lng + widthBuffer));
	    },

	    getCenter: function() {
	        return new LatLng$1(
	            (this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2);
	    },

	    getSouthWest: function() {
	        return this._southWest;
	    },

	    getNorthEast: function() {
	        return this._northEast;
	    },

	    getNorthWest: function() {
	        return new LatLng$1(this.getNorth(), this.getWest());
	    },

	    getSouthEast: function() {
	        return new LatLng$1(this.getSouth(), this.getEast());
	    },

	    getWest: function() {
	        return this._southWest.lng;
	    },

	    getSouth: function() {
	        return this._southWest.lat;
	    },

	    getEast: function() {
	        return this._northEast.lng;
	    },

	    getNorth: function() {
	        return this._northEast.lat;
	    },

	    contains: function(obj) {
	        if (typeof obj[0] === 'number' || obj instanceof LatLng$1 || 'lat' in obj) {
	            obj = toLatLng$1(obj);
	        } else {
	            obj = toLatLngBounds$1(obj);
	        }

	        var sw = this._southWest,
	            ne = this._northEast,
	            sw2, ne2;

	        if (obj instanceof LatLngBounds$1) {
	            sw2 = obj.getSouthWest();
	            ne2 = obj.getNorthEast();
	        } else {
	            sw2 = ne2 = obj;
	        }

	        return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
	            (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	    },

	    intersects: function(bounds) {
	        bounds = toLatLngBounds$1(bounds);

	        var sw = this._southWest,
	            ne = this._northEast,
	            sw2 = bounds.getSouthWest(),
	            ne2 = bounds.getNorthEast(),

	            latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
	            lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

	        return latIntersects && lngIntersects;
	    },

	    overlaps: function(bounds) {
	        bounds = toLatLngBounds$1(bounds);

	        var sw = this._southWest,
	            ne = this._northEast,
	            sw2 = bounds.getSouthWest(),
	            ne2 = bounds.getNorthEast(),

	            latOverlaps = (ne2.lat > sw.lat) && (sw2.lat < ne.lat),
	            lngOverlaps = (ne2.lng > sw.lng) && (sw2.lng < ne.lng);

	        return latOverlaps && lngOverlaps;
	    },

	    toBBoxString: function() {
	        return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	    },

	    equals: function(bounds, maxMargin) {
	        if (!bounds) {
	            return false;
	        }

	        bounds = toLatLngBounds$1(bounds);

	        return this._southWest.equals(bounds.getSouthWest(), maxMargin) &&
	            this._northEast.equals(bounds.getNorthEast(), maxMargin);
	    },

	    isValid: function() {
	        return !!(this._southWest && this._northEast);
	    }
	};

	function toLatLngBounds$1(a, b) {
	    if (a instanceof LatLngBounds$1) {
	        return a;
	    }
	    return new LatLngBounds$1(a, b);
	}

	var LatLngBounds$2 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		LatLngBounds: LatLngBounds$1,
		toLatLngBounds: toLatLngBounds$1
	});

	function Bounds(a, b) {
	    if (!a) {
	        return;
	    }

	    var points = b ? [a, b] : a;

	    for (var i = 0, len = points.length; i < len; i++) {
	        this.extend(points[i]);
	    }
	}

	Bounds.prototype = {
	    extend: function(obj) {
	        var min2, max2;
	        if (!obj) {
	            return this;
	        }

	        if (obj instanceof Point$1 || typeof obj[0] === 'number' || 'x' in obj) {
	            min2 = max2 = toPoint$1(obj);
	        } else {
	            obj = toBounds(obj);
	            min2 = obj.min;
	            max2 = obj.max;
	            if (!min2 || !max2) {
	                return this;
	            }
	        }

	        if (!this.min && !this.max) {
	            this.min = min2.clone();
	            this.max = max2.clone();
	        } else {
	            this.min.x = Math.min(min2.x, this.min.x);
	            this.max.x = Math.max(max2.x, this.max.x);
	            this.min.y = Math.min(min2.y, this.min.y);
	            this.max.y = Math.max(max2.y, this.max.y);
	        }
	        return this;
	    },

	    getCenter: function(round) {
	        return toPoint$1(
	            (this.min.x + this.max.x) / 2,
	            (this.min.y + this.max.y) / 2, round);
	    },

	    getBottomLeft: function() {
	        return toPoint$1(this.min.x, this.max.y);
	    },

	    getTopRight: function() {
	        return toPoint$1(this.max.x, this.min.y);
	    },

	    getTopLeft: function() {
	        return this.min;
	    },

	    getBottomRight: function() {
	        return this.max;
	    },

	    getSize: function() {
	        return this.max.subtract(this.min);
	    },

	    contains: function(obj) {
	        var min, max;

	        if (typeof obj[0] === 'number' || obj instanceof Point$1) {
	            obj = toPoint$1(obj);
	        } else {
	            obj = toBounds(obj);
	        }

	        if (obj instanceof Bounds) {
	            min = obj.min;
	            max = obj.max;
	        } else {
	            min = max = obj;
	        }

	        return (min.x >= this.min.x) &&
	            (max.x <= this.max.x) &&
	            (min.y >= this.min.y) &&
	            (max.y <= this.max.y);
	    },

	    intersects: function(bounds) {
	        bounds = toBounds(bounds);

	        var min = this.min,
	            max = this.max,
	            min2 = bounds.min,
	            max2 = bounds.max,
	            xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
	            yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

	        return xIntersects && yIntersects;
	    },

	    overlaps: function(bounds) {
	        bounds = toBounds(bounds);

	        var min = this.min,
	            max = this.max,
	            min2 = bounds.min,
	            max2 = bounds.max,
	            xOverlaps = (max2.x > min.x) && (min2.x < max.x),
	            yOverlaps = (max2.y > min.y) && (min2.y < max.y);

	        return xOverlaps && yOverlaps;
	    },

	    isValid: function() {
	        return !!(this.min && this.max);
	    },

	    pad: function(bufferRatio) {
	        var min = this.min,
	            max = this.max,
	            heightBuffer = Math.abs(min.x - max.x) * bufferRatio,
	            widthBuffer = Math.abs(min.y - max.y) * bufferRatio;

	        return toBounds(
	            toPoint$1(min.x - heightBuffer, min.y - widthBuffer),
	            toPoint$1(max.x + heightBuffer, max.y + widthBuffer));
	    },

	    equals: function(bounds) {
	        if (!bounds) {
	            return false;
	        }

	        bounds = toBounds(bounds);

	        return this.min.equals(bounds.getTopLeft()) &&
	            this.max.equals(bounds.getBottomRight());
	    },
	};

	function toBounds(a, b) {
	    if (!a || a instanceof Bounds) {
	        return a;
	    }
	    return new Bounds(a, b);
	}

	const CRS = {
	    latLngToPoint: function(latlng, zoom) {
	        var projectedPoint = this.projection.project(latlng),
	            scale = this.scale(zoom);

	        return this.transformation._transform(projectedPoint, scale);
	    },

	    pointToLatLng: function(point, zoom) {
	        var scale = this.scale(zoom),
	            untransformedPoint = this.transformation.untransform(point, scale);

	        return this.projection.unproject(untransformedPoint);
	    },

	    project: function(latlng) {
	        return this.projection.project(latlng);
	    },

	    unproject: function(point) {
	        return this.projection.unproject(point);
	    },

	    scale: function(zoom) {
	        return 256 * Math.pow(2, zoom);
	    },

	    zoom: function(scale) {
	        return Math.log(scale / 256) / Math.LN2;
	    },

	    getProjectedBounds: function(zoom) {
	        if (this.infinite) {
	            return null;
	        }

	        var b = this.projection.bounds,
	            s = this.scale(zoom),
	            min = this.transformation.transform(b.min, s),
	            max = this.transformation.transform(b.max, s);

	        return new Bounds(min, max);
	    },

	    infinite: false,

	    wrapLatLng: function(latlng) {
	        var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
	            lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat,
	            alt = latlng.alt;

	        return new LatLng$1(lat, lng, alt);
	    },

	    wrapLatLngBounds: function(bounds) {
	        var center = bounds.getCenter(),
	            newCenter = this.wrapLatLng(center),
	            latShift = center.lat - newCenter.lat,
	            lngShift = center.lng - newCenter.lng;

	        if (latShift === 0 && lngShift === 0) {
	            return bounds;
	        }

	        var sw = bounds.getSouthWest(),
	            ne = bounds.getNorthEast(),
	            newSw = new LatLng$1(sw.lat - latShift, sw.lng - lngShift),
	            newNe = new LatLng$1(ne.lat - latShift, ne.lng - lngShift);

	        return new LatLngBounds$1(newSw, newNe);
	    }
	};

	const Earth = extend({}, CRS, {
	    wrapLng: [-180, 180],

	    R: 6371000,

	    distance: function(latlng1, latlng2) {
	        var rad = Math.PI / 180,
	            lat1 = latlng1.lat * rad,
	            lat2 = latlng2.lat * rad,
	            sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
	            sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2),
	            a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
	            c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	        return this.R * c;
	    }
	});

	var CRS$1 = /*#__PURE__*/Object.freeze({
		__proto__: null,
		CRS: CRS,
		Earth: Earth
	});

	const LonLat = {
	    project: function(latlng) {
	        return new Point$1(latlng.lng, latlng.lat);
	    },

	    unproject: function(point) {
	        return new LatLng$1(point.y, point.x);
	    },

	    bounds: new Bounds([-180, -90], [180, 90])
	};

	const Mercator = {
	    R: 6378137,
	    R_MINOR: 6356752.314245179,

	    bounds: new Bounds([-20037508.34279, -15496570.73972], [20037508.34279, 18764656.23138]),

	    project: function(latlng) {
	        var d = Math.PI / 180,
	            r = this.R,
	            y = latlng.lat * d,
	            tmp = this.R_MINOR / r,
	            e = Math.sqrt(1 - tmp * tmp),
	            con = e * Math.sin(y);

	        var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
	        y = -r * Math.log(Math.max(ts, 1E-10));

	        return new Point$1(latlng.lng * d * r, y);
	    },

	    unproject: function(point) {
	        var d = 180 / Math.PI,
	            r = this.R,
	            tmp = this.R_MINOR / r,
	            e = Math.sqrt(1 - tmp * tmp),
	            ts = Math.exp(-point.y / r),
	            phi = Math.PI / 2 - 2 * Math.atan(ts);

	        for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
	            con = e * Math.sin(phi);
	            con = Math.pow((1 - con) / (1 + con), e / 2);
	            dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
	            phi += dphi;
	        }

	        return new LatLng$1(phi * d, point.x * d / r);
	    }
	};

	const SphericalMercator = {
	    R: 6378137,
	    MAX_LATITUDE: 85.0511287798,

	    project: function(latlng) {
	        var d = Math.PI / 180,
	            max = this.MAX_LATITUDE,
	            lat = Math.max(Math.min(max, latlng.lat), -max),
	            sin = Math.sin(lat * d);

	        return new Point$1(
	            this.R * latlng.lng * d,
	            this.R * Math.log((1 + sin) / (1 - sin)) / 2);
	    },

	    unproject: function(point) {
	        var d = 180 / Math.PI;

	        return new LatLng$1(
	            (2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d,
	            point.x * d / this.R);
	    },

	    bounds: (function() {
	        var d = 6378137 * Math.PI;
	        return new Bounds([-d, -d], [d, d]);
	    })()
	};

	// Placeholder for Map class
	const Map = function() {};

	const Layer = Evented.extend({
	    options: {
	        pane: 'overlayPane',
	        attribution: null,
	        bubblingMouseEvents: true
	    },

	    addTo: function(map) {
	        map.addLayer(this);
	        return this;
	    },

	    remove: function() {
	        return this.removeFrom(this._map || this._mapToAdd);
	    },

	    removeFrom: function(obj) {
	        if (obj) {
	            obj.removeLayer(this);
	        }
	        return this;
	    },

	    getPane: function(name) {
	        return this._map.getPane(name ? (this.options[name] || name) : this.options.pane);
	    },

	    addInteractiveTarget: function(targetEl) {
	        this._map._targets[stamp(targetEl)] = this;
	        return this;
	    },

	    removeInteractiveTarget: function(targetEl) {
	        delete this._map._targets[stamp(targetEl)];
	        return this;
	    },

	    getAttribution: function() {
	        return this.options.attribution;
	    },

	    _layerAdd: function(e) {
	        var map = e.target;

	        if (!map.hasLayer(this)) {
	            return;
	        }

	        this._map = map;
	        this._zoomAnimated = map._zoomAnimated;

	        if (this.getEvents) {
	            var events = this.getEvents();
	            map.on(events, this);
	            this.once('remove', function() {
	                map.off(events, this);
	            }, this);
	        }

	        this.onAdd(map);
	        this.fire('add');
	        map.fire('layeradd', {
	            layer: this
	        });
	    }
	});

	Map.include({
	    addLayer: function(layer) {
	        if (!layer._layerAdd) {
	            throw new Error('The provided object is not a Layer.');
	        }

	        var id = stamp(layer);
	        if (this._layers[id]) {
	            return this;
	        }
	        this._layers[id] = layer;

	        layer._mapToAdd = this;

	        if (layer.beforeAdd) {
	            layer.beforeAdd(this);
	        }

	        this.whenReady(layer._layerAdd, layer);

	        return this;
	    },

	    removeLayer: function(layer) {
	        var id = stamp(layer);

	        if (!this._layers[id]) {
	            return this;
	        }

	        if (this._loaded) {
	            layer.onRemove(this);
	        }

	        delete this._layers[id];

	        if (this._loaded) {
	            this.fire('layerremove', {
	                layer: layer
	            });
	            layer.fire('remove');
	        }

	        layer._map = layer._mapToAdd = null;

	        return this;
	    },

	    hasLayer: function(layer) {
	        return stamp(layer) in this._layers;
	    },

	    eachLayer: function(method, context) {
	        for (var i in this._layers) {
	            method.call(context, this._layers[i]);
	        }
	        return this;
	    },

	    _addLayers: function(layers) {
	        layers = layers ? (isArray$1(layers) ? layers : [layers]) : [];

	        for (var i = 0, len = layers.length; i < len; i++) {
	            this.addLayer(layers[i]);
	        }
	    },

	    _addZoomLimit: function(layer) {
	        if (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
	            this._zoomBoundLayers[stamp(layer)] = layer;
	            this._updateZoomLevels();
	        }
	    },

	    _removeZoomLimit: function(layer) {
	        var id = stamp(layer);

	        if (this._zoomBoundLayers[id]) {
	            delete this._zoomBoundLayers[id];
	            this._updateZoomLevels();
	        }
	    },

	    _updateZoomLevels: function() {
	        var minZoom = Infinity,
	            maxZoom = -Infinity,
	            oldZoomSpan = this._getZoomSpan();

	        for (var i in this._zoomBoundLayers) {
	            var options = this._zoomBoundLayers[i].options;

	            minZoom = options.minZoom === undefined ? minZoom : Math.min(minZoom, options.minZoom);
	            maxZoom = options.maxZoom === undefined ? maxZoom : Math.max(maxZoom, options.maxZoom);
	        }

	        this._layersMaxZoom = maxZoom === -Infinity ? undefined : maxZoom;
	        this._layersMinZoom = minZoom === Infinity ? undefined : minZoom;

	        if (oldZoomSpan !== this._getZoomSpan()) {
	            this.fire('zoomlevelschange');
	        }

	        if (this.options.maxZoom === undefined && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom) {
	            this.setZoom(this._layersMaxZoom);
	        }
	        if (this.options.minZoom === undefined && this._layersMinZoom && this.getZoom() < this._layersMinZoom) {
	            this.setZoom(this._layersMinZoom);
	        }
	    }
	});

	const Icon = Class.extend({
	    options: {
	        iconUrl: null,
	        iconRetinaUrl: null,
	        iconSize: null,
	        iconAnchor: null,
	        popupAnchor: [0, 0],
	        tooltipAnchor: [0, 0],
	        shadowUrl: null,
	        shadowRetinaUrl: null,
	        shadowSize: null,
	        shadowAnchor: null,
	        className: '',
	        crossOrigin: false
	    },

	    initialize: function(options) {
	        setOptions$1(this, options);
	    },

	    createIcon: function(oldIcon) {
	        return this._createIcon('icon', oldIcon);
	    },

	    createShadow: function(oldIcon) {
	        return this._createIcon('shadow', oldIcon);
	    },

	    _createIcon: function(name, oldIcon) {
	        var src = this._getIconUrl(name);

	        if (!src) {
	            if (name === 'icon') {
	                throw new Error('iconUrl not set in Icon options (see the docs).');
	            }
	            return null;
	        }

	        var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
	        this._setIconStyles(img, name);

	        if (this.options.crossOrigin || this.options.crossOrigin === '') {
	            img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
	        }

	        return img;
	    },

	    _setIconStyles: function(img, name) {
	        var options = this.options;
	        var sizeOption = options[name + 'Size'];

	        if (typeof sizeOption === 'number') {
	            sizeOption = [sizeOption, sizeOption];
	        }

	        var size = toPoint$2(sizeOption),
	            anchor = toPoint$2(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
	                size && size.divideBy(2, true));

	        img.className = 'atlas-marker-' + name + ' ' + (options.className || '');

	        if (anchor) {
	            img.style.marginLeft = (-anchor.x) + 'px';
	            img.style.marginTop = (-anchor.y) + 'px';
	        }

	        if (size) {
	            img.style.width = size.x + 'px';
	            img.style.height = size.y + 'px';
	        }
	    },

	    _createImg: function(src, el) {
	        el = el || document.createElement('img');
	        el.src = src;
	        return el;
	    },

	    _getIconUrl: function(name) {
	        return retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
	    }
	});

	function icon(options) {
	    return new Icon(options);
	}

	Icon.Default = Icon.extend({
	    options: {
	        iconUrl: 'marker-icon.png',
	        iconRetinaUrl: 'marker-icon-2x.png',
	        shadowUrl: 'marker-shadow.png',
	        iconSize: [25, 41],
	        iconAnchor: [12, 41],
	        popupAnchor: [1, -34],
	        tooltipAnchor: [16, -28],
	        shadowSize: [41, 41]
	    },

	    _getIconUrl: function(name) {
	        if (typeof Icon.Default.imagePath !== 'string') {
	            Icon.Default.imagePath = this._detectIconPath();
	        }

	        return (this.options.imagePath || Icon.Default.imagePath) + Icon.prototype._getIconUrl.call(this, name);
	    },

	    _stripUrl: function(path) {
	        var strip = function(str, re, idx) {
	            var match = re.exec(str);
	            return match && match[idx];
	        };
	        path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
	        return path && strip(path, /^(.*)marker-icon\.png$/, 1);
	    },

	    _detectIconPath: function() {
	        var el = create('div', 'atlas-default-icon-path', document.body);
	        var path = getStyle(el, 'background-image') ||
	            getStyle(el, 'backgroundImage'); // IE8

	        document.body.removeChild(el);
	        path = this._stripUrl(path);

	        if (path) {
	            return path;
	        }

	        var link = document.querySelector('link[href$="atlas.css"]');

	        if (!link) {
	            return '';
	        }

	        return link.href.substring(0, link.href.length - 'atlas.css'.length - 1);
	    }
	});

	const Handler = Class.extend({
	    initialize: function(map) {
	        this._map = map;
	    },

	    enable: function() {
	        if (this._enabled) {
	            return this;
	        }

	        this._enabled = true;
	        this.addHooks();
	        return this;
	    },

	    disable: function() {
	        if (!this._enabled) {
	            return this;
	        }

	        this._enabled = false;
	        this.removeHooks();
	        return this;
	    },

	    enabled: function() {
	        return !!this._enabled;
	    }
	});

	Handler.addTo = function(map, name) {
	    map.addHandler(name, this);
	    return this;
	};

	const START = touch ? 'touchstart mousedown' : 'mousedown';

	const Draggable = Evented.extend({
	    options: {
	        clickTolerance: 3
	    },

	    initialize: function(element, dragStartTarget, preventOutline, options) {
	        setOptions$1(this, options);

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
	        exports.disableTextSelection();

	        if (this._moving) {
	            return;
	        }

	        this.fire('down');

	        var first = e.touches ? e.touches[0] : e,
	            sizedParent = getSizedParentNode(this._element);

	        this._startPoint = new Point$1(first.clientX, first.clientY);
	        this._startPos = getPosition$1(this._element);

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
	            offset = new Point$1(first.clientX, first.clientY)._subtract(this._startPoint);

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

	            addClass$1(document.body, 'atlas-dragging');

	            this._lastTarget = e.target || e.srcElement;
	            if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
	                this._lastTarget = this._lastTarget.correspondingUseElement;
	            }
	            addClass$1(this._lastTarget, 'atlas-drag-target');
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
	        setPosition$1(this._element, this._newPos);
	        this.fire('drag', e);
	    },

	    _onUp: function() {
	        if (!this._enabled) {
	            return;
	        }
	        this.finishDrag();
	    },

	    finishDrag: function(noInertia) {
	        removeClass$1(document.body, 'atlas-dragging');

	        if (this._lastTarget) {
	            removeClass$1(this._lastTarget, 'atlas-drag-target');
	            this._lastTarget = null;
	        }

	        off(document, 'mousemove touchmove', this._onMove, this);
	        off(document, 'mouseup touchend touchcancel', this._onUp, this);

	        enableImageDrag();
	        exports.enableTextSelection();

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

	const MarkerDrag = Handler.extend({
		initialize: function (marker) {
			this._marker = marker;
		},

		addHooks: function () {
			var icon = this._marker._icon;

			if (!this._draggable) {
				this._draggable = new Draggable(icon, icon, true);
			}

			this._draggable.on({
				dragstart: this._onDragStart,
				predrag: this._onPreDrag,
				drag: this._onDrag,
				dragend: this._onDragEnd
			}, this).enable();

			addClass$1(icon, 'atlas-marker-draggable');
		},

		removeHooks: function () {
			this._draggable.off({
				dragstart: this._onDragStart,
				predrag: this._onPreDrag,
				drag: this._onDrag,
				dragend: this._onDragEnd
			}, this).disable();

			if (this._marker._icon) {
				removeClass$1(this._marker._icon, 'atlas-marker-draggable');
			}
		},

		moved: function () {
			return this._draggable && this._draggable._moved;
		},

		_adjustPan: function (e) {
			var marker = this._marker,
			    map = marker._map,
			    speed = this._marker.options.autoPanSpeed,
			    padding = this._marker.options.autoPanPadding,
			    iconPos = getPosition(marker._icon),
			    bounds = map.getPixelBounds(),
			    origin = map.getPixelOrigin();

			var panBounds = toBounds(
				bounds.min._subtract(origin).add(padding),
				bounds.max._subtract(origin).subtract(padding)
			);

			if (!panBounds.contains(iconPos)) {
				var movement = toPoint$1(
					(Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) -
					(Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x),

					(Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) -
					(Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)
				).multiplyBy(speed);

				map.panBy(movement, {animate: false});

				this._draggable._newPos._add(movement);
				this._draggable._startPos._add(movement);

				setPosition(marker._icon, this._draggable._newPos);
				this._onDrag(e);

				this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
			}
		},

		_onDragStart: function () {
			this._oldLatLng = this._marker.getLatLng();
			this._marker.closePopup && this._marker.closePopup();

			this._marker
				.fire('movestart')
				.fire('dragstart');
		},

		_onPreDrag: function (e) {
			if (this._marker.options.autoPan) {
				cancelAnimFrame(this._panRequest);
				this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
			}
		},

		_onDrag: function (e) {
			var marker = this._marker,
			    shadow = marker._shadow,
			    iconPos = getPosition(marker._icon),
			    latlng = marker._map.layerPointToLatLng(iconPos);

			if (shadow) {
				setPosition(shadow, iconPos);
			}

			marker._latlng = latlng;
			e.latlng = latlng;
			e.oldLatLng = this._oldLatLng;

			marker
			    .fire('move', e)
			    .fire('drag', e);
		},

		_onDragEnd: function (e) {
			 cancelAnimFrame(this._panRequest);
			delete this._oldLatLng;
			this._marker
			    .fire('moveend')
			    .fire('dragend', e);
		}
	});

	const Drag = Handler.extend({
	    addHooks: function() {
	        if (!this._draggable) {
	            var map = this._map;

	            this._draggable = new Draggable(map._mapPane, map._container);

	            this._draggable.on({
	                dragstart: this._onDragStart,
	                drag: this._onDrag,
	                dragend: this._onDragEnd
	            }, this);

	            this._draggable.on('predrag', this._onPreDragLimit, this);
	            if (map.options.worldCopyJump) {
	                this._draggable.on('predrag', this._onPreDragWrap, this);
	                map.on('zoomend', this._onZoomEnd, this);
	                map.whenReady(this._onZoomEnd, this);
	            }
	        }
	        addClass$1(this._map._container, 'atlas-grab atlas-touch-drag');
	        this._draggable.enable();
	        this._positions = [];
	        this._times = [];
	    },

	    removeHooks: function() {
	        removeClass$1(this._map._container, 'atlas-grab');
	        removeClass$1(this._map._container, 'atlas-touch-drag');
	        this._draggable.disable();
	    },

	    moved: function() {
	        return this._draggable && this._draggable._moved;
	    },

	    moving: function() {
	        return this._draggable && this._draggable._moving;
	    },

	    _onDragStart: function() {
	        var map = this._map;

	        map._stop();
	        if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
	            var bounds = toLatLngBounds$1(this._map.options.maxBounds);

	            this._offsetLimit = toBounds(
	                this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
	                this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1)
	                .add(this._map.getSize()));
	            this._viscosity = Math.min(1.0, Math.max(0.0, this._map.options.maxBoundsViscosity));
	        } else {
	            this._offsetLimit = null;
	        }

	        map
	            .fire('movestart')
	            .fire('dragstart');

	        if (map.options.inertia) {
	            this._positions = [];
	            this._times = [];
	        }
	    },

	    _onDrag: function(e) {
	        if (this._map.options.inertia) {
	            var time = this._lastTime = +new Date(),
	                pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;

	            this._positions.push(pos);
	            this._times.push(time);

	            this._prunePositions(time);
	        }

	        this._map
	            .fire('move', e)
	            .fire('drag', e);
	    },

	    _prunePositions: function(time) {
	        while (this._positions.length > 1 && time - this._times[0] > 50) {
	            this._positions.shift();
	            this._times.shift();
	        }
	    },

	    _onZoomEnd: function() {
	        var pxCenter = this._map.getSize().divideBy(2),
	            pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

	        this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
	        this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
	    },

	    _viscousLimit: function(value, threshold) {
	        return value - (value - threshold) * this._viscosity;
	    },

	    _onPreDragLimit: function() {
	        if (!this._viscosity || !this._offsetLimit) {
	            return;
	        }

	        var offset = this._draggable._newPos.subtract(this._draggable._startPos);

	        var limit = this._offsetLimit;
	        if (offset.x < limit.min.x) {
	            offset.x = this._viscousLimit(offset.x, limit.min.x);
	        }
	        if (offset.y < limit.min.y) {
	            offset.y = this._viscousLimit(offset.y, limit.min.y);
	        }
	        if (offset.x > limit.max.x) {
	            offset.x = this._viscousLimit(offset.x, limit.max.x);
	        }
	        if (offset.y > limit.max.y) {
	            offset.y = this._viscousLimit(offset.y, limit.max.y);
	        }

	        this._draggable._newPos = this._draggable._startPos.add(offset);
	    },

	    _onPreDragWrap: function() {
	        var worldWidth = this._worldWidth,
	            halfWidth = Math.round(worldWidth / 2),
	            dx = this._initialWorldOffset,
	            x = this._draggable._newPos.x,
	            newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
	            newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
	            newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

	        this._draggable._absPos = this._draggable._newPos.clone();
	        this._draggable._newPos.x = newX;
	    },

	    _onDragEnd: function(e) {
	        var map = this._map,
	            options = map.options,
	            noInertia = !options.inertia || e.noInertia || this._times.length < 2;

	        map.fire('dragend', e);

	        if (noInertia) {
	            map.fire('moveend');

	        } else {
	            this._prunePositions(+new Date());

	            var direction = this._lastPos.subtract(this._positions[0]),
	                duration = (this._lastTime - this._times[0]) / 1000,
	                ease = options.easeLinearity,

	                speedVector = direction.multiplyBy(ease / duration),
	                speed = speedVector.distanceTo([0, 0]),

	                limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
	                limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

	                decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
	                offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

	            if (!offset.x && !offset.y) {
	                map.fire('moveend');

	            } else {
	                offset = map._limitOffset(offset, map.options.maxBounds);

	                requestAnimFrame(function() {
	                    map.panBy(offset, {
	                        duration: decelerationDuration,
	                        easeLinearity: ease,
	                        noMoveStart: true,
	                        animate: true
	                    });
	                });
	            }
	        }
	    }
	});

	const Marker = Layer.extend({
	    options: {
	        icon: new Icon.Default(),
	        interactive: true,
	        keyboard: true,
	        title: '',
	        alt: 'Marker',
	        zIndexOffset: 0,
	        opacity: 1,
	        riseOnHover: false,
	        riseOffset: 250,
	        pane: 'markerPane',
	        shadowPane: 'shadowPane',
	        bubblingMouseEvents: false,
	        autoPanOnFocus: true,
	        draggable: false,
	        autoPan: false,
	        autoPanPadding: [50, 50],
	        autoPanSpeed: 10
	    },

	    initialize: function(latlng, options) {
	        setOptions$1(this, options);
	        this._latlng = toLatLng$1(latlng);
	    },

	    onAdd: function(map) {
	        this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;

	        if (this._zoomAnimated) {
	            map.on('zoomanim', this._animateZoom, this);
	        }

	        this._initIcon();
	        this.update();
	    },

	    onRemove: function(map) {
	        if (this.dragging && this.dragging.enabled()) {
	            this.options.draggable = true;
	            this.dragging.removeHooks();
	        }
	        delete this.dragging;

	        if (this._zoomAnimated) {
	            map.off('zoomanim', this._animateZoom, this);
	        }

	        this._removeIcon();
	        this._removeShadow();
	    },

	    getEvents: function() {
	        return {
	            zoom: this.update,
	            viewreset: this.update
	        };
	    },

	    getLatLng: function() {
	        return this._latlng;
	    },

	    setLatLng: function(latlng) {
	        var oldLatLng = this._latlng;
	        this._latlng = toLatLng$1(latlng);
	        this.update();
	        return this.fire('move', {
	            oldLatLng: oldLatLng,
	            latlng: this._latlng
	        });
	    },

	    setZIndexOffset: function(offset) {
	        this.options.zIndexOffset = offset;
	        return this.update();
	    },

	    getIcon: function() {
	        return this.options.icon;
	    },

	    setIcon: function(icon) {
	        this.options.icon = icon;

	        if (this._map) {
	            this._initIcon();
	            this.update();
	        }

	        if (this._popup) {
	            this.bindPopup(this._popup, this._popup.options);
	        }

	        return this;
	    },

	    getElement: function() {
	        return this._icon;
	    },

	    update: function() {
	        if (this._icon && this._map) {
	            var pos = this._map.latLngToLayerPoint(this._latlng).round();
	            this._setPos(pos);
	        }

	        return this;
	    },

	    _initIcon: function() {
	        var options = this.options,
	            classToAdd = 'atlas-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

	        var icon = options.icon.createIcon(this._icon),
	            addIcon = false;

	        if (icon !== this._icon) {
	            if (this._icon) {
	                this._removeIcon();
	            }
	            addIcon = true;

	            if (options.title) {
	                icon.title = options.title;
	            }

	            if (icon.tagName === 'IMG') {
	                icon.alt = options.alt || '';
	            }
	        }

	        addClass$1(icon, classToAdd);

	        if (options.keyboard) {
	            icon.tabIndex = '0';
	            icon.setAttribute('role', 'button');
	        }

	        this._icon = icon;

	        if (options.riseOnHover) {
	            this.on({
	                mouseover: this._bringToFront,
	                mouseout: this._resetZIndex
	            });
	        }

	        if (this.options.autoPanOnFocus) {
	            on(icon, 'focus', this._panOnFocus, this);
	        }

	        var newShadow = options.icon.createShadow(this._shadow),
	            addShadow = false;

	        if (newShadow !== this._shadow) {
	            this._removeShadow();
	            addShadow = true;
	        }

	        if (newShadow) {
	            addClass$1(newShadow, classToAdd);
	            newShadow.alt = '';
	        }
	        this._shadow = newShadow;


	        if (options.opacity < 1) {
	            this._updateOpacity();
	        }


	        if (addIcon) {
	            this.getPane().appendChild(this._icon);
	        }
	        this._initInteraction();
	        if (newShadow && addShadow) {
	            this.getPane(options.shadowPane).appendChild(this._shadow);
	        }
	    },

	    _removeIcon: function() {
	        if (this.options.riseOnHover) {
	            this.off({
	                mouseover: this._bringToFront,
	                mouseout: this._resetZIndex
	            });
	        }

	        if (this.options.autoPanOnFocus) {
	            off(this._icon, 'focus', this._panOnFocus, this);
	        }

	        remove(this._icon);
	        this.removeInteractiveTarget(this._icon);

	        this._icon = null;
	    },

	    _removeShadow: function() {
	        if (this._shadow) {
	            remove(this._shadow);
	        }
	        this._shadow = null;
	    },

	    _setPos: function(pos) {
	        if (this._icon) {
	            setPosition$1(this._icon, pos);
	        }

	        if (this._shadow) {
	            setPosition$1(this._shadow, pos);
	        }

	        this._zIndex = pos.y + this.options.zIndexOffset;

	        this._resetZIndex();
	    },

	    _updateZIndex: function(offset) {
	        if (this._icon) {
	            this._icon.style.zIndex = this._zIndex + offset;
	        }
	    },

	    _animateZoom: function(opt) {
	        var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
	        this._setPos(pos);
	    },

	    _initInteraction: function() {
	        if (!this.options.interactive) {
	            return;
	        }

	        addClass$1(this._icon, 'atlas-interactive');

	        this.addInteractiveTarget(this._icon);

	        if (MarkerDrag) {
	            var draggable = this.options.draggable;
	            if (this.dragging) {
	                draggable = this.dragging.enabled();
	                this.dragging.disable();
	            }

	            this.dragging = new MarkerDrag(this);

	            if (draggable) {
	                this.dragging.enable();
	            }
	        }
	    },

	    setOpacity: function(opacity) {
	        this.options.opacity = opacity;
	        if (this._map) {
	            this._updateOpacity();
	        }

	        return this;
	    },

	    _updateOpacity: function() {
	        var opacity = this.options.opacity;

	        if (this._icon) {
	            setOpacity$1(this._icon, opacity);
	        }

	        if (this._shadow) {
	            setOpacity$1(this._shadow, opacity);
	        }
	    },

	    _bringToFront: function() {
	        this._updateZIndex(this.options.riseOffset);
	    },

	    _resetZIndex: function() {
	        this._updateZIndex(0);
	    },

	    _panOnFocus: function() {
	        var map = this._map;
	        if (!map) {
	            return;
	        }

	        var iconOpts = this.options.icon.options;
	        var size = toPoint(iconOpts.iconSize);
	        var anchor = toPoint(iconOpts.iconAnchor);

	        map.panInside(this._latlng, {
	            paddingTopLeft: anchor,
	            paddingBottomRight: size.subtract(anchor)
	        });
	    },

	    _getPopupAnchor: function() {
	        return this.options.icon.options.popupAnchor;
	    },

	    _getTooltipAnchor: function() {
	        return this.options.icon.options.tooltipAnchor;
	    }
	});

	function marker(latlng, options) {
	    return new Marker(latlng, options);
	}

	const DivIcon = Icon.extend({
	    options: {
	        html: false,
	        bgPos: null,
	        iconSize: [12, 12],
	        iconAnchor: [6, 6],
	        popupAnchor: [0, -6],
	        className: 'atlas-div-icon'
	    },

	    createIcon: function(oldIcon) {
	        var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
	            options = this.options;

	        if (options.html instanceof Element) {
	            empty$1(div);
	            div.appendChild(options.html);
	        } else {
	            div.innerHTML = options.html !== false ? options.html : '';
	        }

	        if (options.bgPos) {
	            var bgPos = toPoint$2(options.bgPos);
	            div.style.backgroundPosition = (-bgPos.x) + 'px ' + (-bgPos.y) + 'px';
	        }
	        this._setIconStyles(div, 'icon');

	        return div;
	    },

	    createShadow: function() {
	        return null;
	    }
	});

	function divIcon(options) {
	    return new DivIcon(options);
	}

	const Path = Layer.extend({
	    options: {
	        stroke: true,
	        color: '#3388ff',
	        weight: 3,
	        opacity: 1,
	        lineCap: 'round',
	        lineJoin: 'round',
	        dashArray: null,
	        dashOffset: null,
	        fill: false,
	        fillColor: null,
	        fillOpacity: 0.2,
	        fillRule: 'evenodd',
	        interactive: true,
	        bubblingMouseEvents: true
	    },

	    beforeAdd: function(map) {
	        this._renderer = map.getRenderer(this);
	    },

	    onAdd: function() {
	        this._renderer._initPath(this);
	        this._reset();
	        this._renderer._addPath(this);
	    },

	    onRemove: function() {
	        this._renderer._removePath(this);
	    },

	    redraw: function() {
	        if (this._map) {
	            this._renderer._updatePath(this);
	        }
	        return this;
	    },

	    setStyle: function(style) {
	        setOptions$1(this, style);
	        if (this._renderer) {
	            this._renderer._updateStyle(this);
	            if (this.options.stroke && style && Object.prototype.hasOwnProperty.call(style, 'weight')) {
	                this._updateBounds();
	            }
	        }
	        return this;
	    },

	    bringToFront: function() {
	        if (this._renderer) {
	            this._renderer._bringToFront(this);
	        }
	        return this;
	    },

	    bringToBack: function() {
	        if (this._renderer) {
	            this._renderer._bringToBack(this);
	        }
	        return this;
	    },

	    getElement: function() {
	        return this._path;
	    },

	    _reset: function() {
	        this._project();
	        this._update();
	    },

	    _clickTolerance: function() {
	        return (this.options.stroke ? this.options.weight / 2 : 0) +
	            (this._renderer.options.tolerance || 0);
	    }
	});

	const CircleMarker = Path.extend({
	    options: {
	        fill: true,
	        radius: 10
	    },

	    initialize: function(latlng, options) {
	        setOptions$1(this, options);
	        this._latlng = toLatLng$1(latlng);
	        this._radius = this.options.radius;
	    },

	    setLatLng: function(latlng) {
	        var oldLatLng = this._latlng;
	        this._latlng = toLatLng$1(latlng);
	        this.redraw();
	        return this.fire('move', {
	            oldLatLng: oldLatLng,
	            latlng: this._latlng
	        });
	    },

	    getLatLng: function() {
	        return this._latlng;
	    },

	    setRadius: function(radius) {
	        this.options.radius = this._radius = radius;
	        return this.redraw();
	    },

	    getRadius: function() {
	        return this._radius;
	    },

	    setStyle: function(options) {
	        var radius = options && options.radius || this._radius;
	        Path.prototype.setStyle.call(this, options);
	        this.setRadius(radius);
	        return this;
	    },

	    _project: function() {
	        this._point = this._map.latLngToLayerPoint(this._latlng);
	        this._updateBounds();
	    },

	    _updateBounds: function() {
	        var r = this._radius,
	            r2 = this._radiusY || r,
	            w = this._clickTolerance(),
	            p = [r + w, r2 + w];
	        this._pxBounds = new Bounds(this._point.subtract(p), this._point.add(p));
	    },

	    _update: function() {
	        if (this._map) {
	            this._updatePath();
	        }
	    },

	    _updatePath: function() {
	        this._renderer._updateCircle(this);
	    },

	    _empty: function() {
	        return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
	    },

	    _containsPoint: function(p) {
	        return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
	    }
	});

	function circleMarker(latlng, options) {
	    return new CircleMarker(latlng, options);
	}

	const Circle = CircleMarker.extend({
	    initialize: function(latlng, options, legacyOptions) {
	        if (typeof options === 'number') {
	            options = extend({}, legacyOptions, {
	                radius: options
	            });
	        }
	        setOptions$1(this, options);
	        this._latlng = toLatLng$1(latlng);

	        if (isNaN(this.options.radius)) {
	            throw new Error('Circle radius cannot be NaN');
	        }

	        this._mRadius = this.options.radius;
	    },

	    setRadius: function(radius) {
	        this._mRadius = radius;
	        return this.redraw();
	    },

	    getRadius: function() {
	        return this._mRadius;
	    },

	    getBounds: function() {
	        var half = [this._radius, this._radiusY || this._radius];
	        return new LatLngBounds$1(
	            this._map.layerPointToLatLng(this._point.subtract(half)),
	            this._map.layerPointToLatLng(this._point.add(half)));
	    },

	    setStyle: Path.prototype.setStyle,

	    _project: function() {
	        var lng = this._latlng.lng,
	            lat = this._latlng.lat,
	            map = this._map,
	            crs = map.options.crs;

	        if (crs.distance === Earth.distance) {
	            var d = Math.PI / 180,
	                latR = (this._mRadius / Earth.R) / d,
	                top = map.project([lat + latR, lng]),
	                bottom = map.project([lat - latR, lng]),
	                p = top.add(bottom).divideBy(2),
	                lat2 = map.unproject(p).lat,
	                lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) /
	                    (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;

	            if (isNaN(lngR) || lngR === 0) {
	                lngR = latR / Math.cos(Math.PI / 180 * lat);
	            }

	            this._point = p.subtract(map.getPixelOrigin());
	            this._radius = isNaN(lngR) ? 0 : p.x - map.project([lat2, lng - lngR]).x;
	            this._radiusY = p.y - top.y;

	        } else {
	            var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));

	            this._point = map.latLngToLayerPoint(this._latlng);
	            this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
	        }

	        this._updateBounds();
	    }
	});

	function circle(latlng, options, legacyOptions) {
	    return new Circle(latlng, options, legacyOptions);
	}

	const LineUtil = {
	    simplify: function(points, tolerance) {
	        if (!tolerance || !points.length) {
	            return points.slice();
	        }

	        var sqTolerance = tolerance * tolerance;
	        points = this._reducePoints(points, sqTolerance);
	        points = this._simplifyDP(points, sqTolerance);

	        return points;
	    },

	    pointToSegmentDistance: function(p, p1, p2) {
	        return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	    },

	    closestPointOnSegment: function(p, p1, p2) {
	        return this._sqClosestPointOnSegment(p, p1, p2);
	    },

	    _simplifyDP: function(points, sqTolerance) {
	        var len = points.length,
	            ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
	            markers = new ArrayConstructor(len);

	        markers[0] = markers[len - 1] = 1;
	        this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

	        var i,
	            newPoints = [];

	        for (i = 0; i < len; i++) {
	            if (markers[i]) {
	                newPoints.push(points[i]);
	            }
	        }
	        return newPoints;
	    },

	    _simplifyDPStep: function(points, markers, sqTolerance, first, last) {
	        var maxSqDist = 0,
	            index, i, sqDist;

	        for (i = first + 1; i < last; i++) {
	            sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

	            if (sqDist > maxSqDist) {
	                index = i;
	                maxSqDist = sqDist;
	            }
	        }

	        if (maxSqDist > sqTolerance) {
	            markers[index] = 1;
	            this._simplifyDPStep(points, markers, sqTolerance, first, index);
	            this._simplifyDPStep(points, markers, sqTolerance, index, last);
	        }
	    },

	    _reducePoints: function(points, sqTolerance) {
	        var reducedPoints = [points[0]];

	        for (var i = 1, prev = 0, len = points.length; i < len; i++) {
	            if (this._sqDist(points[i], points[prev]) > sqTolerance) {
	                reducedPoints.push(points[i]);
	                prev = i;
	            }
	        }
	        if (prev < len - 1) {
	            reducedPoints.push(points[len - 1]);
	        }
	        return reducedPoints;
	    },

	    clipSegment: function(a, b, bounds, useLastCode, round) {
	        var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
	            codeB = this._getBitCode(b, bounds),
	            codeOut, p, newCode;

	        this._lastCode = codeB;

	        while (true) {
	            if (!(codeA | codeB)) {
	                return [a, b];
	            }
	            if (codeA & codeB) {
	                return false;
	            }
	            codeOut = codeA || codeB;
	            p = this._getEdgeIntersection(a, b, codeOut, bounds, round);
	            newCode = this._getBitCode(p, bounds);

	            if (codeOut === codeA) {
	                a = p;
	                codeA = newCode;
	            } else {
	                b = p;
	                codeB = newCode;
	            }
	        }
	    },

	    _getEdgeIntersection: function(a, b, code, bounds, round) {
	        var dx = b.x - a.x,
	            dy = b.y - a.y,
	            min = bounds.min,
	            max = bounds.max,
	            x, y;

	        if (code & 8) { // top
	            x = a.x + dx * (max.y - a.y) / dy;
	            y = max.y;
	        } else if (code & 4) { // bottom
	            x = a.x + dx * (min.y - a.y) / dy;
	            y = min.y;
	        } else if (code & 2) { // right
	            x = max.x;
	            y = a.y + dy * (max.x - a.x) / dx;
	        } else if (code & 1) { // left
	            x = min.x;
	            y = a.y + dy * (min.x - a.x) / dx;
	        }

	        return new Point$1(x, y, round);
	    },

	    _getBitCode: function(p, bounds) {
	        var code = 0;

	        if (p.x < bounds.min.x) {
	            code |= 1;
	        } else if (p.x > bounds.max.x) {
	            code |= 2;
	        }
	        if (p.y < bounds.min.y) {
	            code |= 4;
	        } else if (p.y > bounds.max.y) {
	            code |= 8;
	        }
	        return code;
	    },

	    _sqDist: function(p1, p2) {
	        var dx = p2.x - p1.x,
	            dy = p2.y - p1.y;
	        return dx * dx + dy * dy;
	    },

	    _sqClosestPointOnSegment: function(p, p1, p2, sqDist) {
	        var x = p1.x,
	            y = p1.y,
	            dx = p2.x - x,
	            dy = p2.y - y,
	            dot = dx * dx + dy * dy,
	            t;

	        if (dot > 0) {
	            t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

	            if (t > 1) {
	                x = p2.x;
	                y = p2.y;
	            } else if (t > 0) {
	                x += dx * t;
	                y += dy * t;
	            }
	        }

	        dx = p.x - x;
	        dy = p.y - y;

	        return sqDist ? dx * dx + dy * dy : new Point$1(x, y);
	    }
	};

	function simplify(points, tolerance) {
	    return LineUtil.simplify(points, tolerance);
	}

	function pointToSegmentDistance$1(p, p1, p2) {
	    return LineUtil.pointToSegmentDistance(p, p1, p2);
	}

	function closestPointOnSegment(p, p1, p2) {
	    return LineUtil.closestPointOnSegment(p, p1, p2);
	}

	function clipSegment(a, b, bounds, useLastCode, round) {
	    return LineUtil.clipSegment(a, b, bounds, useLastCode, round);
	}

	function polylineCenter(latlngs, crs) {
		var i, halfDist, segDist, dist, p1, p2, ratio, center;

		if (!latlngs || latlngs.length === 0) {
			throw new Error('latlngs not passed');
		}

		if (!isFlat$2(latlngs)) {
			console.warn('latlngs are not flat! Only the first ring will be used');
			latlngs = latlngs[0];
		}

		var centroidLatLng = toLatLng([0, 0]);
		var bounds = toLatLngBounds(latlngs);
		var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
		if (areaBounds < 1700) {
			centroidLatLng = centroid(latlngs);
		}

		var len = latlngs.length;
		var points = [];
		for (i = 0; i < len; i++) {
			var latlng = toLatLng(latlngs[i]);
			points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
		}

		for (i = 0, halfDist = 0; i < len - 1; i++) {
			halfDist += points[i].distanceTo(points[i + 1]) / 2;
		}

		if (halfDist === 0) {
			center = points[0];
		} else {
			for (i = 0, dist = 0; i < len - 1; i++) {
				p1 = points[i];
				p2 = points[i + 1];
				segDist = p1.distanceTo(p2);
				dist += segDist;

				if (dist > halfDist) {
					ratio = (dist - halfDist) / segDist;
					center = [
						p2.x - ratio * (p2.x - p1.x),
						p2.y - ratio * (p2.y - p1.y)
					];
					break;
				}
			}
		}

		var latlngCenter = crs.unproject(toPoint(center));
		return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
	}

	function isFlat$2(latlngs) {
		return !isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
	}

	const Polyline = Path.extend({
	    options: {
	        smoothFactor: 1.0,
	        noClip: false
	    },

	    initialize: function(latlngs, options) {
	        setOptions$1(this, options);
	        this._setLatLngs(latlngs);
	    },

	    getLatLngs: function() {
	        return this._latlngs;
	    },

	    setLatLngs: function(latlngs) {
	        this._setLatLngs(latlngs);
	        return this.redraw();
	    },

	    isEmpty: function() {
	        return !this._latlngs.length;
	    },

	    closestLayerPoint: function(p) {
	        var minDistance = Infinity,
	            minPoint = null,
	            closest = _sqClosestPointOnSegment,
	            p1, p2;

	        for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
	            var points = this._parts[j];
	            for (var i = 1, len = points.length; i < len; i++) {
	                p1 = points[i - 1];
	                p2 = points[i];

	                var sqDist = closest(p, p1, p2, true);

	                if (sqDist < minDistance) {
	                    minDistance = sqDist;
	                    minPoint = closest(p, p1, p2);
	                }
	            }
	        }
	        if (minPoint) {
	            minPoint.distance = Math.sqrt(minDistance);
	        }
	        return minPoint;
	    },

	    getCenter: function() {
	        if (!this._map) {
	            throw new Error('Must add layer to map before using getCenter()');
	        }
	        return polylineCenter(this._defaultShape(), this._map.options.crs);
	    },

	    getBounds: function() {
	        return this._bounds;
	    },

	    addLatLng: function(latlng, latlngs) {
	        latlngs = latlngs || this._defaultShape();
	        latlng = toLatLng$1(latlng);
	        latlngs.push(latlng);
	        this._bounds.extend(latlng);
	        return this.redraw();
	    },

	    _setLatLngs: function(latlngs) {
	        this._bounds = new LatLngBounds$1();
	        this._latlngs = this._convertLatLngs(latlngs);
	    },

	    _defaultShape: function() {
	        return isFlat$2(this._latlngs) ? this._latlngs : this._latlngs[0];
	    },

	    _convertLatLngs: function(latlngs) {
	        var result = [],
	            flat = isFlat$2(latlngs);

	        for (var i = 0, len = latlngs.length; i < len; i++) {
	            if (flat) {
	                result[i] = toLatLng$1(latlngs[i]);
	                this._bounds.extend(result[i]);
	            } else {
	                result[i] = this._convertLatLngs(latlngs[i]);
	            }
	        }

	        return result;
	    },

	    _project: function() {
	        var pxBounds = new Bounds();
	        this._rings = [];
	        this._projectLatlngs(this._latlngs, this._rings, pxBounds);

	        if (this._bounds.isValid() && pxBounds.isValid()) {
	            this._rawPxBounds = pxBounds;
	            this._updateBounds();
	        }
	    },

	    _updateBounds: function() {
	        var w = this._clickTolerance(),
	            p = new Point$1(w, w);
	        if (!this._rawPxBounds) {
	            return;
	        }
	        this._pxBounds = new Bounds([
	            this._rawPxBounds.min.subtract(p),
	            this._rawPxBounds.max.add(p)
	        ]);
	    },

	    _projectLatlngs: function(latlngs, result, projectedBounds) {
	        var flat = latlngs[0] instanceof LatLng$1,
	            len = latlngs.length,
	            i, ring;

	        if (flat) {
	            ring = [];
	            for (i = 0; i < len; i++) {
	                ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
	                projectedBounds.extend(ring[i]);
	            }
	            result.push(ring);
	        } else {
	            for (i = 0; i < len; i++) {
	                this._projectLatlngs(latlngs[i], result, projectedBounds);
	            }
	        }
	    },

	    _clipPoints: function() {
	        var bounds = this._renderer._bounds;

	        this._parts = [];
	        if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
	            return;
	        }

	        if (this.options.noClip) {
	            this._parts = this._rings;
	            return;
	        }

	        var parts = this._parts,
	            i, j, k, len, len2, segment, points;

	        for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
	            points = this._rings[i];
	            for (j = 0, len2 = points.length; j < len2 - 1; j++) {
	                segment = clipSegment(points[j], points[j + 1], bounds, j, true);
	                if (!segment) {
	                    continue;
	                }

	                parts[k] = parts[k] || [];
	                parts[k].push(segment[0]);

	                if ((segment[1] !== points[j + 1]) || (j === len2 - 2)) {
	                    parts[k].push(segment[1]);
	                    k++;
	                }
	            }
	        }
	    },

	    _simplifyPoints: function() {
	        var parts = this._parts,
	            tolerance = this.options.smoothFactor;

	        for (var i = 0, len = parts.length; i < len; i++) {
	            parts[i] = simplify(parts[i], tolerance);
	        }
	    },

	    _update: function() {
	        if (!this._map) {
	            return;
	        }

	        this._clipPoints();
	        this._simplifyPoints();
	        this._updatePath();
	    },

	    _updatePath: function() {
	        this._renderer._updatePoly(this);
	    },

	    _containsPoint: function(p, closed) {
	        var i, j, k, len, len2, part,
	            w = this._clickTolerance();

	        if (!this._pxBounds || !this._pxBounds.contains(p)) {
	            return false;
	        }

	        for (i = 0, len = this._parts.length; i < len; i++) {
	            part = this._parts[i];

	            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
	                if (!closed && (j === 0)) {
	                    continue;
	                }

	                if (pointToSegmentDistance(p, part[k], part[j]) <= w) {
	                    return true;
	                }
	            }
	        }
	        return false;
	    }
	});

	function polyline(latlngs, options) {
	    return new Polyline(latlngs, options);
	}

	Polyline._flat = isFlat$2;

	const PolyUtil = {
	    clipPolygon: function(points, bounds, round) {
	        var clippedPoints,
	            i, j, k,
	            a, b,
	            len, p,
	            lu = LineUtil;

	        if (!points || points.length === 0) {
	            return [];
	        }

	        points = lu.simplify(points, 0);
	        len = points.length;

	        if (len <= 2) {
	            return points;
	        }

	        var inside = function(p) {
	            return bounds.contains(p);
	        };

	        for (i = 0; i < len - 1; i++) {
	            if (inside(points[i]) && inside(points[i + 1])) {
	                continue;
	            }
	            clippedPoints = [];
	            for (j = 0; j < len; j++) {
	                k = (j + 1) % len;
	                a = points[j];
	                b = points[k];

	                if (inside(a)) {
	                    clippedPoints.push(a);
	                }

	                if (inside(a) !== inside(b)) {
	                    p = lu._getEdgeIntersection(b, a, lu._getBitCode(b, bounds), bounds, round);
	                    clippedPoints.push(p);
	                }
	            }
	            points = clippedPoints;
	            len = points.length;
	        }

	        return points;
	    },

	    pointToPolygonDist: function(p, polygon) {
	        var min = Infinity,
	            i, j,
	            dist;

	        for (i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
	            dist = pointToSegmentDistance$1(p, polygon[i], polygon[j]);
	            if (dist < min) {
	                min = dist;
	            }
	        }
	        return min;
	    }
	};

	function clipPolygon(points, bounds, round) {
	    return PolyUtil.clipPolygon(points, bounds, round);
	}

	function polygonCenter(latlngs, crs) {
		var i, j, p1, p2, f, area, x, y, center;

		if (!latlngs || latlngs.length === 0) {
			throw new Error('latlngs not passed');
		}

		if (!isFlat$1(latlngs)) {
			console.warn('latlngs are not flat! Only the first ring will be used');
			latlngs = latlngs[0];
		}

		var centroidLatLng = toLatLng([0, 0]);
		var bounds = toLatLngBounds(latlngs);
		var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
		if (areaBounds < 1700) {
			centroidLatLng = centroid$1(latlngs);
		}

		var len = latlngs.length;
		var points = [];
		for (i = 0; i < len; i++) {
			var latlng = toLatLng(latlngs[i]);
			points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
		}

		area = x = y = 0;

		for (i = 0, j = len - 1; i < len; j = i++) {
			p1 = points[i];
			p2 = points[j];

			f = p1.y * p2.x - p2.y * p1.x;
			x += (p1.x + p2.x) * f;
			y += (p1.y + p2.y) * f;
			area += f * 3;
		}

		if (area === 0) {
			center = points[0];
		} else {
			center = [x / area, y / area];
		}
		var latlngCenter = crs.unproject(toPoint(center));
		return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
	}

	function centroid$1(coords) {
		var latSum = 0;
		var lngSum = 0;
		var len = 0;
		for (var i = 0; i < coords.length; i++) {
			var latlng = toLatLng(coords[i]);
			latSum += latlng.lat;
			lngSum += latlng.lng;
			len++;
		}
		return toLatLng([latSum / len, lngSum / len]);
	}

	function isFlat$1(latlngs) {
		return !isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
	}

	const Polygon = Polyline.extend({
	    options: {
	        fill: true
	    },

	    isEmpty: function() {
	        return !this._latlngs.length || !this._latlngs[0].length;
	    },

	    getCenter: function() {
	        if (!this._map) {
	            throw new Error('Must add layer to map before using getCenter()');
	        }
	        return polygonCenter(this._defaultShape(), this._map.options.crs);
	    },

	    _convertLatLngs: function(latlngs) {
	        var result = Polyline.prototype._convertLatLngs.call(this, latlngs),
	            len = result.length;

	        if (len >= 2 && result[0] instanceof LatLng$1 && result[0].equals(result[len - 1])) {
	            result.pop();
	        }
	        return result;
	    },

	    _setLatLngs: function(latlngs) {
	        Polyline.prototype._setLatLngs.call(this, latlngs);
	        if (isFlat$2(this._latlngs)) {
	            this._latlngs = [this._latlngs];
	        }
	    },

	    _defaultShape: function() {
	        return isFlat$2(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
	    },

	    _clipPoints: function() {
	        var bounds = this._renderer._bounds,
	            w = this.options.weight,
	            p = new Point$1(w, w);

	        bounds = new Bounds(bounds.min.subtract(p), bounds.max.add(p));

	        this._parts = [];
	        if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
	            return;
	        }

	        if (this.options.noClip) {
	            this._parts = this._rings;
	            return;
	        }

	        for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
	            clipped = clipPolygon(this._rings[i], bounds, true);
	            if (clipped.length) {
	                this._parts.push(clipped);
	            }
	        }
	    },

	    _updatePath: function() {
	        this._renderer._updatePoly(this, true);
	    },

	    _containsPoint: function(p) {
	        var inside = false,
	            part, p1, p2, i, j, k, len, len2;

	        if (!this._pxBounds || !this._pxBounds.contains(p)) {
	            return false;
	        }

	        for (i = 0, len = this._parts.length; i < len; i++) {
	            part = this._parts[i];

	            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
	                p1 = part[j];
	                p2 = part[k];

	                if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
	                    inside = !inside;
	                }
	            }
	        }

	        return inside || Polyline.prototype._containsPoint.call(this, p, true);
	    }
	});

	function polygon(latlngs, options) {
	    return new Polygon(latlngs, options);
	}

	const Rectangle = Polygon.extend({
	    initialize: function(latLngBounds, options) {
	        Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
	    },

	    setBounds: function(latLngBounds) {
	        return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
	    },

	    _boundsToLatLngs: function(latLngBounds) {
	        latLngBounds = toLatLngBounds$1(latLngBounds);
	        return [
	            latLngBounds.getSouthWest(),
	            latLngBounds.getNorthWest(),
	            latLngBounds.getNorthEast(),
	            latLngBounds.getSouthEast()
	        ];
	    }
	});

	function rectangle(latLngBounds, options) {
	    return new Rectangle(latLngBounds, options);
	}

	const LayerGroup = Layer.extend({
	    initialize: function(layers, options) {
	        setOptions$1(this, options);

	        this._layers = {};

	        var i, len;

	        if (layers) {
	            for (i = 0, len = layers.length; i < len; i++) {
	                this.addLayer(layers[i]);
	            }
	        }
	    },

	    addLayer: function(layer) {
	        var id = this.getLayerId(layer);

	        this._layers[id] = layer;

	        if (this._map) {
	            this._map.addLayer(layer);
	        }

	        return this;
	    },

	    removeLayer: function(layer) {
	        var id = layer in this._layers ? layer : this.getLayerId(layer);

	        if (this._map && this._layers[id]) {
	            this._map.removeLayer(this._layers[id]);
	        }

	        delete this._layers[id];

	        return this;
	    },

	    hasLayer: function(layer) {
	        var layerId = typeof layer === 'number' ? layer : this.getLayerId(layer);
	        return layerId in this._layers;
	    },

	    clearLayers: function() {
	        return this.eachLayer(this.removeLayer, this);
	    },

	    invoke: function(methodName) {
	        var args = Array.prototype.slice.call(arguments, 1),
	            i, layer;

	        for (i in this._layers) {
	            layer = this._layers[i];

	            if (layer[methodName]) {
	                layer[methodName].apply(layer, args);
	            }
	        }

	        return this;
	    },

	    onAdd: function(map) {
	        this.eachLayer(map.addLayer, map);
	    },

	    onRemove: function(map) {
	        this.eachLayer(map.removeLayer, map);
	    },

	    eachLayer: function(method, context) {
	        for (var i in this._layers) {
	            method.call(context, this._layers[i]);
	        }
	        return this;
	    },

	    getLayer: function(id) {
	        return this._layers[id];
	    },

	    getLayers: function() {
	        var layers = [];
	        this.eachLayer(layers.push, layers);
	        return layers;
	    },

	    setZIndex: function(zIndex) {
	        return this.invoke('setZIndex', zIndex);
	    },

	    getLayerId: function(layer) {
	        return stamp(layer);
	    }
	});

	function layerGroup(layers, options) {
	    return new LayerGroup(layers, options);
	}

	const FeatureGroup$1 = LayerGroup.extend({
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
	        var bounds = new LatLngBounds$1();

	        for (var id in this._layers) {
	            var layer = this._layers[id];
	            bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
	        }
	        return bounds;
	    }
	});

	function featureGroup(layers, options) {
	    return new FeatureGroup$1(layers, options);
	}

	const GeoJSON = FeatureGroup$1.extend({
	    initialize: function(geojson, options) {
	        setOptions$1(this, options);

	        this._layers = {};

	        if (geojson) {
	            this.addData(geojson);
	        }
	    },

	    addData: function(geojson) {
	        var features = isArray$1(geojson) ? geojson : geojson.features,
	            i, len, feature;

	        if (features) {
	            for (i = 0, len = features.length; i < len; i++) {
	                feature = features[i];
	                if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
	                    this.addData(feature);
	                }
	            }
	            return this;
	        }

	        var options = this.options;

	        if (options.filter && !options.filter(geojson)) {
	            return this;
	        }

	        var layer = geometryToLayer(geojson, options);
	        if (!layer) {
	            return this;
	        }
	        layer.feature = asFeature(geojson);

	        layer.defaultOptions = layer.options;
	        this.resetStyle(layer);

	        if (options.onEachFeature) {
	            options.onEachFeature(geojson, layer);
	        }

	        return this.addLayer(layer);
	    },

	    resetStyle: function(layer) {
	        if (layer === undefined) {
	            return this.eachLayer(this.resetStyle, this);
	        }
	        layer.options = extend({}, layer.defaultOptions);
	        this._setLayerStyle(layer, this.options.style);
	        return this;
	    },

	    setStyle: function(style) {
	        return this.eachLayer(function(layer) {
	            this._setLayerStyle(layer, style);
	        }, this);
	    },

	    _setLayerStyle: function(layer, style) {
	        if (layer.setStyle) {
	            if (typeof style === 'function') {
	                style = style(layer.feature);
	            }
	            layer.setStyle(style);
	        }
	    }
	});

	function geometryToLayer(geojson, options) {

	    var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
	        coords = geometry ? geometry.coordinates : null,
	        layers = [],
	        pointToLayer = options && options.pointToLayer,
	        _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng,
	        latlng, latlngs, i, len;

	    if (!coords && !geometry) {
	        return null;
	    }

	    switch (geometry.type) {
	        case 'Point':
	            latlng = _coordsToLatLng(coords);
	            return _pointToLayer(pointToLayer, geojson, latlng, options);

	        case 'MultiPoint':
	            for (i = 0, len = coords.length; i < len; i++) {
	                latlng = _coordsToLatLng(coords[i]);
	                layers.push(_pointToLayer(pointToLayer, geojson, latlng, options));
	            }
	            return new FeatureGroup$1(layers);

	        case 'LineString':
	        case 'MultiLineString':
	            latlngs = coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
	            return new Polyline(latlngs, options);

	        case 'Polygon':
	        case 'MultiPolygon':
	            latlngs = coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
	            return new Polygon(latlngs, options);

	        case 'GeometryCollection':
	            for (i = 0, len = geometry.geometries.length; i < len; i++) {
	                var geoLayer = geometryToLayer({
	                    geometry: geometry.geometries[i],
	                    type: 'Feature',
	                    properties: geojson.properties
	                }, options);

	                if (geoLayer) {
	                    layers.push(geoLayer);
	                }
	            }
	            return new FeatureGroup$1(layers);

	        case 'FeatureCollection':
	            for (i = 0, len = geometry.features.length; i < len; i++) {
	                var featureLayer = geometryToLayer(geometry.features[i], options);
	                if (featureLayer) {
	                    layers.push(featureLayer);
	                }
	            }
	            return new FeatureGroup$1(layers);

	        default:
	            throw new Error('Invalid GeoJSON object.');
	    }
	}

	function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
	    return pointToLayerFn ?
	        pointToLayerFn(geojson, latlng) :
	        new Marker(latlng, options && options.markersInheritOptions && options);
	}

	function coordsToLatLng(coords) {
	    return new LatLng(coords[1], coords[0], coords[2]);
	}

	function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
	    var latlngs = [];

	    for (var i = 0, len = coords.length, latlng; i < len; i++) {
	        latlng = levelsDeep ?
	            coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng) :
	            (_coordsToLatLng || coordsToLatLng)(coords[i]);

	        latlngs.push(latlng);
	    }

	    return latlngs;
	}

	function latLngToCoords(latlng, precision) {
	    latlng = toLatLng$1(latlng);
	    return latlng.alt !== undefined ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
	}

	function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
	    var coords = [];

	    for (var i = 0, len = latlngs.length; i < len; i++) {
	        coords.push(levelsDeep ?
	            latLngsToCoords(latlngs[i], isFlat(latlngs[i]) ? 0 : levelsDeep - 1, closed, precision) :
	            latLngToCoords(latlngs[i], precision));
	    }

	    if (!levelsDeep && closed && coords.length > 0) {
	        coords.push(coords[0].slice());
	    }

	    return coords;
	}

	function getFeature(layer, newGeometry) {
	    return layer.feature ?
	        extend({}, layer.feature, {
	            geometry: newGeometry
	        }) :
	        asFeature(newGeometry);
	}

	function asFeature(geojson) {
	    if (geojson.type === 'Feature' || geojson.type === 'FeatureCollection') {
	        return geojson;
	    }

	    return {
	        type: 'Feature',
	        properties: {},
	        geometry: geojson
	    };
	}

	const PointToGeoJSON = {
	    toGeoJSON: function(precision) {
	        return getFeature(this, {
	            type: 'Point',
	            coordinates: latLngToCoords(this.getLatLng(), precision)
	        });
	    }
	};

	Marker.include(PointToGeoJSON);
	Circle.include(PointToGeoJSON);
	CircleMarker.include(PointToGeoJSON);

	Polyline.include({
	    toGeoJSON: function(precision) {
	        var multi = !isFlat(this._latlngs);

	        var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);

	        return getFeature(this, {
	            type: (multi ? 'Multi' : '') + 'LineString',
	            coordinates: coords
	        });
	    }
	});

	Polygon.include({
	    toGeoJSON: function(precision) {
	        var holes = !isFlat(this._latlngs),
	            multi = holes && !isFlat(this._latlngs[0]);

	        var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);

	        if (!holes) {
	            coords = [coords];
	        }

	        return getFeature(this, {
	            type: (multi ? 'Multi' : '') + 'Polygon',
	            coordinates: coords
	        });
	    }
	});

	LayerGroup.include({
	    toMultiPoint: function(precision) {
	        var coords = [];

	        this.eachLayer(function(layer) {
	            coords.push(layer.toGeoJSON(precision).geometry.coordinates);
	        });

	        return getFeature(this, {
	            type: 'MultiPoint',
	            coordinates: coords
	        });
	    },

	    toGeoJSON: function(precision) {

	        var type = this.feature && this.feature.geometry && this.feature.geometry.type;

	        if (type === 'MultiPoint') {
	            return this.toMultiPoint(precision);
	        }

	        var isGeometryCollection = type === 'GeometryCollection',
	            jsons = [];

	        this.eachLayer(function(layer) {
	            if (layer.toGeoJSON) {
	                var json = layer.toGeoJSON(precision);
	                if (isGeometryCollection) {
	                    jsons.push(json.geometry);
	                } else {
	                    var feature = asFeature(json);
	                    if (feature.type === 'FeatureCollection') {
	                        jsons.push.apply(jsons, feature.features);
	                    } else {
	                        jsons.push(feature);
	                    }
	                }
	            }
	        });

	        if (isGeometryCollection) {
	            return getFeature(this, {
	                geometries: jsons,
	                type: 'GeometryCollection'
	            });
	        }

	        return {
	            type: 'FeatureCollection',
	            features: jsons
	        };
	    }
	});

	function geoJSON(geojson, options) {
	    return new GeoJSON(geojson, options);
	}

	const geoJson = geoJSON;

	const ImageOverlay = Layer.extend({
	    options: {
	        opacity: 1,
	        alt: '',
	        interactive: false,
	        crossOrigin: false,
	        errorOverlayUrl: '',
	        zIndex: 1,
	        className: ''
	    },

	    initialize: function(url, bounds, options) {
	        this._url = url;
	        this._bounds = toLatLngBounds$1(bounds);

	        setOptions$1(this, options);
	    },

	    onAdd: function() {
	        if (!this._image) {
	            this._initImage();

	            if (this.options.opacity < 1) {
	                this._updateOpacity();
	            }
	        }

	        if (this.options.interactive) {
	            addClass$1(this._image, 'atlas-interactive');
	            this.addInteractiveTarget(this._image);
	        }

	        this.getPane().appendChild(this._image);
	        this._reset();
	    },

	    onRemove: function() {
	        remove(this._image);
	        if (this.options.interactive) {
	            this.removeInteractiveTarget(this._image);
	        }
	    },

	    setOpacity: function(opacity) {
	        this.options.opacity = opacity;
	        if (this._image) {
	            this._updateOpacity();
	        }
	        return this;
	    },

	    setStyle: function(styleOpts) {
	        if (styleOpts.opacity) {
	            this.setOpacity(styleOpts.opacity);
	        }
	        return this;
	    },

	    bringToFront: function() {
	        if (this._map) {
	            toFront$1(this._image);
	        }
	        return this;
	    },

	    bringToBack: function() {
	        if (this._map) {
	            toBack$1(this._image);
	        }
	        return this;
	    },

	    setUrl: function(url) {
	        this._url = url;

	        if (this._image) {
	            this._image.src = url;
	        }
	        return this;
	    },

	    setBounds: function(bounds) {
	        this._bounds = toLatLngBounds$1(bounds);
	        if (this._map) {
	            this._reset();
	        }
	        return this;
	    },

	    getEvents: function() {
	        var events = {
	            zoom: this._reset,
	            viewreset: this._reset
	        };

	        if (this._zoomAnimated) {
	            events.zoomanim = this._animateZoom;
	        }

	        return events;
	    },

	    setZIndex: function(value) {
	        this.options.zIndex = value;
	        this._updateZIndex();
	        return this;
	    },

	    getBounds: function() {
	        return this._bounds;
	    },

	    getElement: function() {
	        return this._image;
	    },

	    _initImage: function() {
	        var wasElementSupplied = this._url.tagName === 'IMG';
	        var img = this._image = wasElementSupplied ? this._url : create('img');

	        addClass$1(img, 'atlas-image-layer');
	        if (this._zoomAnimated) {
	            addClass$1(img, 'atlas-zoom-animated');
	        }
	        if (this.options.className) {
	            addClass$1(img, this.options.className);
	        }

	        img.onselectstart = falseFn;
	        img.onmousemove = falseFn;

	        img.onload = bind$1(this.fire, this, 'load');
	        img.onerror = bind$1(this._overlayOnError, this, 'error');

	        if (this.options.crossOrigin || this.options.crossOrigin === '') {
	            img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
	        }

	        if (this.options.zIndex) {
	            this._updateZIndex();
	        }

	        if (wasElementSupplied) {
	            this._url = img.src;
	            return;
	        }

	        img.src = this._url;
	        img.alt = this.options.alt;
	    },

	    _animateZoom: function(e) {
	        var scale = this._map.getZoomScale(e.zoom),
	            offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;

	        setTransform(this._image, offset, scale);
	    },

	    _reset: function() {
	        var image = this._image,
	            bounds = new Bounds(
	                this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
	                this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
	            size = bounds.getSize();

	        setPosition$1(image, bounds.min);

	        image.style.width = size.x + 'px';
	        image.style.height = size.y + 'px';
	    },

	    _updateOpacity: function() {
	        setOpacity$1(this._image, this.options.opacity);
	    },

	    _updateZIndex: function() {
	        if (this._image && this.options.zIndex !== undefined && this.options.zIndex !== null) {
	            this._image.style.zIndex = this.options.zIndex;
	        }
	    },

	    _overlayOnError: function() {
	        this.fire('error');
	        var errorUrl = this.options.errorOverlayUrl;
	        if (errorUrl && this._url !== errorUrl) {
	            this._url = errorUrl;
	            this._image.src = errorUrl;
	        }
	    },

	    getCenter: function() {
	        return this._bounds.getCenter();
	    }
	});

	function imageOverlay(url, bounds, options) {
	    return new ImageOverlay(url, bounds, options);
	}

	const SVGOverlay = ImageOverlay.extend({
	    _initImage: function() {
	        var el = this._image = this._url;

	        addClass$1(el, 'atlas-image-layer');
	        if (this._zoomAnimated) {
	            addClass$1(el, 'atlas-zoom-animated');
	        }
	        if (this.options.className) {
	            addClass$1(el, this.options.className);
	        }

	        el.onselectstart = falseFn;
	        el.onmousemove = falseFn;
	    }
	});

	function svgOverlay(el, bounds, options) {
	    return new SVGOverlay(el, bounds, options);
	}

	const GridLayer = Layer.extend({
	    options: {
	        tileSize: 256,
	        opacity: 1,
	        updateWhenIdle: mobile,
	        updateWhenZooming: true,
	        updateInterval: 200,
	        zIndex: 1,
	        bounds: null,
	        minZoom: 0,
	        maxZoom: undefined,
	        maxNativeZoom: undefined,
	        minNativeZoom: undefined,
	        noWrap: false,
	        pane: 'tilePane',
	        className: '',
	        keepBuffer: 2
	    },

	    initialize: function(options) {
	        setOptions$1(this, options);
	    },

	    onAdd: function() {
	        this._initContainer();

	        this._levels = {};
	        this._tiles = {};

	        this._resetView();
	    },

	    beforeAdd: function(map) {
	        map._addZoomLimit(this);
	    },

	    onRemove: function(map) {
	        this._removeAllTiles();
	        remove(this._container);
	        map._removeZoomLimit(this);
	        this._container = null;
	        this._tileZoom = undefined;
	    },

	    bringToFront: function() {
	        if (this._map) {
	            toFront$1(this._container);
	            this._setAutoZIndex(Math.max);
	        }
	        return this;
	    },

	    bringToBack: function() {
	        if (this._map) {
	            toBack$1(this._container);
	            this._setAutoZIndex(Math.min);
	        }
	        return this;
	    },

	    getContainer: function() {
	        return this._container;
	    },

	    setOpacity: function(opacity) {
	        this.options.opacity = opacity;
	        this._updateOpacity();
	        return this;
	    },

	    setZIndex: function(zIndex) {
	        this.options.zIndex = zIndex;
	        this._updateZIndex();

	        return this;
	    },

	    isLoading: function() {
	        return this._loading;
	    },

	    redraw: function() {
	        if (this._map) {
	            this._removeAllTiles();
	            var tileZoom = this._clampZoom(this._map.getZoom());
	            if (tileZoom !== this._tileZoom) {
	                this._tileZoom = tileZoom;
	                this._updateLevels();
	            }
	            this._update();
	        }
	        return this;
	    },

	    getEvents: function() {
	        var events = {
	            viewprereset: this._invalidateAll,
	            viewreset: this._resetView,
	            zoom: this._resetView,
	            moveend: this._onMoveEnd
	        };

	        if (!this.options.updateWhenIdle) {
	            if (!this._onMove) {
	                this._onMove = throttle(this._onMoveEnd, this.options.updateInterval, this);
	            }
	            events.move = this._onMove;
	        }

	        if (this._zoomAnimated) {
	            events.zoomanim = this._animateZoom;
	        }

	        return events;
	    },

	    createTile: function() {
	        return document.createElement('div');
	    },

	    getTileSize: function() {
	        var s = this.options.tileSize;
	        return s instanceof Point$1 ? s : new Point$1(s, s);
	    },

	    _updateZIndex: function() {
	        if (this._container && this.options.zIndex !== undefined && this.options.zIndex !== null) {
	            this._container.style.zIndex = this.options.zIndex;
	        }
	    },

	    _setAutoZIndex: function(compare) {
	        var layers = this.getPane().children,
	            edgeZIndex = -compare(-Infinity, Infinity);

	        for (var i = 0, len = layers.length, zIndex; i < len; i++) {
	            zIndex = layers[i].style.zIndex;
	            if (layers[i] !== this._container && zIndex) {
	                edgeZIndex = compare(edgeZIndex, +zIndex);
	            }
	        }

	        if (isFinite(edgeZIndex)) {
	            this.options.zIndex = edgeZIndex + compare(-1, 1);
	            this._updateZIndex();
	        }
	    },

	    _updateOpacity: function() {
	        if (!this._map) {
	            return;
	        }

	        if (ielt9) {
	            return;
	        }

	        setOpacity$1(this._container, this.options.opacity);

	        var now = +new Date(),
	            nextFrame = false,
	            willPrune = false;

	        for (var key in this._tiles) {
	            var tile = this._tiles[key];
	            if (!tile.current || !tile.loaded) {
	                continue;
	            }

	            var fade = Math.min(1, (now - tile.loaded) / 200);

	            setOpacity$1(tile.el, fade);
	            if (fade < 1) {
	                nextFrame = true;
	            } else {
	                if (tile.active) {
	                    willPrune = true;
	                } else {
	                    this._onOpaqueTile(tile);
	                }
	                tile.active = true;
	            }
	        }

	        if (willPrune && !this._noPrune) {
	            this._pruneTiles();
	        }

	        if (nextFrame) {
	            cancelAnimFrame$1(this._fadeFrame);
	            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
	        }
	    },

	    _onOpaqueTile: falseFn,

	    _initContainer: function() {
	        if (this._container) {
	            return;
	        }

	        this._container = create('div', 'atlas-layer ' + (this.options.className || ''));
	        this._updateZIndex();

	        if (this.options.opacity < 1) {
	            this._updateOpacity();
	        }

	        this.getPane().appendChild(this._container);
	    },

	    _updateLevels: function() {
	        var zoom = this._tileZoom,
	            maxZoom = this.options.maxZoom;

	        if (zoom === undefined) {
	            return undefined;
	        }

	        for (var z in this._levels) {
	            z = Number(z);
	            if (this._levels[z].el.children.length || z === zoom) {
	                this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
	                this._onUpdateLevel(z);
	            } else {
	                remove(this._levels[z].el);
	                this._removeTilesAtZoom(z);
	                this._onRemoveLevel(z);
	                delete this._levels[z];
	            }
	        }

	        var level = this._levels[zoom],
	            map = this._map;

	        if (!level) {
	            level = this._levels[zoom] = {};

	            level.el = create('div', 'atlas-tile-container atlas-zoom-animated', this._container);
	            level.el.style.zIndex = maxZoom;

	            level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
	            level.zoom = zoom;

	            this._setZoomTransform(level, map.getCenter(), map.getZoom());

	            falseFn(level.el.offsetWidth);

	            this._onCreateLevel(level);
	        }

	        this._level = level;

	        return level;
	    },

	    _onUpdateLevel: falseFn,
	    _onRemoveLevel: falseFn,
	    _onCreateLevel: falseFn,

	    _pruneTiles: function() {
	        if (!this._map) {
	            return;
	        }

	        var key, tile;

	        var zoom = this._map.getZoom();
	        if (zoom > this.options.maxZoom ||
	            zoom < this.options.minZoom) {
	            this._removeAllTiles();
	            return;
	        }

	        for (key in this._tiles) {
	            tile = this._tiles[key];
	            tile.retain = tile.current;
	        }

	        for (key in this._tiles) {
	            tile = this._tiles[key];
	            if (tile.current && !tile.active) {
	                var coords = tile.coords;
	                if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
	                    this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
	                }
	            }
	        }

	        for (key in this._tiles) {
	            if (!this._tiles[key].retain) {
	                this._removeTile(key);
	            }
	        }
	    },

	    _removeTilesAtZoom: function(zoom) {
	        for (var key in this._tiles) {
	            if (this._tiles[key].coords.z !== zoom) {
	                continue;
	            }
	            this._removeTile(key);
	        }
	    },

	    _removeAllTiles: function() {
	        for (var key in this._tiles) {
	            this._removeTile(key);
	        }
	    },

	    _invalidateAll: function() {
	        for (var z in this._levels) {
	            remove(this._levels[z].el);
	            this._onRemoveLevel(Number(z));
	            delete this._levels[z];
	        }
	        this._removeAllTiles();

	        this._tileZoom = undefined;
	    },

	    _retainParent: function(x, y, z, minZoom) {
	        var x2 = Math.floor(x / 2),
	            y2 = Math.floor(y / 2),
	            z2 = z - 1,
	            coords2 = new Point$1(+x2, +y2);
	        coords2.z = +z2;

	        var key = this._tileCoordsToKey(coords2),
	            tile = this._tiles[key];

	        if (tile && tile.active) {
	            tile.retain = true;
	            return true;

	        } else if (tile && tile.loaded) {
	            tile.retain = true;
	        }

	        if (z2 > minZoom) {
	            return this._retainParent(x2, y2, z2, minZoom);
	        }

	        return false;
	    },

	    _retainChildren: function(x, y, z, maxZoom) {
	        for (var i = 2 * x; i < 2 * x + 2; i++) {
	            for (var j = 2 * y; j < 2 * y + 2; j++) {
	                var coords = new Point$1(i, j);
	                coords.z = z + 1;

	                var key = this._tileCoordsToKey(coords),
	                    tile = this._tiles[key];

	                if (tile && tile.active) {
	                    tile.retain = true;
	                    continue;

	                } else if (tile && tile.loaded) {
	                    tile.retain = true;
	                }

	                if (z + 1 < maxZoom) {
	                    this._retainChildren(i, j, z + 1, maxZoom);
	                }
	            }
	        }
	    },

	    _resetView: function(e) {
	        var animating = e && (e.pinch || e.flyTo);
	        this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
	    },

	    _animateZoom: function(e) {
	        this._setView(e.center, e.zoom, true, e.noUpdate);
	    },

	    _clampZoom: function(zoom) {
	        var options = this.options;

	        if (undefined !== options.minNativeZoom && zoom < options.minNativeZoom) {
	            return options.minNativeZoom;
	        }

	        if (undefined !== options.maxNativeZoom && options.maxNativeZoom < zoom) {
	            return options.maxNativeZoom;
	        }

	        return zoom;
	    },

	    _setView: function(center, zoom, noPrune, noUpdate) {
	        var tileZoom = Math.round(zoom);
	        if ((this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
	            (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)) {
	            tileZoom = undefined;
	        } else {
	            tileZoom = this._clampZoom(tileZoom);
	        }

	        var tileZoomChanged = this.options.updateWhenZooming && (tileZoom !== this._tileZoom);

	        if (!noUpdate || tileZoomChanged) {

	            this._tileZoom = tileZoom;

	            if (this._abortLoading) {
	                this._abortLoading();
	            }

	            this._updateLevels();
	            this._resetGrid();

	            if (tileZoom !== undefined) {
	                this._update(center);
	            }

	            if (!noPrune) {
	                this._pruneTiles();
	            }

	            this._noPrune = !!noPrune;
	        }

	        this._setZoomTransforms(center, zoom);
	    },

	    _setZoomTransforms: function(center, zoom) {
	        for (var i in this._levels) {
	            this._setZoomTransform(this._levels[i], center, zoom);
	        }
	    },

	    _setZoomTransform: function(level, center, zoom) {
	        var scale = this._map.getZoomScale(zoom, level.zoom),
	            translate = level.origin.multiplyBy(scale)
	            .subtract(this._map._getNewPixelOrigin(center, zoom)).round();

	        if (any3d) {
	            setTransform(level.el, translate, scale);
	        } else {
	            setPosition$1(level.el, translate);
	        }
	    },

	    _resetGrid: function() {
	        var map = this._map,
	            crs = map.options.crs,
	            tileSize = this._tileSize = this.getTileSize(),
	            tileZoom = this._tileZoom;

	        var bounds = this._map.getPixelWorldBounds(this._tileZoom);
	        if (bounds) {
	            this._globalTileRange = this._pxBoundsToTileRange(bounds);
	        }

	        this._wrapX = crs.wrapLng && !this.options.noWrap && [
	            Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
	            Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
	        ];
	        this._wrapY = crs.wrapLat && !this.options.noWrap && [
	            Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
	            Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
	        ];
	    },

	    _onMoveEnd: function() {
	        if (!this._map || this._map._animatingZoom) {
	            return;
	        }
	        this._update();
	    },

	    _getTiledPixelBounds: function(center) {
	        var map = this._map,
	            mapZoom = map._animatingZoom ? Math.max(map._animateToZoom, map.getZoom()) : map.getZoom(),
	            scale = map.getZoomScale(mapZoom, this._tileZoom),
	            pixelCenter = map.project(center, this._tileZoom).floor(),
	            halfSize = map.getSize().divideBy(scale * 2);

	        return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
	    },

	    _update: function(center) {
	        var map = this._map;
	        if (!map) {
	            return;
	        }
	        var zoom = this._clampZoom(map.getZoom());

	        if (center === undefined) {
	            center = map.getCenter();
	        }
	        if (this._tileZoom === undefined) {
	            return;
	        }

	        var pixelBounds = this._getTiledPixelBounds(center),
	            tileRange = this._pxBoundsToTileRange(pixelBounds),
	            tileCenter = tileRange.getCenter(),
	            queue = [],
	            margin = this.options.keepBuffer,
	            noPruneRange = new Bounds(tileRange.getBottomLeft().subtract([margin, -margin]),
	                tileRange.getTopRight().add([margin, -margin]));

	        if (!(isFinite(tileRange.min.x) &&
	                isFinite(tileRange.min.y) &&
	                isFinite(tileRange.max.x) &&
	                isFinite(tileRange.max.y))) {
	            throw new Error('Attempted to load an infinite number of tiles');
	        }

	        for (var key in this._tiles) {
	            var c = this._tiles[key].coords;
	            if (c.z !== this._tileZoom || !noPruneRange.contains(new Point$1(c.x, c.y))) {
	                this._tiles[key].current = false;
	            }
	        }

	        if (Math.abs(zoom - this._tileZoom) > 1) {
	            this._setView(center, zoom);
	            return;
	        }

	        for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
	            for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
	                var coords = new Point$1(i, j);
	                coords.z = this._tileZoom;

	                if (!this._isValidTile(coords)) {
	                    continue;
	                }

	                var tile = this._tiles[this._tileCoordsToKey(coords)];
	                if (tile) {
	                    tile.current = true;
	                } else {
	                    queue.push(coords);
	                }
	            }
	        }

	        queue.sort(function(a, b) {
	            return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
	        });

	        if (queue.length !== 0) {
	            if (!this._loading) {
	                this._loading = true;
	                this.fire('loading');
	            }

	            var fragment = document.createDocumentFragment();

	            for (i = 0; i < queue.length; i++) {
	                this._addTile(queue[i], fragment);
	            }

	            this._level.el.appendChild(fragment);
	        }
	    },

	    _isValidTile: function(coords) {
	        var crs = this._map.options.crs;

	        if (!crs.infinite) {
	            var bounds = this._globalTileRange;
	            if ((!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
	                (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))) {
	                return false;
	            }
	        }

	        if (!this.options.bounds) {
	            return true;
	        }
	        var tileBounds = this._tileCoordsToBounds(coords);
	        return toLatLngBounds$1(this.options.bounds).overlaps(tileBounds);
	    },

	    _keyToBounds: function(key) {
	        return this._tileCoordsToBounds(this._keyToTileCoords(key));
	    },

	    _tileCoordsToNwSe: function(coords) {
	        var map = this._map,
	            tileSize = this.getTileSize(),
	            nwPoint = coords.scaleBy(tileSize),
	            sePoint = nwPoint.add(tileSize),
	            nw = map.unproject(nwPoint, coords.z),
	            se = map.unproject(sePoint, coords.z);
	        return [nw, se];
	    },

	    _tileCoordsToBounds: function(coords) {
	        var bp = this._tileCoordsToNwSe(coords),
	            bounds = new LatLngBounds(bp[0], bp[1]);

	        if (!this.options.noWrap) {
	            bounds = this._map.wrapLatLngBounds(bounds);
	        }
	        return bounds;
	    },

	    _tileCoordsToKey: function(coords) {
	        return coords.x + ':' + coords.y + ':' + coords.z;
	    },

	    _keyToTileCoords: function(key) {
	        var k = key.split(':'),
	            coords = new Point$1(+k[0], +k[1]);
	        coords.z = +k[2];
	        return coords;
	    },

	    _removeTile: function(key) {
	        var tile = this._tiles[key];
	        if (!tile) {
	            return;
	        }

	        remove(tile.el);

	        delete this._tiles[key];

	        this.fire('tileunload', {
	            tile: tile.el,
	            coords: this._keyToTileCoords(key)
	        });
	    },

	    _initTile: function(tile) {
	        addClass$1(tile, 'atlas-tile');

	        var tileSize = this.getTileSize();
	        tile.style.width = tileSize.x + 'px';
	        tile.style.height = tileSize.y + 'px';

	        tile.onselectstart = falseFn;
	        tile.onmousemove = falseFn;

	        if (ielt9 && this.options.opacity < 1) {
	            setOpacity$1(tile, this.options.opacity);
	        }
	    },

	    _addTile: function(coords, container) {
	        var tilePos = this._getTilePos(coords),
	            key = this._tileCoordsToKey(coords);

	        var tile = this.createTile(this._wrapCoords(coords), bind$1(this._tileReady, this, coords));

	        this._initTile(tile);

	        if (this.createTile.length < 2) {
	            requestAnimFrame(bind$1(this._tileReady, this, coords, null, tile));
	        }

	        setPosition$1(tile, tilePos);

	        this._tiles[key] = {
	            el: tile,
	            coords: coords,
	            current: true
	        };

	        container.appendChild(tile);
	        this.fire('tileloadstart', {
	            tile: tile,
	            coords: coords
	        });
	    },

	    _tileReady: function(coords, err, tile) {
	        if (err) {
	            this.fire('tileerror', {
	                error: err,
	                tile: tile,
	                coords: coords
	            });
	        }

	        var key = this._tileCoordsToKey(coords);

	        tile = this._tiles[key];
	        if (!tile) {
	            return;
	        }

	        tile.loaded = +new Date();
	        if (this._map._fadeAnimated) {
	            setOpacity$1(tile.el, 0);
	            cancelAnimFrame$1(this._fadeFrame);
	            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
	        } else {
	            tile.active = true;
	            this._pruneTiles();
	        }

	        if (!err) {
	            addClass$1(tile.el, 'atlas-tile-loaded');
	            this.fire('tileload', {
	                tile: tile.el,
	                coords: coords
	            });
	        }

	        if (this._noTilesToLoad()) {
	            this._loading = false;
	            this.fire('load');

	            if (ielt9 || !this._map._fadeAnimated) {
	                requestAnimFrame(this._pruneTiles, this);
	            } else {
	                setTimeout(bind$1(this._pruneTiles, this), 250);
	            }
	        }
	    },

	    _getTilePos: function(coords) {
	        return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
	    },

	    _wrapCoords: function(coords) {
	        var newCoords = new Point$1(
	            this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x,
	            this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y);
	        newCoords.z = coords.z;
	        return newCoords;
	    },

	    _pxBoundsToTileRange: function(bounds) {
	        var tileSize = this.getTileSize();
	        return new Bounds(
	            bounds.min.unscaleBy(tileSize).floor(),
	            bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]));
	    },

	    _noTilesToLoad: function() {
	        for (var key in this._tiles) {
	            if (!this._tiles[key].loaded) {
	                return false;
	            }
	        }
	        return true;
	    }
	});

	function gridLayer(options) {
	    return new GridLayer(options);
	}

	const TileLayer = GridLayer.extend({
	    options: {
	        minZoom: 0,
	        maxZoom: 18,
	        subdomains: 'abc',
	        errorTileUrl: '',
	        zoomOffset: 0,
	        tms: false,
	        zoomReverse: false,
	        detectRetina: false,
	        crossOrigin: false,
	        referrerPolicy: false
	    },

	    initialize: function(url, options) {
	        this._url = url;

	        options = setOptions$1(this, options);

	        if (options.detectRetina && retina && options.maxZoom > 0) {
	            options.tileSize = Math.floor(options.tileSize / 2);

	            if (!options.zoomReverse) {
	                options.zoomOffset++;
	                options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
	            } else {
	                options.zoomOffset--;
	                options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
	            }

	            options.minZoom = Math.max(0, options.minZoom);
	        } else if (!options.zoomReverse) {
	            options.maxZoom = Math.max(options.minZoom, options.maxZoom);
	        } else {
	            options.minZoom = Math.min(options.maxZoom, options.minZoom);
	        }

	        if (typeof options.subdomains === 'string') {
	            options.subdomains = options.subdomains.split('');
	        }

	        this.on('tileunload', this._onTileRemove);
	    },

	    setUrl: function(url, noRedraw) {
	        if (this._url === url && noRedraw === undefined) {
	            noRedraw = true;
	        }

	        this._url = url;

	        if (!noRedraw) {
	            this.redraw();
	        }
	        return this;
	    },

	    createTile: function(coords, done) {
	        var tile = document.createElement('img');

	        on(tile, 'load', bind$1(this._tileOnLoad, this, done, tile));
	        on(tile, 'error', bind$1(this._tileOnError, this, done, tile));

	        if (this.options.crossOrigin || this.options.crossOrigin === '') {
	            tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
	        }

	        if (typeof this.options.referrerPolicy === 'string') {
	            tile.referrerPolicy = this.options.referrerPolicy;
	        }

	        tile.alt = '';
	        tile.src = this.getTileUrl(coords);

	        return tile;
	    },

	    getTileUrl: function(coords) {
	        var data = {
	            r: retina ? '@2x' : '',
	            s: this._getSubdomain(coords),
	            x: coords.x,
	            y: coords.y,
	            z: this._getZoomForUrl()
	        };
	        if (this._map && !this._map.options.crs.infinite) {
	            var invertedY = this._globalTileRange.max.y - coords.y;
	            if (this.options.tms) {
	                data['y'] = invertedY;
	            }
	            data['-y'] = invertedY;
	        }

	        return template(this._url, extend(data, this.options));
	    },

	    _tileOnLoad: function(done, tile) {
	        if (ielt9) {
	            setTimeout(bind$1(done, this, null, tile), 0);
	        } else {
	            done(null, tile);
	        }
	    },

	    _tileOnError: function(done, tile, e) {
	        var errorUrl = this.options.errorTileUrl;
	        if (errorUrl && tile.getAttribute('src') !== errorUrl) {
	            tile.src = errorUrl;
	        }
	        done(e, tile);
	    },

	    _onTileRemove: function(e) {
	        e.tile.onload = null;
	    },

	    _getZoomForUrl: function() {
	        var zoom = this._tileZoom,
	            maxZoom = this.options.maxZoom,
	            zoomReverse = this.options.zoomReverse,
	            zoomOffset = this.options.zoomOffset;

	        if (zoomReverse) {
	            zoom = maxZoom - zoom;
	        }

	        return zoom + zoomOffset;
	    },

	    _getSubdomain: function(tilePoint) {
	        var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
	        return this.options.subdomains[index];
	    },

	    _abortLoading: function() {
	        var i, tile;
	        for (i in this._tiles) {
	            if (this._tiles[i].coords.z !== this._tileZoom) {
	                tile = this._tiles[i].el;

	                tile.onload = falseFn;
	                tile.onerror = falseFn;
	                if (!tile.complete) {
	                    tile.src = emptyImageUrl;
	                    var coords = this._tiles[i].coords;
	                    remove(tile);
	                    delete this._tiles[i];
	                    this.fire('tileabort', {
	                        tile: tile,
	                        coords: coords
	                    });
	                }
	            }
	        }
	    },

	    _removeTile: function(key) {
	        var tile = this._tiles[key];
	        if (!tile) {
	            return;
	        }

	        tile.el.setAttribute('src', emptyImageUrl);

	        return GridLayer.prototype._removeTile.call(this, key);
	    },

	    _tileReady: function(coords, err, tile) {
	        if (!this._map || (tile && tile.getAttribute('src') === emptyImageUrl)) {
	            return;
	        }

	        return GridLayer.prototype._tileReady.call(this, coords, err, tile);
	    }
	});

	function tileLayer$1(url, options) {
	    return new TileLayer(url, options);
	}

	// Placeholder for EPSG4326
	const EPSG4326 = {};

	const TileLayerWMS = TileLayer.extend({
	    defaultWmsParams: {
	        service: 'WMS',
	        request: 'GetMap',
	        layers: '',
	        styles: '',
	        format: 'image/jpeg',
	        transparent: false,
	        version: '1.1.1'
	    },

	    options: {
	        crs: null,
	        uppercase: false
	    },

	    initialize: function(url, options) {
	        this._url = url;

	        var wmsParams = extend({}, this.defaultWmsParams);

	        for (var i in options) {
	            if (!(i in this.options)) {
	                wmsParams[i] = options[i];
	            }
	        }

	        options = setOptions$1(this, options);

	        var realRetina = options.detectRetina && retina ? 2 : 1;
	        var tileSize = this.getTileSize();
	        wmsParams.width = tileSize.x * realRetina;
	        wmsParams.height = tileSize.y * realRetina;

	        this.wmsParams = wmsParams;
	    },

	    onAdd: function(map) {
	        this._crs = this.options.crs || map.options.crs;
	        this._wmsVersion = parseFloat(this.wmsParams.version);

	        var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
	        this.wmsParams[projectionKey] = this._crs.code;

	        TileLayer.prototype.onAdd.call(this, map);
	    },

	    getTileUrl: function(coords) {
	        var tileBounds = this._tileCoordsToNwSe(coords),
	            crs = this._crs,
	            bounds = toBounds(crs.project(tileBounds[0]), crs.project(tileBounds[1])),
	            min = bounds.min,
	            max = bounds.max,
	            bbox = (this._wmsVersion >= 1.3 && this._crs === EPSG4326 ? [min.y, min.x, max.y, max.x] : [min.x, min.y, max.x, max.y]).join(','),
	            url = TileLayer.prototype.getTileUrl.call(this, coords);
	        return url +
	            getParamString(this.wmsParams, url, this.options.uppercase) +
	            (this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
	    },

	    setParams: function(params, noRedraw) {
	        extend(this.wmsParams, params);

	        if (!noRedraw) {
	            this.redraw();
	        }

	        return this;
	    }
	});

	function tileLayerWMS(url, options) {
	    return new TileLayerWMS(url, options);
	}

	TileLayer.WMS = TileLayerWMS;
	tileLayer.wms = tileLayerWMS;

	const Control = Class.extend({
	    options: {
	        position: 'topright'
	    },

	    initialize: function(options) {
	        setOptions$1(this, options);
	    },

	    getPosition: function() {
	        return this.options.position;
	    },

	    setPosition: function(position) {
	        var map = this._map;

	        if (map) {
	            map.removeControl(this);
	        }

	        this.options.position = position;

	        if (map) {
	            map.addControl(this);
	        }

	        return this;
	    },

	    getContainer: function() {
	        return this._container;
	    },

	    addTo: function(map) {
	        this.remove();
	        this._map = map;

	        var container = this._container = this.onAdd(map),
	            pos = this.getPosition(),
	            corner = map._controlCorners[pos];

	        addClass$1(container, 'atlas-control');

	        if (pos.indexOf('bottom') !== -1) {
	            corner.insertBefore(container, corner.firstChild);
	        } else {
	            corner.appendChild(container);
	        }

	        this._map.on('unload', this.remove, this);

	        return this;
	    },

	    remove: function() {
	        if (!this._map) {
	            return this;
	        }

	        remove(this._container);

	        if (this.onRemove) {
	            this.onRemove(this._map);
	        }

	        this._map.off('unload', this.remove, this);
	        this._map = null;

	        return this;
	    },

	    _refocusOnMap: function(e) {
	        if (this._map && e && e.screenX > 0 && e.screenY > 0) {
	            this._map.getContainer().focus();
	        }
	    }
	});

	function control(options) {
	    return new Control(options);
	}

	Map.include({
	    addControl: function(control) {
	        control.addTo(this);
	        return this;
	    },

	    removeControl: function(control) {
	        control.remove();
	        return this;
	    },

	    _initControlPos: function() {
	        var corners = this._controlCorners = {},
	            l = 'atlas-',
	            container = this._controlContainer =
	            create('div', l + 'control-container', this._container);

	        function createCorner(vSide, hSide) {
	            var className = l + vSide + ' ' + l + hSide;
	            corners[vSide + hSide] = create('div', className, container);
	        }

	        createCorner('top', 'left');
	        createCorner('top', 'right');
	        createCorner('bottom', 'left');
	        createCorner('bottom', 'right');
	    },

	    _clearControlPos: function() {
	        for (var i in this._controlCorners) {
	            remove(this._controlCorners[i]);
	        }
	        remove(this._controlContainer);
	        delete this._controlCorners;
	        delete this._controlContainer;
	    }
	});

	const Zoom = Control.extend({
	    options: {
	        position: 'topleft',
	        zoomInText: '<span aria-hidden="true">+</span>',
	        zoomInTitle: 'Zoom in',
	        zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
	        zoomOutTitle: 'Zoom out'
	    },

	    onAdd: function(map) {
	        var zoomName = 'atlas-control-zoom',
	            container = create('div', zoomName + ' atlas-bar'),
	            options = this.options;

	        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
	            zoomName + '-in', container, this._zoomIn);
	        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
	            zoomName + '-out', container, this._zoomOut);

	        this._updateDisabled();
	        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

	        return container;
	    },

	    onRemove: function(map) {
	        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	    },

	    disable: function() {
	        this._disabled = true;
	        this._updateDisabled();
	        return this;
	    },

	    enable: function() {
	        this._disabled = false;
	        this._updateDisabled();
	        return this;
	    },

	    _zoomIn: function(e) {
	        if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
	            this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
	        }
	    },

	    _zoomOut: function(e) {
	        if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
	            this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
	        }
	    },

	    _createButton: function(html, title, className, container, fn) {
	        var link = create('a', className, container);
	        link.innerHTML = html;
	        link.href = '#';
	        link.title = title;

	        link.setAttribute('role', 'button');
	        link.setAttribute('aria-label', title);

	        disableClickPropagation(link);
	        on(link, 'click', stop$1);
	        on(link, 'click', fn, this);
	        on(link, 'click', this._refocusOnMap, this);

	        return link;
	    },

	    _updateDisabled: function() {
	        var map = this._map,
	            className = 'atlas-disabled';

	        removeClass$1(this._zoomInButton, className);
	        removeClass$1(this._zoomOutButton, className);
	        this._zoomInButton.setAttribute('aria-disabled', 'false');
	        this._zoomOutButton.setAttribute('aria-disabled', 'false');

	        if (this._disabled || map._zoom === map.getMinZoom()) {
	            addClass$1(this._zoomOutButton, className);
	            this._zoomOutButton.setAttribute('aria-disabled', 'true');
	        }
	        if (this._disabled || map._zoom === map.getMaxZoom()) {
	            addClass$1(this._zoomInButton, className);
	            this._zoomInButton.setAttribute('aria-disabled', 'true');
	        }
	    }
	});

	Map.mergeOptions({
	    zoomControl: true
	});

	Map.addInitHook(function() {
	    if (this.options.zoomControl) {
	        this.zoomControl = new Zoom();
	        this.addControl(this.zoomControl);
	    }
	});

	function zoom(options) {
	    return new Zoom(options);
	}

	const Scale = Control.extend({
	    options: {
	        position: 'bottomleft',
	        maxWidth: 100,
	        metric: true,
	        imperial: true
	    },

	    onAdd: function(map) {
	        var className = 'atlas-control-scale',
	            container = create('div', className),
	            options = this.options;

	        this._addScales(options, className + '-line', container);

	        map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	        map.whenReady(this._update, this);

	        return container;
	    },

	    onRemove: function(map) {
	        map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	    },

	    _addScales: function(options, className, container) {
	        if (options.metric) {
	            this._mScale = create('div', className, container);
	        }
	        if (options.imperial) {
	            this._iScale = create('div', className, container);
	        }
	    },

	    _update: function() {
	        var map = this._map,
	            y = map.getSize().y / 2;

	        var maxMeters = map.distance(
	            map.containerPointToLatLng([0, y]),
	            map.containerPointToLatLng([this.options.maxWidth, y]));

	        this._updateScales(maxMeters);
	    },

	    _updateScales: function(maxMeters) {
	        if (this.options.metric && maxMeters) {
	            this._updateMetric(maxMeters);
	        }
	        if (this.options.imperial && maxMeters) {
	            this._updateImperial(maxMeters);
	        }
	    },

	    _updateMetric: function(maxMeters) {
	        var meters = this._getRoundNum(maxMeters),
	            label = meters < 1000 ? meters + ' m' : (meters / 1000) + ' km';

	        this._updateScale(this._mScale, label, meters / maxMeters);
	    },

	    _updateImperial: function(maxMeters) {
	        var maxFeet = maxMeters * 3.2808399,
	            maxMiles, miles, feet;

	        if (maxFeet > 5280) {
	            maxMiles = maxFeet / 5280;
	            miles = this._getRoundNum(maxMiles);
	            this._updateScale(this._iScale, miles + ' mi', miles / maxMiles);

	        } else {
	            feet = this._getRoundNum(maxFeet);
	            this._updateScale(this._iScale, feet + ' ft', feet / maxFeet);
	        }
	    },

	    _updateScale: function(scale, text, ratio) {
	        scale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
	        scale.innerHTML = text;
	    },

	    _getRoundNum: function(num) {
	        var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
	            d = num / pow10;

	        d = d >= 10 ? 10 :
	            d >= 5 ? 5 :
	            d >= 3 ? 3 :
	            d >= 2 ? 2 : 1;

	        return pow10 * d;
	    }
	});

	function scale(options) {
	    return new Scale(options);
	}

	var MoroccanFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="atlas-attribution-flag"><rect width="12" height="8" fill="#c1272d"/><path d="M6 2l1.176 3.608H3.824L5 3.392 6 2z" fill="#006233"/></svg>';

	const Attribution = Control.extend({
	    options: {
	        position: 'bottomright',
	        prefix: '<a href="https://atlasjs.com" title="A JavaScript library for interactive maps">' + (inlineSvg ? MoroccanFlag + ' ' : '') + 'Atlas</a>'
	    },

	    initialize: function(options) {
	        setOptions$1(this, options);
	        this._attributions = {};
	    },

	    onAdd: function(map) {
	        map.attributionControl = this;
	        this._container = create('div', 'atlas-control-attribution');
	        disableClickPropagation(this._container);

	        for (var i in map._layers) {
	            if (map._layers[i].getAttribution) {
	                this.addAttribution(map._layers[i].getAttribution());
	            }
	        }

	        this._update();
	        map.on('layeradd', this._addAttribution, this);

	        return this._container;
	    },

	    onRemove: function(map) {
	        map.off('layeradd', this._addAttribution, this);
	    },

	    _addAttribution: function(ev) {
	        if (ev.layer.getAttribution) {
	            this.addAttribution(ev.layer.getAttribution());
	            ev.layer.once('remove', function() {
	                this.removeAttribution(ev.layer.getAttribution());
	            }, this);
	        }
	    },

	    setPrefix: function(prefix) {
	        this.options.prefix = prefix;
	        this._update();
	        return this;
	    },

	    addAttribution: function(text) {
	        if (!text) {
	            return this;
	        }
	        if (!this._attributions[text]) {
	            this._attributions[text] = 0;
	        }
	        this._attributions[text]++;
	        this._update();
	        return this;
	    },

	    removeAttribution: function(text) {
	        if (!text) {
	            return this;
	        }
	        if (this._attributions[text]) {
	            this._attributions[text]--;
	            this._update();
	        }
	        return this;
	    },

	    _update: function() {
	        if (!this._map) {
	            return;
	        }

	        var attribs = [];
	        for (var i in this._attributions) {
	            if (this._attributions[i]) {
	                attribs.push(i);
	            }
	        }

	        var prefixAndAttribs = [];
	        if (this.options.prefix) {
	            prefixAndAttribs.push(this.options.prefix);
	        }
	        if (attribs.length) {
	            prefixAndAttribs.push(attribs.join(', '));
	        }

	        this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
	    }
	});

	Map.mergeOptions({
	    attributionControl: true
	});

	Map.addInitHook(function() {
	    if (this.options.attributionControl) {
	        new Attribution().addTo(this);
	    }
	});

	function attribution(options) {
	    return new Attribution(options);
	}

	const Layers = Control.extend({
	    options: {
	        collapsed: true,
	        position: 'topright',
	        autoZIndex: true,
	        hideSingleBase: false,
	        sortLayers: false,
	        sortFunction: function(layerA, layerB, nameA, nameB) {
	            return nameA < nameB ? -1 : (nameB < nameA ? 1 : 0);
	        }
	    },

	    initialize: function(baseLayers, overlays, options) {
	        setOptions$1(this, options);

	        this._layerControlInputs = [];
	        this._layers = [];
	        this._lastZIndex = 0;
	        this._handlingClick = false;
	        this._preventClick = false;

	        for (var i in baseLayers) {
	            this._addLayer(baseLayers[i], i);
	        }

	        for (i in overlays) {
	            this._addLayer(overlays[i], i, true);
	        }
	    },

	    onAdd: function(map) {
	        this._initLayout();
	        this._update();

	        this._map = map;
	        map.on('zoomend', this._checkDisabledLayers, this);

	        for (var i = 0; i < this._layers.length; i++) {
	            this._layers[i].layer.on('add remove', this._onLayerChange, this);
	        }

	        return this._container;
	    },

	    addTo: function(map) {
	        Control.prototype.addTo.call(this, map);
	        return this._expandIfNotCollapsed();
	    },

	    onRemove: function() {
	        this._map.off('zoomend', this._checkDisabledLayers, this);

	        for (var i = 0; i < this._layers.length; i++) {
	            this._layers[i].layer.off('add remove', this._onLayerChange, this);
	        }
	    },

	    addBaseLayer: function(layer, name) {
	        this._addLayer(layer, name);
	        return (this._map) ? this._update() : this;
	    },

	    addOverlay: function(layer, name) {
	        this._addLayer(layer, name, true);
	        return (this._map) ? this._update() : this;
	    },

	    removeLayer: function(layer) {
	        layer.off('add remove', this._onLayerChange, this);

	        var obj = this._getLayer(stamp(layer));
	        if (obj) {
	            this._layers.splice(this._layers.indexOf(obj), 1);
	        }
	        return (this._map) ? this._update() : this;
	    },

	    expand: function() {
	        addClass$1(this._container, 'atlas-control-layers-expanded');
	        this._section.style.height = null;
	        var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
	        if (acceptableHeight < this._section.clientHeight) {
	            addClass$1(this._section, 'atlas-control-layers-scrollbar');
	            this._section.style.height = acceptableHeight + 'px';
	        } else {
	            removeClass$1(this._section, 'atlas-control-layers-scrollbar');
	        }
	        this._checkDisabledLayers();
	        return this;
	    },

	    collapse: function() {
	        removeClass$1(this._container, 'atlas-control-layers-expanded');
	        return this;
	    },

	    _initLayout: function() {
	        var className = 'atlas-control-layers',
	            container = this._container = create('div', className),
	            collapsed = this.options.collapsed;

	        container.setAttribute('aria-haspopup', true);

	        disableClickPropagation(container);
	        disableScrollPropagation$1(container);

	        var section = this._section = create('section', className + '-list');

	        if (collapsed) {
	            this._map.on('click', this.collapse, this);

	            on(container, {
	                mouseenter: this._expandSafely,
	                mouseleave: this.collapse
	            }, this);
	        }

	        var link = this._layersLink = create('a', className + '-toggle', container);
	        link.href = '#';
	        link.title = 'Layers';
	        link.setAttribute('role', 'button');

	        on(link, {
	            keydown: function(e) {
	                if (e.keyCode === 13) {
	                    this._expandSafely();
	                }
	            },
	            click: function(e) {
	                preventDefault(e);
	                this._expandSafely();
	            }
	        }, this);

	        if (!collapsed) {
	            this.expand();
	        }

	        this._baseLayersList = create('div', className + '-base', section);
	        this._separator = create('div', className + '-separator', section);
	        this._overlaysList = create('div', className + '-overlays', section);

	        container.appendChild(section);
	    },

	    _getLayer: function(id) {
	        for (var i = 0; i < this._layers.length; i++) {
	            if (this._layers[i] && stamp(this._layers[i].layer) === id) {
	                return this._layers[i];
	            }
	        }
	    },

	    _addLayer: function(layer, name, overlay) {
	        if (this._map) {
	            layer.on('add remove', this._onLayerChange, this);
	        }

	        this._layers.push({
	            layer: layer,
	            name: name,
	            overlay: overlay
	        });

	        if (this.options.sortLayers) {
	            this._layers.sort(bind$1(function(a, b) {
	                return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
	            }, this));
	        }

	        if (this.options.autoZIndex && layer.setZIndex) {
	            this._lastZIndex++;
	            layer.setZIndex(this._lastZIndex);
	        }

	        this._expandIfNotCollapsed();
	    },

	    _update: function() {
	        if (!this._container) {
	            return this;
	        }

	        empty(this._baseLayersList);
	        empty(this._overlaysList);

	        this._layerControlInputs = [];
	        var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;

	        for (i = 0; i < this._layers.length; i++) {
	            obj = this._layers[i];
	            this._addItem(obj);
	            overlaysPresent = overlaysPresent || obj.overlay;
	            baseLayersPresent = baseLayersPresent || !obj.overlay;
	            baseLayersCount += !obj.overlay ? 1 : 0;
	        }

	        if (this.options.hideSingleBase) {
	            baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
	            this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
	        }

	        this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';

	        return this;
	    },

	    _onLayerChange: function(e) {
	        if (!this._handlingClick) {
	            this._update();
	        }

	        var obj = this._getLayer(stamp(e.target));

	        var type = obj.overlay ?
	            (e.type === 'add' ? 'overlayadd' : 'overlayremove') :
	            (e.type === 'add' ? 'baselayerchange' : null);

	        if (type) {
	            this._map.fire(type, obj);
	        }
	    },

	    _createRadioElement: function(name, checked) {
	        var radioHtml = '<input type="radio" class="atlas-control-layers-selector" name="' +
	            name + '"' + (checked ? ' checked="checked"' : '') + '/>';

	        var radioFragment = document.createElement('div');
	        radioFragment.innerHTML = radioHtml;

	        return radioFragment.firstChild;
	    },

	    _addItem: function(obj) {
	        var label = document.createElement('label'),
	            checked = this._map.hasLayer(obj.layer),
	            input;

	        if (obj.overlay) {
	            input = document.createElement('input');
	            input.type = 'checkbox';
	            input.className = 'atlas-control-layers-selector';
	            input.defaultChecked = checked;
	        } else {
	            input = this._createRadioElement('atlas-base-layers_' + stamp(this), checked);
	        }

	        this._layerControlInputs.push(input);
	        input.layerId = stamp(obj.layer);

	        on(input, 'click', this._onInputClick, this);

	        var name = document.createElement('span');
	        name.innerHTML = ' ' + obj.name;

	        var holder = document.createElement('span');

	        label.appendChild(holder);
	        holder.appendChild(input);
	        holder.appendChild(name);

	        var container = obj.overlay ? this._overlaysList : this._baseLayersList;
	        container.appendChild(label);

	        this._checkDisabledLayers();
	        return label;
	    },

	    _onInputClick: function() {
	        if (this._preventClick) {
	            return;
	        }
	        var inputs = this._layerControlInputs,
	            input, layer;
	        var addedLayers = [],
	            removedLayers = [];

	        this._handlingClick = true;

	        for (var i = inputs.length - 1; i >= 0; i--) {
	            input = inputs[i];
	            layer = this._getLayer(input.layerId).layer;

	            if (input.checked) {
	                addedLayers.push(layer);
	            } else if (!input.checked) {
	                removedLayers.push(layer);
	            }
	        }

	        for (i = 0; i < removedLayers.length; i++) {
	            if (this._map.hasLayer(removedLayers[i])) {
	                this._map.removeLayer(removedLayers[i]);
	            }
	        }
	        for (i = 0; i < addedLayers.length; i++) {
	            if (!this._map.hasLayer(addedLayers[i])) {
	                this._map.addLayer(addedLayers[i]);
	            }
	        }

	        this._handlingClick = false;

	        this._refocusOnMap();
	    },

	    _checkDisabledLayers: function() {
	        var inputs = this._layerControlInputs,
	            input,
	            layer,
	            zoom = this._map.getZoom();

	        for (var i = inputs.length - 1; i >= 0; i--) {
	            input = inputs[i];
	            layer = this._getLayer(input.layerId).layer;

	            input.disabled = (layer.options.minZoom !== undefined && zoom < layer.options.minZoom) ||
	                (layer.options.maxZoom !== undefined && zoom > layer.options.maxZoom);

	        }
	    },

	    _expandIfNotCollapsed: function() {
	        if (this._map && !this.options.collapsed) {
	            this.expand();
	        }
	        return this;
	    },

	    _expandSafely: function() {
	        var section = this._section;
	        this._preventClick = true;
	        on(section, 'click', preventDefault);
	        this.expand();
	        var that = this;
	        setTimeout(function() {
	            off(section, 'click', preventDefault);
	            that._preventClick = false;
	        });
	    }
	});

	function layers(baseLayers, overlays, options) {
	    return new Layers(baseLayers, overlays, options);
	}

	Control.Layers = Layers;
	control.layers = layers;

	const BoxZoom = Handler.extend({
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

	        exports.disableTextSelection();
	        disableImageDrag();

	        this._startPoint = this._map.mouseEventToContainerPoint(e);

	        on(document, {
	            contextmenu: stop$1,
	            mousemove: this._onMouseMove,
	            mouseup: this._onMouseUp,
	            keydown: this._onKeyDown
	        }, this);
	    },

	    _onMouseMove: function(e) {
	        if (!this._moved) {
	            this._moved = true;

	            this._box = create('div', 'atlas-zoom-box', this._container);
	            addClass$1(this._container, 'atlas-crosshair');

	            this._map.fire('boxzoomstart');
	        }

	        this._point = this._map.mouseEventToContainerPoint(e);

	        var bounds = new Bounds(this._point, this._startPoint),
	            size = bounds.getSize();

	        setPosition$1(this._box, bounds.min);

	        this._box.style.width = size.x + 'px';
	        this._box.style.height = size.y + 'px';
	    },

	    _finish: function() {
	        if (this._moved) {
	            remove(this._box);
	            removeClass$1(this._container, 'atlas-crosshair');
	        }

	        exports.enableTextSelection();
	        enableImageDrag();

	        off(document, {
	            contextmenu: stop$1,
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
	        this._resetStateTimeout = setTimeout(bind$1(this._resetState, this), 0);

	        var bounds = new LatLngBounds$1(
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

	const DoubleClickZoom = Handler.extend({
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

	const Keyboard = Handler.extend({
	    keyCodes: {
	        left: [37],
	        right: [39],
	        down: [40],
	        up: [38],
	        zoomIn: [187, 107, 61, 171],
	        zoomOut: [189, 109, 54, 173]
	    },

	    initialize: function(map) {
	        this._map = map;

	        this._setPanDelta(map.options.keyboardPanDelta);
	        this._setZoomDelta(map.options.zoomDelta);
	    },

	    addHooks: function() {
	        var container = this._map._container;

	        if (container.tabIndex <= 0) {
	            container.tabIndex = '0';
	        }

	        on(container, {
	            focus: this._onFocus,
	            blur: this._onBlur,
	            mousedown: this._onMouseDown
	        }, this);

	        this._map.on({
	            focus: this._addHooks,
	            blur: this._removeHooks
	        }, this);
	    },

	    removeHooks: function() {
	        this._removeHooks();

	        off(this._map._container, {
	            focus: this._onFocus,
	            blur: this._onBlur,
	            mousedown: this._onMouseDown
	        }, this);

	        this._map.off({
	            focus: this._addHooks,
	            blur: this._removeHooks
	        }, this);
	    },

	    _onMouseDown: function() {
	        if (this._focused) {
	            return;
	        }

	        var body = document.body,
	            docEl = document.documentElement,
	            top = body.scrollTop || docEl.scrollTop,
	            left = body.scrollLeft || docEl.scrollLeft;

	        this._map._container.focus();

	        window.scrollTo(left, top);
	    },

	    _onFocus: function() {
	        this._focused = true;
	        this._map.fire('focus');
	    },

	    _onBlur: function() {
	        this._focused = false;
	        this._map.fire('blur');
	    },

	    _setPanDelta: function(panDelta) {
	        var keys = this._panKeys = {},
	            codes = this.keyCodes,
	            i, len;

	        for (i = 0, len = codes.left.length; i < len; i++) {
	            keys[codes.left[i]] = [-1 * panDelta, 0];
	        }
	        for (i = 0, len = codes.right.length; i < len; i++) {
	            keys[codes.right[i]] = [panDelta, 0];
	        }
	        for (i = 0, len = codes.down.length; i < len; i++) {
	            keys[codes.down[i]] = [0, panDelta];
	        }
	        for (i = 0, len = codes.up.length; i < len; i++) {
	            keys[codes.up[i]] = [0, -1 * panDelta];
	        }
	    },

	    _setZoomDelta: function(zoomDelta) {
	        var keys = this._zoomKeys = {},
	            codes = this.keyCodes,
	            i, len;

	        for (i = 0, len = codes.zoomIn.length; i < len; i++) {
	            keys[codes.zoomIn[i]] = zoomDelta;
	        }
	        for (i = 0, len = codes.zoomOut.length; i < len; i++) {
	            keys[codes.zoomOut[i]] = -zoomDelta;
	        }
	    },

	    _addHooks: function() {
	        on(document, 'keydown', this._onKeyDown, this);
	    },

	    _removeHooks: function() {
	        off(document, 'keydown', this._onKeyDown, this);
	    },

	    _onKeyDown: function(e) {
	        if (e.altKey || e.ctrlKey || e.metaKey) {
	            return;
	        }

	        var key = e.keyCode,
	            map = this._map,
	            offset;

	        if (key in this._panKeys) {
	            if (!map._panAnim || !map._panAnim._inProgress) {
	                offset = this._panKeys[key];
	                if (e.shiftKey) {
	                    offset = toPoint$1(offset).multiplyBy(3);
	                }

	                if (map.options.maxBounds) {
	                    offset = map._limitOffset(toPoint$1(offset), map.options.maxBounds);
	                }

	                if (map.options.worldCopyJump) {
	                    var newLatLng = map.wrapLatLng(map.unproject(map.project(map.getCenter()).add(offset)));
	                    map.panTo(newLatLng);
	                } else {
	                    map.panBy(offset);
	                }
	            }
	        } else if (key in this._zoomKeys) {
	            map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);

	        } else if (key === 27 && map._popup && map._popup.options.closeOnEscapeKey) {
	            map.closePopup();

	        } else {
	            return;
	        }

	        stop$1(e);
	    }
	});

	Map.addInitHook('addHandler', 'keyboard', Keyboard);

	const ScrollWheelZoom = Handler.extend({
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
	        this._timer = setTimeout(bind$1(this._performZoom, this), left);

	        stop$1(e);
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

	const tapHoldDelay = 600;

	const TapHold = Handler.extend({
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
	        this._startPos = this._newPos = new Point$1(first.clientX, first.clientY);

	        this._holdTimeout = setTimeout(bind$1(function() {
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
	        this._newPos = new Point$1(first.clientX, first.clientY);
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
	    tapHold: touchNative && safari && mobile,
	    tapTolerance: 15
	});

	Map.addInitHook('addHandler', 'tapHold', TapHold);

	const TouchZoom = Handler.extend({
	    addHooks: function() {
	        addClass$1(this._map._container, 'atlas-touch-zoom');
	        on(this._map._container, 'touchstart', this._onTouchStart, this);
	    },

	    removeHooks: function() {
	        removeClass$1(this._map._container, 'atlas-touch-zoom');
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

	        cancelAnimFrame$1(this._animRequest);

	        var moveFn = bind$1(map._move, map, this._center, this._zoom, {
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
	        cancelAnimFrame$1(this._animRequest);
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
	    touchZoom: touch,
	    bounceAtZoomLimits: true
	});

	const Renderer = Layer.extend({
	    options: {
	        padding: 0.1
	    },

	    initialize: function(options) {
	        setOptions$1(this, options);
	        stamp(this);
	        this._layers = this._layers || {};
	    },

	    onAdd: function() {
	        if (!this._container) {
	            this._initContainer();

	            addClass$1(this._container, 'atlas-zoom-animated');
	        }

	        this.getPane().appendChild(this._container);
	        this._update();
	        this.on('update', this._updatePaths, this);
	    },

	    onRemove: function() {
	        this.off('update', this._updatePaths, this);
	        this._destroyContainer();
	    },

	    getEvents: function() {
	        var events = {
	            viewreset: this._reset,
	            zoom: this._onZoom,
	            moveend: this._update,
	            zoomend: this._onZoomEnd
	        };
	        if (this._zoomAnimated) {
	            events.zoomanim = this._onAnimZoom;
	        }
	        return events;
	    },

	    _onAnimZoom: function(ev) {
	        this._updateTransform(ev.center, ev.zoom);
	    },

	    _onZoom: function() {
	        this._updateTransform(this._map.getCenter(), this._map.getZoom());
	    },

	    _updateTransform: function(center, zoom) {
	        var scale = this._map.getZoomScale(zoom, this._zoom),
	            viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
	            currentCenterPoint = this._map.project(this._center, zoom),
	            topLeftOffset = viewHalf.multiplyBy(-scale).add(currentCenterPoint)
	            .subtract(this._map._getNewPixelOrigin(center, zoom));

	        if (any3d) {
	            setTransform(this._container, topLeftOffset, scale);
	        } else {
	            setPosition$1(this._container, topLeftOffset);
	        }
	    },

	    _reset: function() {
	        this._update();
	        this._updateTransform(this._center, this._zoom);

	        for (var id in this._layers) {
	            this._layers[id]._reset();
	        }
	    },

	    _onZoomEnd: function() {
	        for (var id in this._layers) {
	            this._layers[id]._project();
	        }
	    },

	    _updatePaths: function() {
	        for (var id in this._layers) {
	            this._layers[id]._update();
	        }
	    },

	    _update: function() {
	        var p = this.options.padding,
	            size = this._map.getSize(),
	            min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

	        this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());

	        this._center = this._map.getCenter();
	        this._zoom = this._map.getZoom();
	    }
	});

	function pointsToPath(rings, closed) {
	    var str = '',
	        i, j, len, len2, points, p;

	    for (i = 0, len = rings.length; i < len; i++) {
	        points = rings[i];

	        for (j = 0, len2 = points.length; j < len2; j++) {
	            p = points[j];
	            str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
	        }

	        str += closed ? (svg$1 ? 'z' : 'x') : '';
	    }

	    return str || 'M0 0';
	}

	const vmlCreate = (function() {
	    try {
	        document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
	        return function(name) {
	            return document.createElement('<lvml:' + name + ' class="lvml">');
	        };
	    } catch (e) {}
	    return function(name) {
	        return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft-com:vml" class="lvml">');
	    };
	}());

	const SVG = Renderer.extend({
	    _initContainer: function() {
	        this._container = create('svg');
	        this._container.setAttribute('pointer-events', 'none');
	        this._rootGroup = create('g');
	        this._container.appendChild(this._rootGroup);
	    },

	    _destroyContainer: function() {
	        remove(this._container);
	        off(this._container);
	        delete this._container;
	        delete this._rootGroup;
	        delete this._svgSize;
	    },

	    _update: function() {
	        if (this._map._animatingZoom && this._bounds) {
	            return;
	        }

	        Renderer.prototype._update.call(this);

	        var b = this._bounds,
	            size = b.getSize(),
	            container = this._container;

	        if (!this._svgSize || !this._svgSize.equals(size)) {
	            this._svgSize = size;
	            container.setAttribute('width', size.x);
	            container.setAttribute('height', size.y);
	        }

	        setPosition$1(container, b.min);
	        container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));

	        this.fire('update');
	    },

	    _initPath: function(layer) {
	        var path = layer._path = create('path');

	        if (layer.options.className) {
	            addClass$1(path, layer.options.className);
	        }

	        if (layer.options.interactive) {
	            addClass$1(path, 'atlas-interactive');
	        }

	        this._updateStyle(layer);
	        this._layers[stamp(layer)] = layer;
	    },

	    _addPath: function(layer) {
	        if (!this._rootGroup) {
	            this._initContainer();
	        }
	        this._rootGroup.appendChild(layer._path);
	        layer.addInteractiveTarget(layer._path);
	    },

	    _removePath: function(layer) {
	        remove(layer._path);
	        layer.removeInteractiveTarget(layer._path);
	        delete this._layers[stamp(layer)];
	    },

	    _updatePath: function(layer) {
	        layer._project();
	        layer._update();
	    },

	    _updateStyle: function(layer) {
	        var path = layer._path,
	            options = layer.options;

	        if (!path) {
	            return;
	        }

	        if (options.stroke) {
	            path.setAttribute('stroke', options.color);
	            path.setAttribute('stroke-opacity', options.opacity);
	            path.setAttribute('stroke-width', options.weight);
	            path.setAttribute('stroke-linecap', options.lineCap);
	            path.setAttribute('stroke-linejoin', options.lineJoin);

	            if (options.dashArray) {
	                path.setAttribute('stroke-dasharray', options.dashArray);
	            } else {
	                path.removeAttribute('stroke-dasharray');
	            }

	            if (options.dashOffset) {
	                path.setAttribute('stroke-dashoffset', options.dashOffset);
	            } else {
	                path.removeAttribute('stroke-dashoffset');
	            }
	        } else {
	            path.setAttribute('stroke', 'none');
	        }

	        if (options.fill) {
	            path.setAttribute('fill', options.fillColor || options.color);
	            path.setAttribute('fill-opacity', options.fillOpacity);
	            path.setAttribute('fill-rule', options.fillRule || 'evenodd');
	        } else {
	            path.setAttribute('fill', 'none');
	        }
	    },

	    _updatePoly: function(layer, closed) {
	        this._setPath(layer, pointsToPath(layer._parts, closed));
	    },

	    _updateCircle: function(layer) {
	        var p = layer._point,
	            r = Math.max(Math.round(layer._radius), 1),
	            r2 = Math.max(Math.round(layer._radiusY), 1) || r,
	            arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

	        var d = layer._empty() ? 'M0 0' :
	            'M' + (p.x - r) + ',' + p.y +
	            arc + (r * 2) + ',0 ' +
	            arc + (-r * 2) + ',0 ';

	        this._setPath(layer, d);
	    },

	    _setPath: function(layer, path) {
	        layer._path.setAttribute('d', path);
	    },

	    _bringToFront: function(layer) {
	        toFront$1(layer._path);
	    },

	    _bringToBack: function(layer) {
	        toBack$1(layer._path);
	    }
	});

	if (vml) {
	    SVG.include({
	        _initContainer: function() {
	            this._container = create('div', 'atlas-vml-container');
	        },

	        _update: function() {
	            if (this._map._animatingZoom) {
	                return;
	            }
	            Renderer.prototype._update.call(this);
	            this.fire('update');
	        },

	        _initPath: function(layer) {
	            var container = layer._container = vmlCreate('shape');

	            addClass$1(container, 'atlas-vml-shape ' + (this.options.className || ''));

	            container.coordsize = '1 1';

	            layer._path = vmlCreate('path');
	            container.appendChild(layer._path);

	            this._updateStyle(layer);
	            this._layers[stamp(layer)] = layer;
	        },

	        _addPath: function(layer) {
	            var container = layer._container;
	            this._container.appendChild(container);

	            if (layer.options.interactive) {
	                layer.addInteractiveTarget(container);
	            }
	        },

	        _removePath: function(layer) {
	            var container = layer._container;
	            remove(container);
	            layer.removeInteractiveTarget(container);
	            delete this._layers[stamp(layer)];
	        },

	        _updateStyle: function(layer) {
	            var stroke = layer._stroke,
	                fill = layer._fill,
	                options = layer.options,
	                container = layer._container;

	            container.stroked = !!options.stroke;
	            container.filled = !!options.fill;

	            if (options.stroke) {
	                if (!stroke) {
	                    stroke = layer._stroke = vmlCreate('stroke');
	                }
	                container.appendChild(stroke);
	                stroke.weight = options.weight + 'px';
	                stroke.color = options.color;
	                stroke.opacity = options.opacity;

	                if (options.dashArray) {
	                    stroke.dashStyle = isArray$1(options.dashArray) ?
	                        options.dashArray.join(' ') :
	                        options.dashArray.replace(/( *, *)/g, ' ');
	                } else {
	                    stroke.dashStyle = '';
	                }
	                stroke.endcap = options.lineCap.replace('butt', 'flat');
	                stroke.joinstyle = options.lineJoin;

	            } else if (stroke) {
	                container.removeChild(stroke);
	                layer._stroke = null;
	            }

	            if (options.fill) {
	                if (!fill) {
	                    fill = layer._fill = vmlCreate('fill');
	                }
	                container.appendChild(fill);
	                fill.color = options.fillColor || options.color;
	                fill.opacity = options.fillOpacity;

	            } else if (fill) {
	                container.removeChild(fill);
	                layer._fill = null;
	            }
	        },

	        _updateCircle: function(layer) {
	            var p = layer._point.round(),
	                r = Math.round(layer._radius),
	                r2 = Math.round(layer._radiusY || r);

	            this._setPath(layer, layer._empty() ? 'M0 0' :
	                'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + (65535 * 360));
	        },

	        _setPath: function(layer, path) {
	            layer._path.v = path;
	        }
	    });
	}

	function svg(options) {
	    return svg$1 || vml ? new SVG(options) : null;
	}

	const Canvas = Renderer.extend({
	    options: {
	        tolerance: 0
	    },

	    getEvents: function() {
	        var events = Renderer.prototype.getEvents.call(this);
	        events.viewprereset = this._onViewPreReset;
	        return events;
	    },

	    _onViewPreReset: function() {
	        this._postponeUpdatePaths = true;
	    },

	    onAdd: function() {
	        Renderer.prototype.onAdd.call(this);
	        this._draw();
	    },

	    _initContainer: function() {
	        var container = this._container = document.createElement('canvas');

	        on(container, 'mousemove', this._onMouseMove, this);
	        on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);
	        on(container, 'mouseout', this._handleMouseOut, this);
	        container['_atlas_disable_events'] = true;

	        this._ctx = container.getContext('2d');
	    },

	    _destroyContainer: function() {
	        cancelAnimFrame$1(this._redrawRequest);
	        delete this._ctx;
	        remove(this._container);
	        off(this._container);
	        delete this._container;
	    },

	    _updatePaths: function() {
	        if (this._postponeUpdatePaths) {
	            return;
	        }

	        var layer;
	        this._redrawBounds = null;
	        for (var id in this._layers) {
	            layer = this._layers[id];
	            layer._update();
	        }
	        this._redraw();
	    },

	    _update: function() {
	        if (this._map._animatingZoom && this._bounds) {
	            return;
	        }

	        Renderer.prototype._update.call(this);

	        var b = this._bounds,
	            container = this._container,
	            size = b.getSize(),
	            m = retina ? 2 : 1;

	        setPosition$1(container, b.min);

	        container.width = m * size.x;
	        container.height = m * size.y;
	        container.style.width = size.x + 'px';
	        container.style.height = size.y + 'px';

	        if (retina) {
	            this._ctx.scale(2, 2);
	        }

	        this._ctx.translate(-b.min.x, -b.min.y);
	        this.fire('update');
	    },

	    _reset: function() {
	        Renderer.prototype._reset.call(this);

	        if (this._postponeUpdatePaths) {
	            this._postponeUpdatePaths = false;
	            this._updatePaths();
	        }
	    },

	    _initPath: function(layer) {
	        this._updateDashArray(layer);
	        this._layers[stamp(layer)] = layer;

	        var order = layer._order = {
	            layer: layer,
	            prev: this._drawLast,
	            next: null
	        };
	        if (this._drawLast) {
	            this._drawLast.next = order;
	        }
	        this._drawLast = order;
	        this._drawFirst = this._drawFirst || this._drawLast;
	    },

	    _addPath: function(layer) {
	        this._requestRedraw(layer);
	    },

	    _removePath: function(layer) {
	        var order = layer._order;
	        var next = order.next;
	        var prev = order.prev;

	        if (next) {
	            next.prev = prev;
	        } else {
	            this._drawLast = prev;
	        }
	        if (prev) {
	            prev.next = next;
	        } else {
	            this._drawFirst = next;
	        }

	        delete layer._order;

	        delete this._layers[stamp(layer)];

	        this._requestRedraw(layer);
	    },

	    _updatePath: function(layer) {
	        this._extendRedrawBounds(layer);
	        layer._project();
	        layer._update();
	        this._requestRedraw(layer);
	    },

	    _updateStyle: function(layer) {
	        this._updateDashArray(layer);
	        this._requestRedraw(layer);
	    },

	    _updateDashArray: function(layer) {
	        if (typeof layer.options.dashArray === 'string') {
	            var parts = layer.options.dashArray.split(/[, ]+/),
	                dashArray = [],
	                dashValue,
	                i;
	            for (i = 0; i < parts.length; i++) {
	                dashValue = Number(parts[i]);
	                if (isNaN(dashValue)) {
	                    return;
	                }
	                dashArray.push(dashValue);
	            }
	            layer.options._dashArray = dashArray;
	        } else {
	            layer.options._dashArray = layer.options.dashArray;
	        }
	    },

	    _requestRedraw: function(layer) {
	        if (!this._map) {
	            return;
	        }

	        this._extendRedrawBounds(layer);
	        this._redrawRequest = this._redrawRequest || requestAnimFrame(this._redraw, this);
	    },

	    _extendRedrawBounds: function(layer) {
	        if (layer._pxBounds) {
	            var padding = (layer.options.weight || 0) + 1;
	            this._redrawBounds = this._redrawBounds || new Bounds();
	            this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
	            this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
	        }
	    },

	    _redraw: function() {
	        this._redrawRequest = null;

	        if (this._redrawBounds) {
	            this._redrawBounds.min._floor();
	            this._redrawBounds.max._ceil();
	        }

	        this._clear();
	        this._draw();

	        this._redrawBounds = null;
	    },

	    _clear: function() {
	        var bounds = this._redrawBounds;
	        if (bounds) {
	            var size = bounds.getSize();
	            this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
	        } else {
	            this._ctx.save();
	            this._ctx.setTransform(1, 0, 0, 1, 0, 0);
	            this._ctx.clearRect(0, 0, this._container.width, this._container.height);
	            this._ctx.restore();
	        }
	    },

	    _draw: function() {
	        var layer, bounds = this._redrawBounds;
	        this._ctx.save();
	        if (bounds) {
	            var size = bounds.getSize();
	            this._ctx.beginPath();
	            this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
	            this._ctx.clip();
	        }

	        this._drawing = true;

	        for (var order = this._drawFirst; order; order = order.next) {
	            layer = order.layer;
	            if (!bounds || (layer._pxBounds && layer._pxBounds.intersects(bounds))) {
	                layer._updatePath();
	            }
	        }

	        this._drawing = false;

	        this._ctx.restore();
	    },

	    _updatePoly: function(layer, closed) {
	        if (!this._drawing) {
	            return;
	        }

	        var i, j, len2, p,
	            parts = layer._parts,
	            len = parts.length,
	            ctx = this._ctx;

	        if (!len) {
	            return;
	        }

	        ctx.beginPath();

	        for (i = 0; i < len; i++) {
	            for (j = 0, len2 = parts[i].length; j < len2; j++) {
	                p = parts[i][j];
	                ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
	            }
	            if (closed) {
	                ctx.closePath();
	            }
	        }

	        this._fillStroke(ctx, layer);
	    },

	    _updateCircle: function(layer) {
	        if (!this._drawing || layer._empty()) {
	            return;
	        }

	        var p = layer._point,
	            ctx = this._ctx,
	            r = Math.max(Math.round(layer._radius), 1),
	            s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;

	        if (s !== 1) {
	            ctx.save();
	            ctx.scale(1, s);
	        }

	        ctx.beginPath();
	        ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

	        if (s !== 1) {
	            ctx.restore();
	        }

	        this._fillStroke(ctx, layer);
	    },

	    _fillStroke: function(ctx, layer) {
	        var options = layer.options;

	        if (options.fill) {
	            ctx.globalAlpha = options.fillOpacity;
	            ctx.fillStyle = options.fillColor || options.color;
	            ctx.fill(options.fillRule || 'evenodd');
	        }

	        if (options.stroke && options.weight !== 0) {
	            if (ctx.setLineDash) {
	                ctx.setLineDash(layer.options && layer.options._dashArray || []);
	            }
	            ctx.globalAlpha = options.opacity;
	            ctx.lineWidth = options.weight;
	            ctx.strokeStyle = options.color;
	            ctx.lineCap = options.lineCap;
	            ctx.lineJoin = options.lineJoin;
	            ctx.stroke();
	        }
	    },

	    _onClick: function(e) {
	        var point = this._map.mouseEventToLayerPoint(e),
	            layer, clickedLayer;

	        for (var order = this._drawFirst; order; order = order.next) {
	            layer = order.layer;
	            if (layer.options.interactive && layer._containsPoint(point)) {
	                if (!(e.type === 'click' || e.type === 'preclick') || !this._map._draggableMoved(layer)) {
	                    clickedLayer = layer;
	                }
	            }
	        }
	        this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
	    },

	    _onMouseMove: function(e) {
	        if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) {
	            return;
	        }

	        var point = this._map.mouseEventToLayerPoint(e);
	        this._handleMouseHover(e, point);
	    },

	    _handleMouseOut: function(e) {
	        var layer = this._hoveredLayer;
	        if (layer) {
	            removeClass$1(this._container, 'atlas-interactive');
	            this._fireEvent([layer], e, 'mouseout');
	            this._hoveredLayer = null;
	            this._mouseHoverThrottled = false;
	        }
	    },

	    _handleMouseHover: function(e, point) {
	        if (this._mouseHoverThrottled) {
	            return;
	        }

	        var layer, candidateHoveredLayer;

	        for (var order = this._drawFirst; order; order = order.next) {
	            layer = order.layer;
	            if (layer.options.interactive && layer._containsPoint(point)) {
	                candidateHoveredLayer = layer;
	            }
	        }

	        if (candidateHoveredLayer !== this._hoveredLayer) {
	            this._handleMouseOut(e);

	            if (candidateHoveredLayer) {
	                addClass$1(this._container, 'atlas-interactive');
	                this._fireEvent([candidateHoveredLayer], e, 'mouseover');
	                this._hoveredLayer = candidateHoveredLayer;
	            }
	        }

	        this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);

	        this._mouseHoverThrottled = true;
	        setTimeout(bind$1(function() {
	            this._mouseHoverThrottled = false;
	        }, this), 32);
	    },

	    _fireEvent: function(layers, e, type) {
	        this._map._fireDOMEvent(e, type || e.type, layers);
	    },

	    _bringToFront: function(layer) {
	        var order = layer._order;
	        if (!order) {
	            return;
	        }

	        var next = order.next;
	        var prev = order.prev;

	        if (next) {
	            next.prev = prev;
	        } else {
	            return;
	        }
	        if (prev) {
	            prev.next = next;
	        } else if (next) {
	            this._drawFirst = next;
	        }

	        order.prev = this._drawLast;
	        this._drawLast.next = order;

	        order.next = null;
	        this._drawLast = order;

	        this._requestRedraw(layer);
	    },

	    _bringToBack: function(layer) {
	        var order = layer._order;
	        if (!order) {
	            return;
	        }

	        var next = order.next;
	        var prev = order.prev;

	        if (prev) {
	            prev.next = next;
	        } else {
	            return;
	        }
	        if (next) {
	            next.prev = prev;
	        } else if (prev) {
	            this._drawLast = prev;
	        }

	        order.prev = null;
	        order.next = this._drawFirst;
	        this._drawFirst.prev = order;
	        this._drawFirst = order;

	        this._requestRedraw(layer);
	    }
	});

	function canvas(options) {
	    return canvas$1 ? new Canvas(options) : null;
	}

	const DivOverlay = Layer.extend({
	    options: {
	        interactive: false,
	        offset: [0, 7],
	        className: '',
	        pane: 'popupPane'
	    },

	    initialize: function(options, source) {
	        setOptions(this, options);
	        this._source = source;
	    },

	    onAdd: function(map) {
	        this._zoomAnimated = map._zoomAnimated;
	        if (!this._container) {
	            this._initLayout();
	        }
	        if (map._fadeAnimated) {
	            setOpacity(this._container, 0);
	        }
	        clearTimeout(this._removeTimeout);
	        this.getPane().appendChild(this._container);
	        this.update();
	        if (map._fadeAnimated) {
	            setOpacity(this._container, 1);
	        }
	        this.bringToFront();
	    },

	    onRemove: function(map) {
	        if (map._fadeAnimated) {
	            setOpacity(this._container, 0);
	            this._removeTimeout = setTimeout(bind(remove, undefined, this._container), 200);
	        } else {
	            remove(this._container);
	        }
	    },

	    getLatLng: function() {
	        return this._latlng;
	    },

	    setLatLng: function(latlng) {
	        this._latlng = toLatLng(latlng);
	        if (this._map) {
	            this._updatePosition();
	            this._adjustPan();
	        }
	        return this;
	    },

	    getContent: function() {
	        return this._content;
	    },

	    setContent: function(content) {
	        this._content = content;
	        this.update();
	        return this;
	    },

	    getElement: function() {
	        return this._container;
	    },

	    update: function() {
	        if (!this._map) {
	            return;
	        }
	        this._container.style.visibility = 'hidden';
	        this._updateContent();
	        this._updateLayout();
	        this._updatePosition();
	        this._container.style.visibility = '';
	        this._adjustPan();
	    },

	    getEvents: function() {
	        return {
	            zoom: this._updatePosition,
	            viewreset: this._updatePosition
	        };
	    },

	    isOpen: function() {
	        return !!this._map && this._map.hasLayer(this);
	    },

	    bringToFront: function() {
	        if (this._map) {
	            toFront(this._container);
	        }
	        return this;
	    },

	    bringToBack: function() {
	        if (this._map) {
	            toBack(this._container);
	        }
	        return this;
	    },

	    _prepareOpen: function(parent, layer, latlng) {
	        if (!(layer instanceof Layer)) {
	            latlng = layer;
	            layer = parent;
	        }

	        if (layer instanceof FeatureGroup) {
	            for (var id in parent._layers) {
	                layer = parent._layers[id];
	                break;
	            }
	        }

	        if (!latlng) {
	            if (layer.getCenter) {
	                latlng = layer.getCenter();
	            } else if (layer.getLatLng) {
	                latlng = layer.getLatLng();
	            } else {
	                throw new Error('Unable to get source layer LatLng.');
	            }
	        }
	        this._source = layer;
	        this.setLatLng(latlng);

	        if (this._map) {
	            this.update();
	        }
	        return this;
	    },

	    _updateContent: function() {
	        if (!this._content) {
	            return;
	        }

	        var node = this._contentNode;
	        var content = (typeof this._content === 'function') ? this._content(this._source || this) : this._content;

	        if (typeof content === 'string') {
	            node.innerHTML = content;
	        } else {
	            while (node.hasChildNodes()) {
	                node.removeChild(node.firstChild);
	            }
	            node.appendChild(content);
	        }
	        this.fire('contentupdate');
	    },

	    _updatePosition: function() {
	        if (!this._map) {
	            return;
	        }

	        var pos = this._map.latLngToLayerPoint(this._latlng),
	            offset = toPoint(this.options.offset),
	            anchor = this._getAnchor();

	        if (this._zoomAnimated) {
	            setPosition$1(this._container, pos.add(anchor));
	        } else {
	            offset = offset.add(pos).add(anchor);
	        }

	        var bottom = this._containerBottom = -offset.y,
	            left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

	        this._container.style.bottom = bottom + 'px';
	        this._container.style.left = left + 'px';
	    },

	    _getAnchor: function() {
	        return new Point$1(0, 0);
	    }
	});

	const Popup = DivOverlay.extend({
	    options: {
	        pane: 'popupPane',
	        offset: [0, 7],
	        maxWidth: 300,
	        minWidth: 50,
	        maxHeight: null,
	        autoPan: true,
	        autoPanPaddingTopLeft: null,
	        autoPanPaddingBottomRight: null,
	        autoPanPadding: [5, 5],
	        keepInView: false,
	        closeButton: true,
	        autoClose: true,
	        closeOnEscapeKey: true,
	        closeOnClick: true,
	        className: ''
	    },

	    openOn: function(map) {
	        map.openPopup(this);
	        return this;
	    },

	    onAdd: function(map) {
	        DivOverlay.prototype.onAdd.call(this, map);

	        map.fire('popupopen', {
	            popup: this
	        });

	        if (this._source) {
	            this._source.fire('popupopen', {
	                popup: this
	            }, true);
	            if (!(this._source instanceof Layer)) {
	                this._source.on('preclick', stopPropagation);
	            }
	        }
	    },

	    onRemove: function(map) {
	        DivOverlay.prototype.onRemove.call(this, map);

	        map.fire('popupclose', {
	            popup: this
	        });

	        if (this._source) {
	            this._source.fire('popupclose', {
	                popup: this
	            }, true);
	            if (!(this._source instanceof Layer)) {
	                this._source.off('preclick', stopPropagation);
	            }
	        }
	    },

	    getEvents: function() {
	        var events = DivOverlay.prototype.getEvents.call(this);

	        if (this.options.closeOnClick !== undefined ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
	            events.preclick = this._close;
	        }

	        if (this.options.keepInView) {
	            events.moveend = this._adjustPan;
	        }
	        return events;
	    },

	    _close: function() {
	        if (this._map) {
	            this._map.closePopup(this);
	        }
	    },

	    _initLayout: function() {
	        var prefix = 'atlas-popup',
	            container = this._container =
	            create('div', prefix + ' ' + (this.options.className || '') + ' atlas-zoom-animated');

	        var wrapper = this._wrapper = create('div', prefix + '-content-wrapper', container);
	        this._contentNode = create('div', prefix + '-content', wrapper);

	        disableClickPropagation(wrapper);
	        disableScrollPropagation(this._contentNode);
	        on(wrapper, 'contextmenu', stopPropagation);

	        this._tipContainer = create('div', prefix + '-tip-container', container);
	        this._tip = create('div', prefix + '-tip', this._tipContainer);

	        if (this.options.closeButton) {
	            var closeButton = this._closeButton = create('a', prefix + '-close-button', container);
	            closeButton.setAttribute('role', 'button');
	            closeButton.setAttribute('aria-label', 'Close popup');
	            closeButton.href = '#close';
	            closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';

	            on(closeButton, 'click', this._onCloseButtonClick, this);
	        }
	    },

	    _updateLayout: function() {
	        var container = this._contentNode,
	            style = container.style;

	        style.width = '';
	        style.whiteSpace = 'nowrap';

	        var width = container.offsetWidth;
	        width = Math.min(width, this.options.maxWidth);
	        width = Math.max(width, this.options.minWidth);

	        style.width = (width + 1) + 'px';
	        style.whiteSpace = '';

	        style.height = '';

	        var height = container.offsetHeight,
	            maxHeight = this.options.maxHeight,
	            scrolledClass = 'atlas-popup-scrolled';

	        if (maxHeight && height > maxHeight) {
	            style.height = maxHeight + 'px';
	            addClass(container, scrolledClass);
	        } else {
	            removeClass(container, scrolledClass);
	        }

	        this._containerWidth = this._container.offsetWidth;
	    },

	    _updatePosition: function() {
	        if (!this._map) {
	            return;
	        }

	        var pos = this._map.latLngToLayerPoint(this._latlng),
	            offset = toPoint$2(this.options.offset),
	            anchor = this._getAnchor();

	        if (this._zoomAnimated) {
	            setPosition$1(this._container, pos.add(anchor));
	        } else {
	            offset = offset.add(pos).add(anchor);
	        }

	        var bottom = this._containerBottom = -offset.y,
	            left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

	        this._container.style.bottom = bottom + 'px';
	        this._container.style.left = left + 'px';
	    },

	    _adjustPan: function() {
	        if (!this.options.autoPan) {
	            return;
	        }
	        if (this._map._panAnim && this._map._panAnim.inProgress) {
	            return;
	        }

	        var map = this._map,
	            marginBottom = parseInt(getStyle(this._container, 'marginBottom'), 10) || 0,
	            containerHeight = this._container.offsetHeight + marginBottom,
	            containerWidth = this._containerWidth,
	            layerPos = new Point$1(this._containerLeft, -containerHeight - this._containerBottom);

	        layerPos._add(getPosition$1(this._container));

	        var containerPos = map.layerPointToContainerPoint(layerPos),
	            padding = toPoint$2(this.options.autoPanPadding),
	            paddingTL = toPoint$2(this.options.autoPanPaddingTopLeft || padding),
	            paddingBR = toPoint$2(this.options.autoPanPaddingBottomRight || padding),
	            size = map.getSize(),
	            dx = 0,
	            dy = 0;

	        if (containerPos.x + containerWidth + paddingBR.x > size.x) {
	            dx = containerPos.x + containerWidth - size.x + paddingBR.x;
	        }
	        if (containerPos.x - dx - paddingTL.x < 0) {
	            dx = containerPos.x - paddingTL.x;
	        }
	        if (containerPos.y + containerHeight + paddingBR.y > size.y) {
	            dy = containerPos.y + containerHeight - size.y + paddingBR.y;
	        }
	        if (containerPos.y - dy - paddingTL.y < 0) {
	            dy = containerPos.y - paddingTL.y;
	        }

	        if (dx || dy) {
	            map
	                .fire('autopanstart')
	                .panBy([dx, dy]);
	        }
	    },

	    _onCloseButtonClick: function(e) {
	        this._close();
	        stop(e);
	    },

	    _getAnchor: function() {
	        return toPoint$2(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
	    }
	});

	function popup(options, source) {
	    return new Popup(options, source);
	}

	Layer.prototype.bindPopup = function(content, options) {
	    if (content instanceof Popup) {
	        setOptions$1(content, options);
	        this._popup = content;
	        content._source = this;
	    } else {
	        if (!this._popup || options) {
	            this._popup = new Popup(options, this);
	        }
	        this._popup.setContent(content);
	    }

	    if (!this._popupEventsAdded) {
	        this.on({
	            click: this._openPopup,
	            keypress: this._onKeyPress,
	            remove: this.closePopup,
	            move: this._movePopup
	        });
	        this._popupEventsAdded = true;
	    }

	    return this;
	};

	Layer.prototype.unbindPopup = function() {
	    if (this._popup) {
	        this.off({
	            click: this._openPopup,
	            keypress: this._onKeyPress,
	            remove: this.closePopup,
	            move: this._movePopup
	        });
	        this._popupEventsAdded = false;
	        this._popup = null;
	    }
	    return this;
	};

	Layer.prototype.openPopup = function(latlng) {
	    if (this._popup && this._map) {
	        this._popup._prepareOpen(this, latlng);
	        this._map.openPopup(this._popup);
	    }

	    return this;
	};

	Layer.prototype.closePopup = function() {
	    if (this._popup) {
	        this._popup._close();
	    }
	    return this;
	};

	Layer.prototype.togglePopup = function() {
	    if (this._popup) {
	        if (this._popup.isOpen()) {
	            this.closePopup();
	        } else {
	            this.openPopup();
	        }
	    }
	    return this;
	};

	Layer.prototype.isPopupOpen = function() {
	    return (this._popup ? this._popup.isOpen() : false);
	};

	Layer.prototype.setPopupContent = function(content) {
	    if (this._popup) {
	        this._popup.setContent(content);
	    }
	    return this;
	};

	Layer.prototype.getPopup = function() {
	    return this._popup;
	};

	Layer.prototype._openPopup = function(e) {
	    var layer = e.layer || e.target;

	    if (!this._popup) {
	        return;
	    }

	    if (!this._map) {
	        return;
	    }
	    stop(e);

	    if (layer instanceof FeatureGroup$1) {
	        for (var id in this._layers) {
	            layer = this._layers[id];
	            break;
	        }
	    }

	    if (!layer.getCenter) {
	        layer = this;
	    }

	    this._popup.setLatLng(e.latlng);
	    this.openPopup();
	};

	Layer.prototype._movePopup = function(e) {
	    this._popup.setLatLng(e.latlng);
	};

	Layer.prototype._onKeyPress = function(e) {
	    if (e.originalEvent.keyCode === 13) {
	        this._openPopup(e);
	    }
	};

	const Tooltip = DivOverlay.extend({
	    options: {
	        pane: 'tooltipPane',
	        offset: [0, 0],
	        direction: 'auto',
	        permanent: false,
	        sticky: false,
	        interactive: false,
	        opacity: 0.9
	    },

	    onAdd: function(map) {
	        DivOverlay.prototype.onAdd.call(this, map);
	        this.setOpacity(this.options.opacity);

	        map.fire('tooltipopen', {
	            tooltip: this
	        });

	        if (this._source) {
	            this.addEventParent(this._source);
	            this._source.fire('tooltipopen', {
	                tooltip: this
	            }, true);
	        }
	    },

	    onRemove: function(map) {
	        DivOverlay.prototype.onRemove.call(this, map);

	        map.fire('tooltipclose', {
	            tooltip: this
	        });

	        if (this._source) {
	            this.removeEventParent(this._source);
	            this._source.fire('tooltipclose', {
	                tooltip: this
	            }, true);
	        }
	    },

	    getEvents: function() {
	        var events = DivOverlay.prototype.getEvents.call(this);

	        if (!this.options.permanent) {
	            events.preclick = this._close;
	        }

	        return events;
	    },

	    _close: function() {
	        if (this._map) {
	            this._map.closeTooltip(this);
	        }
	    },

	    _initLayout: function() {
	        var prefix = 'atlas-tooltip',
	            className = prefix + ' ' + (this.options.className || '') + ' atlas-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

	        this._contentNode = this._container = create('div', className);
	        this._container.setAttribute('role', 'tooltip');
	        this._container.setAttribute('id', 'atlas-tooltip-' + stamp(this));
	    },

	    _updateLayout: function() {},

	    _updatePosition: function() {
	        var pos = this._map.latLngToLayerPoint(this._latlng),
	            offset = toPoint$2(this.options.offset);

	        if (this._zoomAnimated) {
	            setPosition$1(this._container, pos.add(this._getAnchor()));
	        } else {
	            pos = pos.add(this._getAnchor().add(offset));
	        }
	        var bottom = this._containerBottom = -pos.y,
	            left = this._containerLeft = -Math.round(this._container.offsetWidth / 2) + pos.x;

	        this._container.style.bottom = bottom + 'px';
	        this._container.style.left = left + 'px';
	    },

	    setOpacity: function(opacity) {
	        this.options.opacity = opacity;
	        if (this._container) {
	            setOpacity$1(this._container, opacity);
	        }
	    },

	    _getAnchor: function() {
	        var direction = this.options.direction,
	            pos = this._map.latLngToContainerPoint(this._latlng);
	            this._map.getSize().divideBy(2);
	            var container = this._container;

	        if (direction === 'auto') {
	            var anchor = new Point$1(0, 0);
	            if (pos.y - container.offsetHeight - 20 > 0) {
	                anchor.y = -container.offsetHeight - 10;
	            } else {
	                anchor.y = 10;
	            }
	            return anchor;
	        }

	        var tooltipContainer = this._container;
	            this._map.getSize();
	            var anchor = new Point$1(0, 0);

	        if (direction === 'top') {
	            anchor.y = -tooltipContainer.offsetHeight - 10;
	        } else if (direction === 'bottom') {
	            anchor.y = 10;
	        } else if (direction === 'left') {
	            anchor.x = -tooltipContainer.offsetWidth - 10;
	        } else if (direction === 'right') {
	            anchor.x = 10;
	        }
	        return anchor;
	    },
	});

	function tooltip(options, source) {
	    return new Tooltip(options, source);
	}

	Layer.prototype.bindTooltip = function(content, options) {
	    if (content instanceof Tooltip) {
	        setOptions$1(content, options);
	        this._tooltip = content;
	        content._source = this;
	    } else {
	        if (!this._tooltip || options) {
	            this._tooltip = new Tooltip(options, this);
	        }
	        this._tooltip.setContent(content);
	    }

	    this._initTooltipInteractions();

	    if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
	        this.openTooltip();
	    }

	    return this;
	};

	Layer.prototype.unbindTooltip = function() {
	    if (this._tooltip) {
	        this._initTooltipInteractions(true);
	        this.closeTooltip();
	        this._tooltip = null;
	    }
	    return this;
	};

	Layer.prototype.openTooltip = function(latlng) {
	    if (this._tooltip && this._map) {
	        this._tooltip._prepareOpen(this, latlng);
	        this._map.openTooltip(this._tooltip);
	    }
	    return this;
	};

	Layer.prototype.closeTooltip = function() {
	    if (this._tooltip) {
	        this._tooltip._close();
	    }
	    return this;
	};

	Layer.prototype.toggleTooltip = function() {
	    if (this._tooltip) {
	        if (this._tooltip.isOpen()) {
	            this.closeTooltip();
	        } else {
	            this.openTooltip();
	        }
	    }
	    return this;
	};

	Layer.prototype.isTooltipOpen = function() {
	    return this._tooltip ? this._tooltip.isOpen() : false;
	};

	Layer.prototype.setTooltipContent = function(content) {
	    if (this._tooltip) {
	        this._tooltip.setContent(content);
	    }
	    return this;
	};

	Layer.prototype.getTooltip = function() {
	    return this._tooltip;
	};

	Layer.prototype._initTooltipInteractions = function(remove) {
	    if (!remove && this._tooltipHandlersAdded) {
	        return;
	    }
	    var onOff = remove ? 'off' : 'on',
	        events = {
	            remove: this.closeTooltip,
	            move: this._moveTooltip
	        };
	    if (!this._tooltip.options.permanent) {
	        events.mouseover = this._openTooltip;
	        events.mouseout = this.closeTooltip;
	        events.click = this._openTooltip;
	        if (this._tooltip.options.sticky) {
	            events.mousemove = this._moveTooltip;
	        }
	        if (Browser.touch) {
	            events.click = this._openTooltip;
	        }
	    } else {
	        events.add = this._openTooltip;
	    }
	    this[onOff](events);
	    this._tooltipHandlersAdded = !remove;
	};

	Layer.prototype._openTooltip = function(e) {
	    var layer = e.layer || e.target;

	    if (!this._tooltip || !this._map) {
	        return;
	    }
	    this.openTooltip(layer || this, e.latlng);
	};

	Layer.prototype._moveTooltip = function(e) {
	    var latlng = e.latlng,
	        containerPoint, layer;
	    if (this._tooltip.options.sticky && e.originalEvent) {
	        containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
	        layer = this._map.getLayerAt(containerPoint);
	        if (layer && layer.getLatLng) {
	            latlng = layer.getLatLng();
	        }
	    }
	    this._tooltip.setLatLng(latlng);
	};

	const PosAnimation = Events.extend({
	    run: function(el, newPos, duration, easeLinearity) {
	        this.stop();

	        this._el = el;
	        this._inProgress = true;
	        this._duration = duration || 0.25;
	        this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

	        this._startPos = getPosition(el);
	        this._offset = newPos.subtract(this._startPos);

	        this._startTime = +new Date();

	        this.fire('start');

	        this._timer = requestAnimFrame(this._step, this);
	    },

	    stop: function() {
	        if (!this._inProgress) {
	            return;
	        }

	        this._step(true);
	        this._complete();
	    },

	    _step: function(round) {
	        var elapsed = (+new Date()) - this._startTime,
	            duration = this._duration * 1000;

	        if (elapsed < duration) {
	            this._runFrame(this._easeOut(elapsed / duration), round);
	        } else {
	            this._runFrame(1);
	            this._complete();
	        }
	    },

	    _runFrame: function(progress, round) {
	        var newPos = this._startPos.add(this._offset.multiplyBy(progress));
	        if (round) {
	            newPos._round();
	        }
	        setPosition$1(this._el, newPos);

	        this.fire('step');
	    },

	    _complete: function() {
	        cancelAnimFrame$1(this._timer);

	        this._inProgress = false;
	        this.fire('end');
	    },

	_easeOut: function(t) {
	        return 1 - Math.pow(1 - t, this._easeOutPower);
	    }
	});

	// This is the main entry point for the Atlas.js library.
	// It exports all the public APIs.


	// Constants
	const version = '1.0.0';

	exports.Attribution = Attribution;
	exports.Bounds = Bounds;
	exports.BoxZoom = BoxZoom;
	exports.CRS = CRS;
	exports.Canvas = Canvas;
	exports.Circle = Circle;
	exports.CircleMarker = CircleMarker;
	exports.Class = Class;
	exports.Control = Control;
	exports.DivIcon = DivIcon;
	exports.DivOverlay = DivOverlay;
	exports.DoubleClickZoom = DoubleClickZoom;
	exports.Drag = Drag;
	exports.Earth = Earth;
	exports.Evented = Evented;
	exports.Events = Events;
	exports.FeatureGroup = FeatureGroup$1;
	exports.GeoJSON = GeoJSON;
	exports.GridLayer = GridLayer;
	exports.Handler = Handler;
	exports.Icon = Icon;
	exports.ImageOverlay = ImageOverlay;
	exports.Keyboard = Keyboard;
	exports.LatLng = LatLng$1;
	exports.LatLngBounds = LatLngBounds$1;
	exports.Layer = Layer;
	exports.LayerGroup = LayerGroup;
	exports.Layers = Layers;
	exports.LineUtil = LineUtil;
	exports.LonLat = LonLat;
	exports.Map = Map;
	exports.Marker = Marker;
	exports.MarkerDrag = MarkerDrag;
	exports.Mercator = Mercator;
	exports.Path = Path;
	exports.Point = Point$1;
	exports.PolyUtil = PolyUtil;
	exports.Polygon = Polygon;
	exports.Polyline = Polyline;
	exports.Popup = Popup;
	exports.PosAnimation = PosAnimation;
	exports.Rectangle = Rectangle;
	exports.Renderer = Renderer;
	exports.SVG = SVG;
	exports.SVGOverlay = SVGOverlay;
	exports.Scale = Scale;
	exports.ScrollWheelZoom = ScrollWheelZoom;
	exports.SphericalMercator = SphericalMercator;
	exports.TRANSFORM = TRANSFORM;
	exports.TRANSITION = TRANSITION;
	exports.TRANSITION_END = TRANSITION_END;
	exports.TapHold = TapHold;
	exports.TileLayer = TileLayer;
	exports.Tooltip = Tooltip;
	exports.TouchZoom = TouchZoom;
	exports.Zoom = Zoom;
	exports.addClass = addClass$1;
	exports.android = android;
	exports.android23 = android23;
	exports.androidStock = androidStock;
	exports.any3d = any3d;
	exports.asFeature = asFeature;
	exports.attribution = attribution;
	exports.bind = bind$1;
	exports.cancelAnimFrame = cancelAnimFrame$1;
	exports.cancelFn = cancelFn;
	exports.canvas = canvas;
	exports.chrome = chrome;
	exports.circle = circle;
	exports.circleMarker = circleMarker;
	exports.clipPolygon = clipPolygon;
	exports.clipSegment = clipSegment;
	exports.closestPointOnSegment = closestPointOnSegment;
	exports.control = control;
	exports.coordsToLatLng = coordsToLatLng;
	exports.coordsToLatLngs = coordsToLatLngs;
	exports.create = create;
	exports.disableClickPropagation = disableClickPropagation;
	exports.disableImageDrag = disableImageDrag;
	exports.disableScrollPropagation = disableScrollPropagation$1;
	exports.divIcon = divIcon;
	exports.edge = edge;
	exports.empty = empty;
	exports.emptyImageUrl = emptyImageUrl;
	exports.enableImageDrag = enableImageDrag;
	exports.extend = extend;
	exports.falseFn = falseFn;
	exports.featureGroup = featureGroup;
	exports.formatNum = formatNum;
	exports.gecko = gecko;
	exports.gecko3d = gecko3d;
	exports.geoJSON = geoJSON;
	exports.geoJson = geoJson;
	exports.geometryToLayer = geometryToLayer;
	exports.get = get;
	exports.getClass = getClass;
	exports.getFeature = getFeature;
	exports.getMousePosition = getMousePosition;
	exports.getParamString = getParamString;
	exports.getPosition = getPosition$1;
	exports.getPropagationPath = getPropagationPath;
	exports.getScale = getScale;
	exports.getSizedParentNode = getSizedParentNode;
	exports.getStyle = getStyle;
	exports.getWheelDelta = getWheelDelta;
	exports.gridLayer = gridLayer;
	exports.hasClass = hasClass$1;
	exports.icon = icon;
	exports.ie = ie;
	exports.ie3d = ie3d;
	exports.ielt9 = ielt9;
	exports.imageOverlay = imageOverlay;
	exports.indexOf = indexOf;
	exports.inlineSvg = inlineSvg;
	exports.isArray = isArray$1;
	exports.isExternalTarget = isExternalTarget;
	exports.isFlat = isFlat$2;
	exports.latLngToCoords = latLngToCoords;
	exports.latLngsToCoords = latLngsToCoords;
	exports.layerGroup = layerGroup;
	exports.layers = layers;
	exports.linux = linux;
	exports.mac = mac;
	exports.marker = marker;
	exports.mobile = mobile;
	exports.mobileGecko = mobileGecko;
	exports.mobileOpera = mobileOpera;
	exports.mobileWebkit = mobileWebkit;
	exports.mobileWebkit3d = mobileWebkit3d;
	exports.msPointer = msPointer;
	exports.off = off;
	exports.on = on;
	exports.opera = opera;
	exports.opera12 = opera12;
	exports.passiveEvents = passiveEvents;
	exports.phantom = phantom;
	exports.pointToSegmentDistance = pointToSegmentDistance$1;
	exports.pointer = pointer;
	exports.polygon = polygon;
	exports.polygonCenter = polygonCenter;
	exports.polyline = polyline;
	exports.polylineCenter = polylineCenter;
	exports.popup = popup;
	exports.preventDefault = preventDefault;
	exports.preventOutline = preventOutline;
	exports.rectangle = rectangle;
	exports.remove = remove;
	exports.removeClass = removeClass$1;
	exports.requestAnimFrame = requestAnimFrame;
	exports.requestFn = requestFn;
	exports.restoreOutline = restoreOutline;
	exports.retina = retina;
	exports.safari = safari;
	exports.scale = scale;
	exports.setClass = setClass;
	exports.setOpacity = setOpacity$1;
	exports.setOptions = setOptions$1;
	exports.setPosition = setPosition$1;
	exports.setTransform = setTransform;
	exports.simplify = simplify;
	exports.splitWords = splitWords;
	exports.stamp = stamp;
	exports.stop = stop$1;
	exports.stopPropagation = stopPropagation$1;
	exports.svg = svg;
	exports.svgOverlay = svgOverlay;
	exports.template = template;
	exports.testProp = testProp;
	exports.throttle = throttle;
	exports.tileLayer = tileLayer$1;
	exports.toBack = toBack$1;
	exports.toBounds = toBounds;
	exports.toFront = toFront$1;
	exports.toLatLng = toLatLng$1;
	exports.toLatLngBounds = toLatLngBounds$1;
	exports.toPoint = toPoint$1;
	exports.tooltip = tooltip;
	exports.touch = touch;
	exports.touchNative = touchNative;
	exports.trim = trim;
	exports.version = version;
	exports.vml = vml;
	exports.webkit = webkit;
	exports.webkit3d = webkit3d;
	exports.win = win;
	exports.wrapNum = wrapNum;
	exports.zoom = zoom;

	return exports;

})({});
//# sourceMappingURL=atlas.js.map
