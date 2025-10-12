/* Atlas.js — A modern, mobile-first mapping library 🇲🇦 */
/* © ElWali */
/* Fully refactored to remove all Leaflet-style API patterns */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.atlas = {}));
})(this, (function (exports) { 'use strict';

  // ===============
  // UTILITIES
  // ===============

  function extend(dest) {
    for (let j = 1; j < arguments.length; j++) {
      const src = arguments[j];
      for (const i in src) {
        dest[i] = src[i];
      }
    }
    return dest;
  }

  const create = Object.create || (function () {
    function F() {}
    return function (proto) {
      F.prototype = proto;
      return new F();
    };
  })();

  function bind(fn, obj) {
    const slice = Array.prototype.slice;
    if (fn.bind) {
      return fn.bind.apply(fn, slice.call(arguments, 1));
    }
    const args = slice.call(arguments, 2);
    return function () {
      return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
    };
  }

  let lastId = 0;
  function stamp(obj) {
    if (!('_atlas_id' in obj)) {
      obj['_atlas_id'] = ++lastId;
    }
    return obj._atlas_id;
  }

  function throttle(fn, time, context) {
    let lock, args, wrapperFn, later;
    later = function () {
      lock = false;
      if (args) {
        wrapperFn.apply(context, args);
        args = false;
      }
    };
    wrapperFn = function () {
      if (lock) {
        args = arguments;
      } else {
        fn.apply(context, arguments);
        setTimeout(later, time);
        lock = true;
      }
    };
    return wrapperFn;
  }

  function wrapNum(x, range, includeMax) {
    const max = range[1], min = range[0], d = max - min;
    return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
  }

  function falseFn() { return false; }

  function formatNum(num, precision) {
    if (precision === false) return num;
    const pow = Math.pow(10, precision === undefined ? 6 : precision);
    return Math.round(num * pow) / pow;
  }

  function trim(str) {
    return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
  }

  function splitWords(str) {
    return trim(str).split(/\s+/);
  }

  function setOptions(obj, options) {
    if (!Object.prototype.hasOwnProperty.call(obj, 'options')) {
      obj.options = obj.options ? create(obj.options) : {};
    }
    for (const i in options) {
      obj.options[i] = options[i];
    }
    return obj.options;
  }

  function getParamString(obj, existingUrl, uppercase) {
    const params = [];
    for (const i in obj) {
      params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
    }
    return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
  }

  const templateRe = /\{ *([\w_ -]+) *\}/g;
  function template(str, data) {
    return str.replace(templateRe, function (str, key) {
      let value = data[key];
      if (value === undefined) {
        throw new Error('No value provided for variable ' + str);
      } else if (typeof value === 'function') {
        value = value(data);
      }
      return value;
    });
  }

  const isArray = Array.isArray || function (obj) {
    return (Object.prototype.toString.call(obj) === '[object Array]');
  };

  const emptyImageUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  const requestFn = window.requestAnimationFrame || (fn => setTimeout(fn, 16));
  const cancelFn = window.cancelAnimationFrame || clearTimeout;

  function requestAnimFrame(fn, context, immediate) {
    if (immediate) {
      fn.call(context);
    } else {
      return requestFn.call(window, bind(fn, context));
    }
  }

  function cancelAnimFrame(id) {
    if (id) {
      cancelFn.call(window, id);
    }
  }

  // ===============
  // DOM UTILS
  // ===============

  function testProp(props) {
    const style = document.documentElement.style;
    for (let i = 0; i < props.length; i++) {
      if (props[i] in style) return props[i];
    }
    return false;
  }

  const TRANSFORM = testProp(['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform']);
  const TRANSITION = testProp(['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);
  const TRANSITION_END = TRANSITION === 'webkitTransition' || TRANSITION === 'OTransition' ? TRANSITION + 'End' : 'transitionend';

  function get(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
  }

  function getStyle(el, style) {
    let value = el.style[style] || (el.currentStyle && el.currentStyle[style]);
    if ((!value || value === 'auto') && document.defaultView) {
      const css = document.defaultView.getComputedStyle(el, null);
      value = css ? css[style] : null;
    }
    return value === 'auto' ? null : value;
  }

  function create$1(tagName, className, container) {
    const el = document.createElement(tagName);
    el.className = className || '';
    if (container) container.appendChild(el);
    return el;
  }

  function remove(el) {
    const parent = el.parentNode;
    if (parent) parent.removeChild(el);
  }

  function empty(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function toFront(el) {
    const parent = el.parentNode;
    if (parent && parent.lastChild !== el) parent.appendChild(el);
  }

  function toBack(el) {
    const parent = el.parentNode;
    if (parent && parent.firstChild !== el) parent.insertBefore(el, parent.firstChild);
  }

  function hasClass(el, name) {
    if (el.classList !== undefined) return el.classList.contains(name);
    const className = getClass(el);
    return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
  }

  function addClass(el, name) {
    if (el.classList !== undefined) {
      const classes = splitWords(name);
      for (let i = 0, len = classes.length; i < len; i++) {
        el.classList.add(classes[i]);
      }
    } else if (!hasClass(el, name)) {
      const className = getClass(el);
      setClass(el, (className ? className + ' ' : '') + name);
    }
  }

  function removeClass(el, name) {
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
    if (el.correspondingElement) el = el.correspondingElement;
    return el.className.baseVal === undefined ? el.className : el.className.baseVal;
  }

  function setOpacity(el, value) {
    el.style.opacity = value;
  }

  function setTransform(el, offset, scale) {
    const pos = offset || new Point(0, 0);
    el.style[TRANSFORM] = `translate3d(${pos.x}px, ${pos.y}px, 0)` + (scale ? ` scale(${scale})` : '');
  }

  function setPosition(el, point) {
    el._atlas_pos = point;
    setTransform(el, point);
  }

  function getPosition(el) {
    return el._atlas_pos || new Point(0, 0);
  }

  function getScale(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.width / element.offsetWidth || 1,
      y: rect.height / element.offsetHeight || 1,
      boundingClientRect: rect
    };
  }

  function getMousePosition(e, container) {
    if (!container) {
      return new Point(e.clientX, e.clientY);
    }
    const scale = getScale(container);
    const rect = container.getBoundingClientRect();
    return new Point(
      (e.clientX - rect.left) / scale.x,
      (e.clientY - rect.top) / scale.y
    );
  }

  // ===============
  // CORE TYPES
  // ===============

  class Point {
    constructor(x, y, round) {
      this.x = (round ? Math.round(x) : x);
      this.y = (round ? Math.round(y) : y);
    }
    clone() { return new Point(this.x, this.y); }
    add(point) { return this.clone()._add(toPoint(point)); }
    _add(point) { this.x += point.x; this.y += point.y; return this; }
    subtract(point) { return this.clone()._subtract(toPoint(point)); }
    _subtract(point) { this.x -= point.x; this.y -= point.y; return this; }
    divideBy(num) { return this.clone()._divideBy(num); }
    _divideBy(num) { this.x /= num; this.y /= num; return this; }
    multiplyBy(num) { return this.clone()._multiplyBy(num); }
    _multiplyBy(num) { this.x *= num; this.y *= num; return this; }
    scaleBy(point) { return new Point(this.x * point.x, this.y * point.y); }
    unscaleBy(point) { return new Point(this.x / point.x, this.y / point.y); }
    round() { return this.clone()._round(); }
    _round() { this.x = Math.round(this.x); this.y = Math.round(this.y); return this; }
    floor() { return this.clone()._floor(); }
    _floor() { this.x = Math.floor(this.x); this.y = Math.floor(this.y); return this; }
    ceil() { return this.clone()._ceil(); }
    _ceil() { this.x = Math.ceil(this.x); this.y = Math.ceil(this.y); return this; }
    distanceTo(point) { point = toPoint(point); const x = point.x - this.x, y = point.y - this.y; return Math.sqrt(x * x + y * y); }
    equals(point) { point = toPoint(point); return point.x === this.x && point.y === this.y; }
    contains(point) { point = toPoint(point); return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y); }
    toString() { return `Point(${formatNum(this.x)}, ${formatNum(this.y)})`; }
  }
  function toPoint(x, y, round) {
    if (x instanceof Point) return x;
    if (isArray(x)) return new Point(x[0], x[1]);
    if (x === undefined || x === null) return x;
    if (typeof x === 'object' && 'x' in x && 'y' in x) return new Point(x.x, x.y);
    return new Point(x, y, round);
  }

  class Bounds {
    constructor(a, b) {
      if (!a) return;
      const points = b ? [a, b] : a;
      for (let i = 0, len = points.length; i < len; i++) {
        this.extend(points[i]);
      }
    }
    extend(obj) {
      let min2, max2;
      if (!obj) return this;
      if (obj instanceof Point || typeof obj[0] === 'number' || 'x' in obj) {
        min2 = max2 = toPoint(obj);
      } else {
        obj = toBounds(obj);
        min2 = obj.min;
        max2 = obj.max;
        if (!min2 || !max2) return this;
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
    }
    getCenter(round) { return new Point((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, round); }
    getBottomLeft() { return new Point(this.min.x, this.max.y); }
    getTopRight() { return new Point(this.max.x, this.min.y); }
    getTopLeft() { return this.min; }
    getBottomRight() { return this.max; }
    getSize() { return this.max.subtract(this.min); }
    contains(obj) {
      let min, max;
      if (typeof obj[0] === 'number' || obj instanceof Point) { obj = toPoint(obj); } else { obj = toBounds(obj); }
      if (obj instanceof Bounds) { min = obj.min; max = obj.max; } else { min = max = obj; }
      return (min.x >= this.min.x) && (max.x <= this.max.x) && (min.y >= this.min.y) && (max.y <= this.max.y);
    }
    intersects(bounds) {
      bounds = toBounds(bounds);
      const min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max;
      return (max2.x >= min.x) && (min2.x <= max.x) && (max2.y >= min.y) && (min2.y <= max.y);
    }
    isValid() { return !!(this.min && this.max); }
  }
  function toBounds(a, b) {
    if (!a || a instanceof Bounds) return a;
    return new Bounds(a, b);
  }

  class LatLng {
    constructor(lat, lng, alt) {
      if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid LatLng object: (${lat}, ${lng})`);
      this.lat = +lat;
      this.lng = +lng;
      if (alt !== undefined) this.alt = +alt;
    }
    equals(obj, maxMargin = 1.0E-9) {
      if (!obj) return false;
      obj = toLatLng(obj);
      const margin = Math.max(Math.abs(this.lat - obj.lat), Math.abs(this.lng - obj.lng));
      return margin <= maxMargin;
    }
    toString(precision) { return `LatLng(${formatNum(this.lat, precision)}, ${formatNum(this.lng, precision)})`; }
    distanceTo(other) { return Earth.distance(this, toLatLng(other)); }
    wrap() { return Earth.wrapLatLng(this); }
    clone() { return new LatLng(this.lat, this.lng, this.alt); }
  }
  function toLatLng(a, b, c) {
    if (a instanceof LatLng) return a;
    if (isArray(a) && typeof a[0] !== 'object') {
      if (a.length === 3) return new LatLng(a[0], a[1], a[2]);
      if (a.length === 2) return new LatLng(a[0], a[1]);
      return null;
    }
    if (a === undefined || a === null) return a;
    if (typeof a === 'object' && 'lat' in a) return new LatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
    if (b === undefined) return null;
    return new LatLng(a, b, c);
  }

  class LatLngBounds {
    constructor(corner1, corner2) {
      if (!corner1) return;
      const latlngs = corner2 ? [corner1, corner2] : corner1;
      for (let i = 0, len = latlngs.length; i < len; i++) {
        this.extend(latlngs[i]);
      }
    }
    extend(obj) {
      let sw = this._southWest, ne = this._northEast, sw2, ne2;
      if (obj instanceof LatLng) { sw2 = obj; ne2 = obj; }
      else if (obj instanceof LatLngBounds) { sw2 = obj._southWest; ne2 = obj._northEast; if (!sw2 || !ne2) return this; }
      else { return obj ? this.extend(toLatLng(obj) || toLatLngBounds(obj)) : this; }
      if (!sw && !ne) {
        this._southWest = new LatLng(sw2.lat, sw2.lng);
        this._northEast = new LatLng(ne2.lat, ne2.lng);
      } else {
        sw.lat = Math.min(sw2.lat, sw.lat);
        sw.lng = Math.min(sw2.lng, sw.lng);
        ne.lat = Math.max(ne2.lat, ne.lat);
        ne.lng = Math.max(ne2.lng, ne.lng);
      }
      return this;
    }
    pad(bufferRatio) {
      const sw = this._southWest, ne = this._northEast;
      const heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio;
      const widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
      return new LatLngBounds(new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer), new LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
    }
    getCenter() { return new LatLng((this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2); }
    getSouthWest() { return this._southWest; }
    getNorthEast() { return this._northEast; }
    getNorthWest() { return new LatLng(this.getNorth(), this.getWest()); }
    getSouthEast() { return new LatLng(this.getSouth(), this.getEast()); }
    getWest() { return this._southWest.lng; }
    getSouth() { return this._southWest.lat; }
    getEast() { return this._northEast.lng; }
    getNorth() { return this._northEast.lat; }
    contains(obj) {
      if (typeof obj[0] === 'number' || obj instanceof LatLng || 'lat' in obj) { obj = toLatLng(obj); } else { obj = toLatLngBounds(obj); }
      const sw = this._southWest, ne = this._northEast; let sw2, ne2;
      if (obj instanceof LatLngBounds) { sw2 = obj.getSouthWest(); ne2 = obj.getNorthEast(); } else { sw2 = ne2 = obj; }
      return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) && (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
    }
    intersects(bounds) {
      bounds = toLatLngBounds(bounds);
      const sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast();
      return (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat) && (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);
    }
    isValid() { return !!(this._southWest && this._northEast); }
  }
  function toLatLngBounds(a, b) {
    if (a instanceof LatLngBounds) return a;
    return new LatLngBounds(a, b);
  }

  // ===============
  // PROJECTION
  // ===============

  const Earth = {
    R: 6371000,
    distance(latlng1, latlng2) {
      const rad = Math.PI / 180;
      const lat1 = latlng1.lat * rad, lat2 = latlng2.lat * rad;
      const sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2);
      const sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2);
      const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return this.R * c;
    },
    wrapLatLng(latlng) {
      const lng = wrapNum(latlng.lng, [-180, 180], true);
      return new LatLng(latlng.lat, lng, latlng.alt);
    }
  };

  const SphericalMercator = {
    R: 6378137,
    MAX_LATITUDE: 85.0511287798,
    project(latlng) {
      const d = Math.PI / 180;
      const max = this.MAX_LATITUDE;
      const lat = Math.max(Math.min(max, latlng.lat), -max);
      const sin = Math.sin(lat * d);
      return new Point(this.R * latlng.lng * d, this.R * Math.log((1 + sin) / (1 - sin)) / 2);
    },
    unproject(point) {
      const d = 180 / Math.PI;
      return new LatLng((2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d, point.x * d / this.R);
    },
    bounds: new Bounds([-20037508.34279, -20037508.34279], [20037508.34279, 20037508.34279])
  };

  class Transformation {
    constructor(a, b, c, d) {
      this._a = a; this._b = b; this._c = c; this._d = d;
    }
    transform(point, scale = 1) {
      const p = point.clone();
      p.x = scale * (this._a * p.x + this._b);
      p.y = scale * (this._c * p.y + this._d);
      return p;
    }
    untransform(point, scale = 1) {
      return new Point((point.x / scale - this._b) / this._a, (point.y / scale - this._d) / this._c);
    }
  }

  const EPSG3857 = {
    projection: SphericalMercator,
    transformation: new Transformation(0.5 / (Math.PI * SphericalMercator.R), 0.5, -0.5 / (Math.PI * SphericalMercator.R), 0.5),
    project(latlng) { return this.projection.project(latlng); },
    unproject(point) { return this.projection.unproject(point); },
    scale(zoom) { return 256 * Math.pow(2, zoom); },
    zoom(scale) { return Math.log(scale / 256) / Math.LN2; },
    getProjectedBounds(zoom) {
      const b = this.projection.bounds, s = this.scale(zoom);
      return new Bounds(this.transformation.transform(b.min, s), this.transformation.transform(b.max, s));
    }
  };

  const EPSG4326 = {
      projection: Earth,
      transformation: new Transformation(1 / 180, 1, -1 / 180, 0.5)
  };


  // ===============
  // BROWSER
  // ===============
  const Browser = {
    touch: 'ontouchstart' in window || !!window.TouchEvent,
    retina: (window.devicePixelRatio || (window.screen.deviceXDPI / window.screen.logicalXDPI)) > 1,
    mobile: typeof orientation !== 'undefined' || navigator.userAgent.toLowerCase().includes('mobile'),
    any3d: testProp(['perspective', 'webkitPerspective', 'mozPerspective', 'oPerspective', 'msPerspective'])
  };


  // ===============
  // EVENT SYSTEM
  // ===============
  class AtlasEventTarget extends EventTarget {
    fire(type, data = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail: data }));
      return this;
    }
  }

  // ===============
  // BASE LAYER
  // ===============
  class Layer extends AtlasEventTarget {
    constructor(options = {}) {
      super();
      setOptions(this, options);
    }

    addTo(map) {
      map.addLayer(this);
      return this;
    }

    remove() {
      if (this._map) {
        this._map.removeLayer(this);
      }
      return this;
    }

    onAdd(map) {
      this._map = map;
      if (this.getEvents) {
        this._boundEvents = {};
        const events = this.getEvents();
        for (const type in events) {
          const fn = events[type].bind(this);
          this._boundEvents[type] = fn;
          this._map.addEventListener(type, fn);
        }
      }
      this.fire('add');
    }

    onRemove(map) {
      if (this.getEvents && this._boundEvents) {
        for (const type in this._boundEvents) {
          map.removeEventListener(type, this._boundEvents[type]);
        }
        delete this._boundEvents;
      }
      this.fire('remove');
      this._map = null;
    }

    getPane(name) {
      return this._map.getPane(name);
    }
  }

  // ===============
  // MAP
  // ===============
  class Map extends AtlasEventTarget {
    static defaults = {
      crs: EPSG3857,
      center: [0, 0],
      zoom: 1,
      minZoom: 0,
      maxZoom: 18,
      layers: [],
      fadeAnimation: true,
      trackResize: true,
      zoomSnap: 1,
      zoomDelta: 1,
      markerZoomAnimation: true,
    };

    constructor(id, options = {}) {
      super();
      this.options = setOptions(this, { ...Map.defaults, ...options });
      this._container = get(id);
      this._layers = {};
      this._panes = {};
      this._initLayout();
      this._initEvents();
      this.setView(toLatLng(this.options.center), this.options.zoom);
      this.options.layers.forEach(layer => this.addLayer(layer));
      this._loaded = true;
      this.fire('load');
    }

    // View methods
    setView(center, zoom, options) {
      center = toLatLng(center);
      zoom = this._limitZoom(zoom);
      this._stop();
      this._resetView(center, zoom);
      this.fire('moveend', { target: this });
      return this;
    }
    getCenter() { return this.layerPointToLatLng(this._getCenterLayerPoint()); }
    getZoom() { return this._zoom; }
    getBounds() {
      const bounds = this.getPixelBounds();
      return new LatLngBounds(this.unproject(bounds.getBottomLeft()), this.unproject(bounds.getTopRight()));
    }
    _limitZoom(zoom) { return Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom)); }

    // Layer methods
    addLayer(layer) {
      const id = stamp(layer);
      if (this._layers[id]) { return this; }
      this._layers[id] = layer;
      layer.onAdd(this);
      this.fire('layeradd', { layer });
      return this;
    }
    removeLayer(layer) {
      const id = stamp(layer);
      if (!this._layers[id]) { return this; }
      layer.onRemove(this);
      delete this._layers[id];
      this.fire('layerremove', { layer });
      return this;
    }
    hasLayer(layer) { return stamp(layer) in this._layers; }

    // Projections and conversions
    project(latlng, zoom) {
      zoom = zoom === undefined ? this._zoom : zoom;
      return this.options.crs.transformation.transform(this.options.crs.projection.project(toLatLng(latlng)), this.options.crs.scale(zoom));
    }
    unproject(point, zoom) {
      zoom = zoom === undefined ? this._zoom : zoom;
      return this.options.crs.projection.unproject(this.options.crs.transformation.untransform(toPoint(point), this.options.crs.scale(zoom)));
    }
    latLngToLayerPoint(latlng) { return this.project(latlng)._round()._subtract(this.getPixelOrigin()); }
    layerPointToLatLng(point) { return this.unproject(toPoint(point).add(this.getPixelOrigin())); }
    containerPointToLayerPoint(point) { return toPoint(point).subtract(this._getMapPanePos()); }

    // Other public methods
    getSize() { return new Point(this._container.clientWidth, this._container.clientHeight); }
    getPixelOrigin() { return this._pixelOrigin; }
    getPixelBounds() {
      const topLeft = this.getPixelOrigin();
      const size = this.getSize();
      return new Bounds(topLeft, topLeft.add(size));
    }
    getPane(name) { return this._panes[name]; }

    // Internal methods
    _initLayout() {
      const container = this._container;
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      addClass(container, 'atlas-container');
      this._mapPane = this.createPane('mapPane', container);
      this.createPane('tilePane');
      this.createPane('overlayPane');
      this.createPane('shadowPane');
      this.createPane('markerPane');
      this.createPane('popupPane');
    }
    createPane(name, container) {
      return this._panes[name] = create$1('div', `atlas-pane atlas-${name.replace('Pane', '-pane')}`, container || this._mapPane);
    }
    _initEvents() {
      if (this.options.trackResize) {
        window.addEventListener('resize', this._onResize.bind(this));
      }
      // Add other events (click, move, etc.)
    }
    _onResize() {
      this.fire('resize');
      this._resetView(this.getCenter(), this.getZoom());
    }
    _resetView(center, zoom) {
      const viewHalf = this.getSize().divideBy(2);
      this._pixelOrigin = this.project(center)._subtract(viewHalf)._round();
      this._zoom = zoom;
      this._lastCenter = center;

      setPosition(this._mapPane, this._pixelOrigin.multiplyBy(-1).round());

      this.fire('viewreset');
      this.fire('move');
    }
    _getCenterLayerPoint() { return this.getSize().divideBy(2); }
    _getMapPanePos() { return getPosition(this._mapPane); }
    _stop() { /* stop animations */ }
  }


  // ===============
  // TILE LAYER
  // ===============
  class TileLayer extends Layer {
    static defaults = {
        tileSize: 256,
        opacity: 1,
        updateWhenIdle: Browser.mobile,
        updateWhenZooming: true,
        updateInterval: 200,
        zIndex: 1,
        bounds: null,
        minZoom: 0,
        maxZoom: 18,
        subdomains: 'abc',
        errorTileUrl: '',
        zoomOffset: 0,
        tms: false,
        zoomReverse: false,
        detectRetina: false,
        noWrap: false,
        pane: 'tilePane',
        className: '',
        keepBuffer: 2
    };

    constructor(url, options) {
        super(options);
        this._url = url;
        this.options = setOptions(this, { ...TileLayer.defaults, ...options });
        if (this.options.detectRetina && Browser.retina && this.options.maxZoom > 0) {
            this.options.zoomOffset++;
        }
        if (typeof this.options.subdomains === 'string') {
            this.options.subdomains = this.options.subdomains.split('');
        }
    }

    onAdd(map) {
        super.onAdd(map);
        this._initContainer();
        this._tiles = {};
        this._update();
    }

    onRemove(map) {
        this._removeAllTiles();
        remove(this._container);
        this._container = null;
        super.onRemove(map);
    }

    getEvents() {
        const events = {
            viewreset: this._update,
            zoom: this._update,
            moveend: this._update,
        };
        if (this._map && this._map.options.markerZoomAnimation) {
            events.zoomanim = this._animateZoom;
        }
        return events;
    }

    _initContainer() {
        if (this._container) return;
        this._container = create$1('div', 'atlas-layer ' + this.options.className, this.getPane());
        this._updateZIndex();
        if (this.options.opacity < 1) {
            setOpacity(this._container, this.options.opacity);
        }
    }

    _updateZIndex() {
        if (this._container && this.options.zIndex !== undefined) {
            this._container.style.zIndex = this.options.zIndex;
        }
    }

    _update() {
        if (!this._map) return;
        const bounds = this._map.getPixelBounds();
        const zoom = this._map.getZoom();
        const tileSize = this.options.tileSize;

        if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
            this._removeAllTiles();
            return;
        }

        const tileRange = new Bounds(
            bounds.min.divideBy(tileSize).floor(),
            bounds.max.divideBy(tileSize).floor()
        );

        for (const key in this._tiles) {
            this._tiles[key].current = false;
        }

        for (let j = tileRange.min.y; j <= tileRange.max.y; j++) {
            for (let i = tileRange.min.x; i <= tileRange.max.x; i++) {
                const coords = new Point(i, j);
                coords.z = zoom;
                const key = this._tileCoordsToKey(coords);
                if (this._tiles[key]) {
                    this._tiles[key].current = true;
                } else {
                    this._addTile(key, coords);
                }
            }
        }

        for (const key in this._tiles) {
            if (!this._tiles[key].current) {
                this._removeTile(key);
            }
        }
    }

    _tileCoordsToKey(coords) {
        return `${coords.x}:${coords.y}:${coords.z}`;
    }

    _removeTile(key) {
        const tile = this._tiles[key];
        if (!tile) return;
        remove(tile.el);
        delete this._tiles[key];
        this.fire('tileunload', { tile: tile.el });
    }

    _removeAllTiles() {
        for (const key in this._tiles) {
            this._removeTile(key);
        }
    }

    _addTile(key, coords) {
        const tile = {
            el: create$1('img', 'atlas-tile'),
            coords: coords,
            current: true
        };

        const img = tile.el;
        img.style.width = img.style.height = `${this.options.tileSize}px`;
        img.style.position = 'absolute';

        const pos = coords.scaleBy(this.options.tileSize).subtract(this._map.getPixelOrigin());
        setPosition(img, pos);

        this._tiles[key] = tile;
        img.onload = () => {
            addClass(img, 'atlas-tile-loaded');
            this.fire('tileload', { tile: img, coords: coords });
        };
        img.onerror = () => {
            this.fire('tileerror', { tile: img, coords: coords });
            const errorUrl = this.options.errorTileUrl;
            if (errorUrl && img.src !== errorUrl) img.src = errorUrl;
        };

        img.src = this._getTileUrl(coords);
        this._container.appendChild(img);
    }

    _animateZoom(e) {
        for (const key in this._tiles) {
            const tile = this._tiles[key];
            const coords = tile.coords;
            const pos = coords.scaleBy(this.options.tileSize).subtract(this._map.getPixelOrigin());
            const scale = this._map.getZoomScale(e.detail.zoom, coords.z);
            const newPos = pos.multiplyBy(scale).subtract(this._map._getCenterOffset(e.detail.center)._divideBy(1 - 1/scale));
            setTransform(tile.el, newPos, scale);
        }
    }

    _getTileUrl(coords) {
        const data = {
            r: Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: this._getZoomForUrl(coords.z)
        };
        return template(this._url, extend(data, this.options));
    }

    _getSubdomain(tilePoint) {
        const index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
        return this.options.subdomains[index];
    }

    _getZoomForUrl(zoom) {
        if (this.options.zoomReverse) {
            zoom = this.options.maxZoom - zoom;
        }
        return zoom + this.options.zoomOffset;
    }
  }


  // ===============
  // EXPORTS
  // ===============
  exports.version = "1.0.0-refactored";
  exports.Map = Map;
  exports.TileLayer = TileLayer;
  exports.LatLng = LatLng;
  exports.LatLngBounds = LatLngBounds;
  exports.Point = Point;
  exports.Bounds = Bounds;
  exports.Util = { extend, bind, stamp, throttle, formatNum, setOptions, template };
  exports.CRS = { EPSG3857, EPSG4326 };

}));