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
}

class Map extends EventEmitter {
  constructor(element) {
    super();
    this.element = element;
    this.layers = new Set();
  }
  addLayer(layer) {
    this.layers.add(layer);
    return this;
  }
}

class Marker extends Layer {
  constructor(latlng) {
    super();
    this.latlng = latlng;
  }
}

// Export everything
export { Map, Layer, Marker, LatLng, EventEmitter };