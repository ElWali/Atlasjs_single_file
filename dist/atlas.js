(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Atlas = {}));
})(this, (function (exports) { 'use strict';

  // Everything in one file to eliminate circular deps

  class EventEmitter {
    constructor() {
      this.events = {};
    }
    on(event, handler) {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(handler);
    }
    emit(event, data) {
      if (this.events[event]) {
        this.events[event].forEach(h => h(data));
      }
    }
  }

  class LatLng {
    constructor(lat, lng) {
      this.lat = lat;
      this.lng = lng;
    }
  }

  class Bounds {
    constructor(sw, ne) {
      this.sw = sw;
      this.ne = ne;
    }
  }

  class Layer extends EventEmitter {
    constructor() {
      super();
      this.map = null;
    }
    addTo(map) {
      this.map = map;
      map.addLayer(this);
      return this;
    }
    onAdd(map) {
      // to be implemented by subclasses
    }
    onRemove(map) {
      // to be implemented by subclasses
    }
  }

  class Map extends EventEmitter {
    constructor(element, options = {}) {
      super();
      this.element = element;
      this.options = options;
      this.layers = new Set();
    }

    addLayer(layer) {
      this.layers.add(layer);
      if (layer.onAdd) {
        layer.onAdd(this);
      }
      return this;
    }

    removeLayer(layer) {
      this.layers.delete(layer);
      if (layer.onRemove) {
        layer.onRemove(this);
      }
      return this;
    }
  }

  class Marker extends Layer {
    constructor(latlng) {
      super();
      this.latlng = latlng;
    }
  }

  class TileLayer extends Layer {
      constructor(urlTemplate, options) {
          super();
          this.urlTemplate = urlTemplate;
          this.options = options;
      }
  }

  class Circle extends Layer {
      constructor(latlng, radius, options) {
          super();
          this.latlng = latlng;
          this.radius = radius;
          this.options = options;
      }
  }

  class Polyline extends Layer {
      constructor(latlngs, options) {
          super();
          this.latlngs = latlngs;
          this.options = options;
      }
  }

  class Polygon extends Layer {
      constructor(latlngs, options) {
          super();
          this.latlngs = latlngs;
          this.options = options;
      }
  }

  class GeoJSON extends Layer {
      constructor(data, options) {
          super();
          this.data = data;
          this.options = options;
      }
  }

  class Control {
      constructor(options) {
          this.options = options;
      }
  }

  class Zoom extends Control {
      constructor(options) {
          super(options);
      }
  }

  exports.Bounds = Bounds;
  exports.Circle = Circle;
  exports.Control = Control;
  exports.EventEmitter = EventEmitter;
  exports.GeoJSON = GeoJSON;
  exports.LatLng = LatLng;
  exports.Layer = Layer;
  exports.Map = Map;
  exports.Marker = Marker;
  exports.Polygon = Polygon;
  exports.Polyline = Polyline;
  exports.TileLayer = TileLayer;
  exports.Zoom = Zoom;

}));
