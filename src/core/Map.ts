/* eslint-disable @typescript-eslint/no-explicit-any */
import { Evented } from './Evented';
import { setOptions, extend, bind, cancelAnimFrame, requestAnimFrame, stamp } from '../utils/Util';
import { LatLng, toLatLng, LatLngBounds, toLatLngBounds } from '../geo/LatLng';
import { Point, toPoint } from '../geo/Point';
import { Bounds } from '../geo/Bounds';
import * as DomUtil from '../utils/DomUtil';
import { on, off, getMousePosition, preventDefault } from '../utils/DomEvent';
import { Browser } from '../utils/Browser';
import { PosAnimation } from './PosAnimation';
import { EPSG3857 } from '../geo/crs/CRS.EPSG3857';
import { Zoom } from '../controls/Control.Zoom';

export class Map extends Evented {
  _handlers: any[];
  _layers: any;
  _zoomBoundLayers: any;
  _sizeChanged: boolean;
  _container!: HTMLElement;
  _mapPane!: HTMLElement;
  _containerId!: number;
  _zoom!: number;
  _loaded = false;
  _zoomAnimated!: boolean;
  _proxy!: HTMLElement;
  _panAnim: any;
  _lastCenter!: LatLng | null;
  _pixelOrigin!: Point;
  _panes: any;
  _fadeAnimated!: boolean;
  _size!: Point;
  _sizeTimer!: ReturnType<typeof setTimeout>;
  _flyToFrame!: number;
  _enforcingBounds = false;
  _locateOptions: any;
  _locationWatchId!: number;
  _renderer: any;
  _animatingZoom = false;
  _animateToCenter!: LatLng;
  _animateToZoom!: number;
  _tempFireZoomEvent = false;
  dragging: any;
  boxZoom: any;
  options: any;
  _targets: any;
  _clearControlPos: any;
  _resizeRequest: any;
  zoomControl: any;
  attributionControl: any;
  _panInsideMaxBounds: any;

  constructor(id: string | HTMLElement, options?: any) {
    super();
    this.options = {
      crs: EPSG3857,
      center: undefined,
      zoom: undefined,
      minZoom: undefined,
      maxZoom: undefined,
      layers: [],
      maxBounds: undefined,
      renderer: undefined,
      zoomAnimation: true,
      zoomAnimationThreshold: 4,
      fadeAnimation: true,
      markerZoomAnimation: true,
      transform3DLimit: 8388608,
      zoomSnap: 1,
      zoomDelta: 1,
      trackResize: true,
    };
    setOptions(this, options);
    this._handlers = [];
    this._layers = {};
    this._zoomBoundLayers = {};
    this._sizeChanged = true;
    this._initContainer(id);
    this._initLayout();
    this._onResize = bind(this._onResize, this) as () => void;
    this._initEvents();
    if (this.options.maxBounds) {
      this.setMaxBounds(this.options.maxBounds);
    }
    if (this.options.zoom !== undefined) {
      this._zoom = this._limitZoom(this.options.zoom);
    }
    if (this.options.center && this.options.zoom !== undefined) {
      this._setView(toLatLng(this.options.center), this.options.zoom, {
        reset: true,
      });
    }
    (this as any).callInitHooks();
    this._zoomAnimated =
      DomUtil.TRANSITION &&
      Browser.any3d &&
      !Browser.mobileOpera &&
      this.options.zoomAnimation;
    if (this._zoomAnimated) {
      this._createAnimProxy();
      on(this._proxy, DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
    }
    this._addLayers(this.options.layers);
  }

  _addLayers(layers: any): void {
    layers = layers ? (Array.isArray(layers) ? layers : [layers]) : [];
    for (let i = 0, len = layers.length; i < len; i++) {
      // @ts-ignore
      this.addLayer(layers[i]);
    }
  }

  _setView(center: LatLng, zoom?: number, options?: any): this {
    zoom = zoom === undefined ? this.getZoom() : this._limitZoom(zoom);
    center = this._limitCenter(
      toLatLng(center),
      zoom,
      (this as any).options.maxBounds,
    );
    options = options || {};
    this._stop();
    if (this._loaded && !options.reset && options !== true) {
      if (options.animate !== undefined) {
        options.zoom = extend({ animate: options.animate }, options.zoom);
        options.pan = extend(
          { animate: options.animate, duration: options.duration },
          options.pan,
        );
      }
      const moved =
        this._zoom !== zoom
          ? this._tryAnimatedZoom &&
            this._tryAnimatedZoom(center, zoom, options.zoom)
          : this._tryAnimatedPan(center, options.pan);
      if (moved) {
        clearTimeout(this._sizeTimer);
        return this;
      }
    }
    this._resetView(center, zoom, options.pan && options.pan.noMoveStart);
    return this;
  }

  centerOn(latlng: LatLng, zoom?: number): this {
    this._setView(latlng, zoom);
    return this;
  }

  setZoom(zoom: number, options?: any): this {
    if (!this._loaded) {
      this._zoom = zoom;
      return this;
    }
    return this._setView(this.getCenter(), zoom, { zoom: options });
  }

  zoomIn(delta?: number, options?: any): this {
    delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
    return this.setZoom(this.getZoom() + (delta || 0), options);
  }

  zoomOut(delta?: number, options?: any): this {
    delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
    return this.setZoom(this.getZoom() - (delta || 0), options);
  }

  setZoomAround(latlng: LatLng | Point, zoom: number, options?: any): this {
    const scale = this.getZoomScale(zoom);
    const viewHalf = this.getSize().divideBy(2);
    const containerPoint =
      latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng);
    const centerOffset = containerPoint
      .subtract(viewHalf)
      .multiplyBy(1 - 1 / scale);
    const newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
    return this._setView(newCenter, zoom, { zoom: options });
  }

  _getBoundsCenterZoom(bounds: LatLngBounds, options?: any): any {
    options = options || {};
    const bounds_ = (bounds as any).getBounds
      ? (bounds as any).getBounds()
      : toLatLngBounds(bounds as any);
    const paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]);
    const paddingBR = toPoint(
      options.paddingBottomRight || options.padding || [0, 0],
    );
    let zoom = this.getBoundsZoom(bounds_, false, paddingTL.add(paddingBR));
    zoom =
      typeof options.maxZoom === 'number'
        ? Math.min(options.maxZoom, zoom)
        : zoom;
    if (zoom === Infinity) {
      return {
        center: bounds_.getCenter(),
        zoom: zoom,
      };
    }
    const paddingOffset = paddingBR.subtract(paddingTL).divideBy(2);
    const swPoint = this.project(bounds_.getSouthWest(), zoom);
    const nePoint = this.project(bounds_.getNorthEast(), zoom);
    const center = this.unproject(
      swPoint.add(nePoint).divideBy(2).add(paddingOffset),
      zoom,
    );
    return {
      center: center,
      zoom: zoom,
    };
  }

  fitBounds(bounds: LatLngBounds, options?: any): this {
    const bounds_ = toLatLngBounds(bounds as any);
    if (!bounds_.isValid()) {
      throw new Error('Bounds are not valid.');
    }
    const target = this._getBoundsCenterZoom(bounds_, options);
    return this._setView(target.center, target.zoom, options);
  }

  fitWorld(options?: any): this {
    return this.fitBounds(
      new LatLngBounds(new LatLng(-90, -180), new LatLng(90, 180)),
      options,
    );
  }

  panTo(center: LatLng, options?: any): this {
    return this._setView(center, this._zoom, { pan: options });
  }

  panBy(offset: Point, options?: any): this {
    offset = toPoint(offset).round();
    options = options || {};
    if (!offset.x && !offset.y) {
      return this.fire('moveend');
    }
    if (options.animate !== true && !this.getSize().contains(offset)) {
      this._resetView(
        this.unproject(this.project(this.getCenter()).add(offset)),
        this.getZoom(),
      );
      return this;
    }
    if (!this._panAnim) {
      this._panAnim = new PosAnimation();
      this._panAnim.on(
        {
          step: this._onPanTransitionStep,
          end: this._onPanTransitionEnd,
        },
        this,
      );
    }
    if (!options.noMoveStart) {
      this.fire('movestart');
    }
    if (options.animate !== false) {
      DomUtil.addClass(this._mapPane, 'atlas-pan-anim');
      const newPos = this._getMapPanePos().subtract(offset).round();
      this._panAnim.run(
        this._mapPane,
        newPos,
        options.duration || 0.25,
        options.easeLinearity,
      );
    } else {
      this._rawPanBy(offset);
      this.fire('move').fire('moveend');
    }
    return this;
  }

  flyTo(targetCenter: LatLng, targetZoom?: number, options?: any): this {
    options = options || {};
    if (options.animate === false || !Browser.any3d) {
      return this._setView(targetCenter, targetZoom, options);
    }
    this._stop();
    const from = this.project(this.getCenter());
    const to = this.project(targetCenter);
    const size = this.getSize();
    const startZoom = this._zoom;
    targetCenter = toLatLng(targetCenter);
    targetZoom = targetZoom === undefined ? startZoom : (targetZoom as number);
    const w0 = Math.max(size.x, size.y);
    const w1 = w0 * this.getZoomScale(startZoom, targetZoom);
    const u1 = to.distanceTo(from) || 1;
    const rho = 1.42;
    const rho2 = rho * rho;
    function r(i: number): number {
      const s1 = i ? -1 : 1;
      const s2 = i ? w1 : w0;
      const t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1;
      const b1 = 2 * s2 * rho2 * u1;
      const b = t1 / b1;
      const sq = Math.sqrt(b * b + 1) - b;
      const log = sq < 0.000000001 ? -18 : Math.log(sq);
      return log;
    }
    function sinh(n: number): number {
      return (Math.exp(n) - Math.exp(-n)) / 2;
    }
    function cosh(n: number): number {
      return (Math.exp(n) + Math.exp(-n)) / 2;
    }
    function tanh(n: number): number {
      return sinh(n) / cosh(n);
    }
    const r0 = r(0);
    function w(s: number): number {
      return w0 * (cosh(r0) / cosh(r0 + rho * s));
    }
    function u(s: number): number {
      return (w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0))) / rho2;
    }
    function easeOut(t: number): number {
      return 1 - Math.pow(1 - t, 1.5);
    }
    const start = Date.now();
    const S = (r(1) - r0) / rho;
    const duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;
    const frame = (): void => {
      const t = (Date.now() - start) / duration;
      const s = easeOut(t) * S;
      if (t <= 1) {
        this._flyToFrame = requestAnimFrame(frame, this);
        this._move(
          this.unproject(from.add(to.subtract(from).multiplyBy(u(s) / u1)), startZoom),
          this.getScaleZoom(w0 / w(s), startZoom),
          { flyTo: true },
        );
      } else {
        this._move(targetCenter, targetZoom)._moveEnd(true);
      }
    };
    this._moveStart(true, options.noMoveStart);
    frame.call(this);
    return this;
  }

  flyToBounds(bounds: LatLngBounds, options?: any): this {
    const target = this._getBoundsCenterZoom(bounds, options);
    return this.flyTo(target.center, target.zoom, options);
  }

  setMaxBounds(bounds: LatLngBounds): this {
    const bounds_ = toLatLngBounds(bounds as any);
    if (this.listens('moveend')) {
      this.off('moveend', this._panInsideMaxBounds);
    }
    if (!bounds_.isValid()) {
      (this as any).options.maxBounds = null;
      return this;
    }
    (this as any).options.maxBounds = bounds_;
    if (this._loaded) {
      this._panInsideMaxBounds();
    }
    return this.on('moveend', this._panInsideMaxBounds);
  }

  setMinZoom(zoom: number): this {
    const oldZoom = (this as any).options.minZoom;
    (this as any).options.minZoom = zoom;
    if (this._loaded && oldZoom !== zoom) {
      this.fire('zoomlevelschange');
      if (this.getZoom() < (this as any).options.minZoom) {
        return this.setZoom(zoom);
      }
    }
    return this;
  }

  setMaxZoom(zoom: number): this {
    const oldZoom = (this as any).options.maxZoom;
    (this as any).options.maxZoom = zoom;
    if (this._loaded && oldZoom !== zoom) {
      this.fire('zoomlevelschange');
      if (this.getZoom() > (this as any).options.maxZoom) {
        return this.setZoom(zoom);
      }
    }
    return this;
  }

  panInsideBounds(bounds: LatLngBounds, options?: any): this {
    this._enforcingBounds = true;
    const center = this.getCenter();
    const newCenter = this._limitCenter(
      center,
      this._zoom,
      toLatLngBounds(bounds as any),
    );
    if (center && !center.equals(newCenter)) {
      this.panTo(newCenter, options);
    }
    this._enforcingBounds = false;
    return this;
  }

  panInside(latlng: LatLng, options?: any): this {
    options = options || {};
    const paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]);
    const paddingBR = toPoint(
      options.paddingBottomRight || options.padding || [0, 0],
    );
    const pixelCenter = this.project(this.getCenter());
    const pixelPoint = this.project(latlng);
    const pixelBounds = this.getPixelBounds();
    const paddedBounds = new Bounds(
      pixelBounds.min.add(paddingTL),
      pixelBounds.max.subtract(paddingBR),
    );
    const paddedSize = paddedBounds.getSize();
    if (!paddedBounds.contains(pixelPoint as any)) {
      this._enforcingBounds = true;
      const centerOffset = (pixelPoint as any).subtract(paddedBounds.getCenter());
      const offset = paddedBounds
        .extend(pixelPoint as any)
        .getSize()
        .subtract(paddedSize);
      (pixelCenter as any).x += centerOffset.x < 0 ? -offset.x : offset.x;
      (pixelCenter as any).y += centerOffset.y < 0 ? -offset.y : offset.y;
      this.panTo(this.unproject(pixelCenter as any), options);
      this._enforcingBounds = false;
    }
    return this;
  }

  invalidateSize(options?: any): this {
    if (!this._loaded) {
      return this;
    }
    options = extend(
      {
        animate: false,
        pan: true,
      },
      options === true ? { animate: true } : options,
    );
    const oldSize = this.getSize();
    this._sizeChanged = true;
    this._lastCenter = null;
    const newSize = this.getSize();
    const oldCenter = oldSize.divideBy(2).round();
    const newCenter = newSize.divideBy(2).round();
    const offset = oldCenter.subtract(newCenter);
    if (!offset.x && !offset.y) {
      return this;
    }
    if (options.animate && options.pan) {
      this.panBy(offset);
    } else {
      if (options.pan) {
        this._rawPanBy(offset);
      }
      this.fire('move');
      if (options.debounceMoveend) {
        clearTimeout(this._sizeTimer);
        this._sizeTimer = setTimeout(() => this.fire('moveend'), 200);
      } else {
        this.fire('moveend');
      }
    }
    return this.fire('resize', {
      oldSize: oldSize,
      newSize: newSize,
    });
  }

  stop(): this {
    this.setZoom(this._limitZoom(this._zoom));
    if (!(this as any).options.zoomSnap) {
      this.fire('viewreset');
    }
    return this._stop();
  }

  locate(options?: any): this {
    options = this._locateOptions = extend(
      {
        timeout: 10000,
        watch: false,
      },
      options,
    );
    if (!('geolocation' in navigator)) {
      this._handleGeolocationError({
        code: 0,
        message: 'Geolocation not supported.',
      });
      return this;
    }
    const onResponse = bind(this._handleGeolocationResponse, this) as any;
    const onError = bind(this._handleGeolocationError, this) as any;
    if (options.watch) {
      this._locationWatchId = navigator.geolocation.watchPosition(
        onResponse,
        onError,
        options,
      );
    } else {
      navigator.geolocation.getCurrentPosition(onResponse, onError, options);
    }
    return this;
  }

  stopLocate(): this {
    if (navigator.geolocation && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(this._locationWatchId);
    }
    if (this._locateOptions) {
      this._locateOptions.setView = false;
    }
    return this;
  }

  _handleGeolocationError(error: any): void {
    if (!this._container) {
      return;
    }
    const c = error.code;
    const message =
      error.message ||
      (c === 1
        ? 'permission denied'
        : c === 2
        ? 'position unavailable'
        : 'timeout');
    if (this._locateOptions.setView && !this._loaded) {
      this.fitWorld();
    }
    this.fire('locationerror', {
      code: c,
      message: 'Geolocation error: ' + message + '.',
    });
  }

  _handleGeolocationResponse(pos: any): void {
    if (!this._container) {
      return;
    }
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const latlng = new LatLng(lat, lng);
    const bounds = latlng.toBounds(pos.coords.accuracy * 2);
    const options = this._locateOptions;
    if (options.setView) {
      const zoom = this.getBoundsZoom(bounds as any);
      this._setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
    }
    const data: any = {
      latlng: latlng,
      bounds: bounds,
      timestamp: pos.timestamp,
    };
    for (const i in pos.coords) {
      if (typeof pos.coords[i] === 'number') {
        data[i] = pos.coords[i];
      }
    }
    this.fire('locationfound', data);
  }

  addHandler(name: string, HandlerClass: any): this {
    if (!HandlerClass) {
      return this;
    }
    const handler = ((this as any)[name] = new HandlerClass(this));
    this._handlers.push(handler);
    if ((this as any).options[name]) {
      handler.enable();
    }
    return this;
  }

  remove(): this {
    this._initEvents(true);
    if ((this as any).options.maxBounds) {
      this.off('moveend', this._panInsideMaxBounds);
    }
    // @ts-ignore
    if (this._containerId !== this._container._atlas_id) {
      throw new Error('Map container is being reused by another instance');
    }
    try {
      // @ts-ignore
      delete this._container._atlas_id;
      // @ts-ignore
      delete this._containerId;
    } catch (e) {
      // @ts-ignore
      this._container._atlas_id = undefined;
      this._containerId = undefined as any;
    }
    if (this._locationWatchId !== undefined) {
      this.stopLocate();
    }
    this._stop();
    DomUtil.remove(this._mapPane);
    if ((this as any)._clearControlPos) {
      (this as any)._clearControlPos();
    }
    if ((this as any)._resizeRequest) {
      cancelAnimFrame((this as any)._resizeRequest);
      (this as any)._resizeRequest = null;
    }
    this._clearHandlers();
    if (this._loaded) {
      this.fire('unload');
    }
    let i;
    for (i in this._layers) {
      this._layers[i].remove();
    }
    for (i in this._panes) {
      DomUtil.remove(this._panes[i]);
    }
    this._layers = [];
    this._panes = [];
    // @ts-ignore
    delete this._mapPane;
    // @ts-ignore
    delete this._renderer;
    return this;
  }

  createPane(name: string, container?: HTMLElement): HTMLElement {
    const className =
      'atlas-pane' + (name ? ' atlas-' + name.replace('Pane', '') + '-pane' : '');
    const pane = DomUtil.create('div', className, container || this._mapPane);
    if (name) {
      this._panes[name] = pane;
    }
    return pane;
  }

  getCenter(): LatLng {
    this._checkIfLoaded();
    if (this._lastCenter && !this._moved()) {
      return this._lastCenter.clone() as LatLng;
    }
    return this.layerPointToLatLng(this._getCenterLayerPoint());
  }

  getZoom(): number {
    return this._zoom;
  }

  getBounds(): LatLngBounds {
    const bounds = this.getPixelBounds();
    const sw = this.unproject(bounds.getBottomLeft());
    const ne = this.unproject(bounds.getTopRight());
    return new LatLngBounds(sw, ne);
  }

  getMinZoom(): number {
    return (this as any).options.minZoom === undefined
      ? (this as any)._layersMinZoom || 0
      : (this as any).options.minZoom;
  }

  getMaxZoom(): number {
    return (this as any).options.maxZoom === undefined
      ? (this as any)._layersMaxZoom === undefined
        ? Infinity
        : (this as any)._layersMaxZoom
      : (this as any).options.maxZoom;
  }

  getBoundsZoom(bounds: LatLngBounds, inside?: boolean, padding?: Point): number {
    const bounds_ = toLatLngBounds(bounds as any);
    padding = toPoint(padding || [0, 0]);
    let zoom = this.getZoom() || 0;
    const min = this.getMinZoom();
    const max = this.getMaxZoom();
    const nw = bounds_.getNorthWest();
    const se = bounds_.getSouthEast();
    const size = this.getSize().subtract(padding);
    const boundsSize = new Bounds(
      this.project(se, zoom),
      this.project(nw, zoom),
    ).getSize();
    const snap = Browser.any3d ? (this as any).options.zoomSnap : 1;
    const scalex = size.x / boundsSize.x;
    const scaley = size.y / boundsSize.y;
    const scale = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
    zoom = this.getScaleZoom(scale, zoom);
    if (snap) {
      zoom = Math.round(zoom / (snap / 100)) * (snap / 100);
      zoom = inside
        ? Math.ceil(zoom / snap) * snap
        : Math.floor(zoom / snap) * snap;
    }
    return Math.max(min, Math.min(max, zoom));
  }

  getSize(): Point {
    if (!this._size || this._sizeChanged) {
      this._size = new Point(
        this._container.clientWidth || 0,
        this._container.clientHeight || 0,
      );
      this._sizeChanged = false;
    }
    return this._size.clone();
  }

  getPixelBounds(center?: LatLng, zoom?: number): Bounds {
    const topLeftPoint = this._getTopLeftPoint(center, zoom);
    return new Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
  }

  getPixelOrigin(): Point {
    this._checkIfLoaded();
    return this._pixelOrigin;
  }

  getPixelWorldBounds(zoom?: number): Bounds {
    return (this as any).options.crs.getProjectedBounds(
      zoom === undefined ? this.getZoom() : zoom,
    );
  }

  getPane(pane: string | HTMLElement): HTMLElement {
    return typeof pane === 'string' ? this._panes[pane] : pane;
  }

  getPanes(): any {
    return this._panes;
  }

  getContainer(): HTMLElement {
    return this._container;
  }

  getZoomScale(toZoom: number, fromZoom?: number): number {
    const crs = (this as any).options.crs;
    fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
    return crs.scale(toZoom) / crs.scale(fromZoom);
  }

  getScaleZoom(scale: number, fromZoom?: number): number {
    const crs = (this as any).options.crs;
    fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
    const zoom = crs.zoom(scale * crs.scale(fromZoom));
    return isNaN(zoom) ? Infinity : zoom;
  }

  project(latlng: LatLng, zoom?: number): Point {
    zoom = zoom === undefined ? this._zoom : zoom;
    return (this as any).options.crs.latLngToPoint(toLatLng(latlng), zoom);
  }

  unproject(point: Point, zoom?: number): LatLng {
    zoom = zoom === undefined ? this._zoom : zoom;
    return (this as any).options.crs.pointToLatLng(toPoint(point), zoom);
  }

  layerPointToLatLng(point: Point): LatLng {
    const projectedPoint = toPoint(point).add(this.getPixelOrigin());
    return this.unproject(projectedPoint);
  }

  latLngToLayerPoint(latlng: LatLng): Point {
    const projectedPoint = this.project(toLatLng(latlng))._round();
    return projectedPoint._subtract(this.getPixelOrigin());
  }

  wrapLatLng(latlng: LatLng): LatLng {
    return (this as any).options.crs.wrapLatLng(toLatLng(latlng));
  }

  wrapLatLngBounds(latlng: LatLngBounds): LatLngBounds {
    return (this as any).options.crs.wrapLatLngBounds(toLatLngBounds(latlng as any));
  }

  distance(latlng1: LatLng, latlng2: LatLng): number {
    return (this as any).options.crs.distance(toLatLng(latlng1), toLatLng(latlng2));
  }

  containerPointToLayerPoint(point: Point): Point {
    return toPoint(point).subtract(this._getMapPanePos());
  }

  layerPointToContainerPoint(point: Point): Point {
    return toPoint(point).add(this._getMapPanePos());
  }

  containerPointToLatLng(point: Point): LatLng {
    const layerPoint = this.containerPointToLayerPoint(toPoint(point));
    return this.layerPointToLatLng(layerPoint);
  }

  latLngToContainerPoint(latlng: LatLng): Point {
    return this.layerPointToContainerPoint(this.latLngToLayerPoint(toLatLng(latlng)));
  }

  mouseEventToContainerPoint(e: any): Point {
    return getMousePosition(e, this._container);
  }

  mouseEventToLayerPoint(e: any): Point {
    return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
  }

  mouseEventToLatLng(e: any): LatLng {
    return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
  }

  _initContainer(id: string | HTMLElement): void {
    const container = (this._container = DomUtil.get(id));
    if (!container) {
      throw new Error('Map container not found.');
    } else if ((container as any)._atlas_id) {
      throw new Error('Map container is already initialized.');
    }
    on(container, 'scroll', this._onScroll, this);
    this._containerId = stamp(container);
  }

  _initLayout(): void {
    const container = this._container;
    this._fadeAnimated = (this as any).options.fadeAnimation && Browser.any3d;
    DomUtil.addClass(
      container,
      'atlas-container' +
        (Browser.touch ? ' atlas-touch' : '') +
        (Browser.retina ? ' atlas-retina' : '') +
        (Browser.ielt9 ? ' atlas-oldie' : '') +
        (Browser.safari ? ' atlas-safari' : '') +
        (this._fadeAnimated ? ' atlas-fade-anim' : ''),
    );
    const position = DomUtil.getStyle(container, 'position');
    if (
      position !== 'absolute' &&
      position !== 'relative' &&
      position !== 'fixed' &&
      position !== 'sticky'
    ) {
      container.style.position = 'relative';
    }
    this._initPanes();
    if ((this as any)._initControlPos) {
      (this as any)._initControlPos();
    }
  }

  _initPanes(): void {
    const panes = (this._panes = {});
    (this as any)._paneRenderers = {};
    this._mapPane = this.createPane('mapPane', this._container);
    DomUtil.setPosition(this._mapPane, new Point(0, 0));
    this.createPane('tilePane');
    this.createPane('overlayPane');
    this.createPane('shadowPane');
    this.createPane('markerPane');
    this.createPane('tooltipPane');
    this.createPane('popupPane');
    if (!(this as any).options.markerZoomAnimation) {
      DomUtil.addClass(this._panes.markerPane, 'atlas-zoom-hide');
      DomUtil.addClass(this._panes.shadowPane, 'atlas-zoom-hide');
    }
  }

  _resetView(center: LatLng, zoom: number, noMoveStart?: boolean): void {
    DomUtil.setPosition(this._mapPane, new Point(0, 0));
    const loading = !this._loaded;
    this._loaded = true;
    zoom = this._limitZoom(zoom);
    this.fire('viewprereset');
    const zoomChanged = this._zoom !== zoom;
    this._moveStart(zoomChanged, noMoveStart)
      ._move(center, zoom, undefined)
      ._moveEnd(zoomChanged);
    this.fire('viewreset');
    if (loading) {
      this.fire('load');
    }
  }

  _moveStart(zoomChanged: boolean, noMoveStart?: boolean): this {
    if (zoomChanged) {
      this.fire('zoomstart');
    }
    if (!noMoveStart) {
      this.fire('movestart');
    }
    return this;
  }

  _move(center: LatLng, zoom?: number, data?: any, supressEvent?: boolean): this {
    if (zoom === undefined) {
      zoom = this._zoom;
    }
    const zoomChanged = this._zoom !== zoom;
    this._zoom = zoom;
    this._lastCenter = center;
    this._pixelOrigin = this._getNewPixelOrigin(center, zoom);
    if (!supressEvent) {
      if (zoomChanged || (data && data.pinch)) {
        this.fire('zoom', data);
      }
      this.fire('move', data);
    } else if (data && data.pinch) {
      this.fire('zoom', data);
    }
    return this;
  }

  _moveEnd(zoomChanged: boolean): this {
    if (zoomChanged) {
      this.fire('zoomend');
    }
    return this.fire('moveend');
  }

  _stop(): this {
    cancelAnimFrame(this._flyToFrame);
    if (this._panAnim) {
      this._panAnim.stop();
    }
    return this;
  }

  _rawPanBy(offset: Point): void {
    DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
  }

  _getZoomSpan(): number {
    return this.getMaxZoom() - this.getMinZoom();
  }

  _panInsideMaxBounds(): void {
    if (!this._enforcingBounds) {
      this.panInsideBounds((this as any).options.maxBounds);
    }
  }

  _checkIfLoaded(): void {
    if (!this._loaded) {
      throw new Error('Set map center and zoom first.');
    }
  }

  _initEvents(remove?: boolean): void {
    (this as any)._targets = {};
    (this as any)._targets[stamp(this._container)] = this;
    const onOff = remove ? off : on;
    onOff(
      this._container,
      'click dblclick mousedown mouseup ' +
        'mouseover mouseout mousemove contextmenu keypress keydown keyup',
      this._handleDOMEvent,
      this,
    );
    if ((this as any).options.trackResize) {
      onOff(window, 'resize', this._onResize, this);
    }
    if (Browser.any3d && (this as any).options.transform3DLimit) {
      (remove ? this.off : this.on).call(this, 'moveend', this._onMoveEnd);
    }
  }

  _onResize(): void {
    cancelAnimFrame((this as any)._resizeRequest);
    (this as any)._resizeRequest = requestAnimFrame(
      () => this.invalidateSize({ debounceMoveend: true }),
      this,
    );
  }

  _onScroll(): void {
    this._container.scrollTop = 0;
    this._container.scrollLeft = 0;
  }

  _onMoveEnd(): void {
    const pos = this._getMapPanePos();
    if (
      Math.abs(pos.x) >=
      (this as any).options.transform3DLimit
    ) {
      this._resetView(this.getCenter(), this.getZoom());
    }
  }

  _findEventTargets(e: any, type: string): any[] {
    const targets = [];
    let target;
    const isHover = type === 'mouseout' || type === 'mouseover';
    let src = e.target || e.srcElement;
    let dragging = false;
    while (src) {
      target = (this as any)._targets[stamp(src)];
      if (
        target &&
        (type === 'click' || type === 'preclick') &&
        this._draggableMoved(target)
      ) {
        dragging = true;
        break;
      }
      if (target && target.listens(type, true)) {
        if (isHover && DomUtil.isExternalTarget(src, e)) {
          break;
        }
        targets.push(target);
        if (isHover) {
          break;
        }
      }
      if (src === this._container) {
        break;
      }
      src = src.parentNode;
    }
    if (!targets.length && !dragging && !isHover && this.listens(type)) {
      targets.push(this);
    }
    return targets;
  }

  _isClickDisabled(el: HTMLElement): boolean {
    while (el && el !== this._container) {
      if ((el as any)['_atlas_disable_click']) {
        return true;
      }
      el = el.parentNode as HTMLElement;
    }
    return false;
  }

  _handleDOMEvent(e: any): void {
    const el = e.target || e.srcElement;
    if (
      !this._loaded ||
      el['_atlas_disable_events'] ||
      (e.type === 'click' && this._isClickDisabled(el))
    ) {
      return;
    }
    const type = e.type;
    if (type === 'mousedown') {
      DomUtil.preventOutline(el);
    }
    this._fireDOMEvent(e, type);
  }
  _mouseEvents: string[] = ['click', 'dblclick', 'mouseover', 'mouseout', 'contextmenu'];
  _fireDOMEvent(e: any, type: string, canvasTargets?: any[]): void {
    if (e.type === 'click') {
      const synth = extend({}, e);
      synth.type = 'preclick';
      this._fireDOMEvent(synth, synth.type, canvasTargets);
    }
    let targets = this._findEventTargets(e, type);
    if (canvasTargets) {
      const filtered = [];
      for (let i = 0; i < canvasTargets.length; i++) {
        if (canvasTargets[i].listens(type, true)) {
          filtered.push(canvasTargets[i]);
        }
      }
      targets = filtered.concat(targets);
    }
    if (!targets.length) {
      return;
    }
    if (type === 'contextmenu') {
      preventDefault(e);
    }
    const target = targets[0];
    const data: any = {
      originalEvent: e,
    };
    if (e.type !== 'keypress' && e.type !== 'keydown' && e.type !== 'keyup') {
      const isMarker =
        target.getLatLng && (!target._radius || target._radius <= 10);
      data.containerPoint = isMarker
        ? this.latLngToContainerPoint(target.getLatLng())
        : this.mouseEventToContainerPoint(e);
      data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
      data.latlng = isMarker
        ? target.getLatLng()
        : this.layerPointToLatLng(data.layerPoint);
    }
    for (let i = 0; i < targets.length; i++) {
      targets[i].fire(type, data, true);
      if (
        data.originalEvent._stopped ||
        (targets[i].options.bubblingMouseEvents === false &&
          indexOf(this._mouseEvents, type) !== -1)
      ) {
        return;
      }
    }
  }

  _draggableMoved(obj: any): boolean {
    obj = obj.dragging && obj.dragging.enabled() ? obj : this;
    return (
      (obj.dragging && obj.dragging.moved()) ||
      (this.boxZoom && this.boxZoom.moved())
    );
  }

  _clearHandlers(): void {
    for (let i = 0, len = this._handlers.length; i < len; i++) {
      this._handlers[i].disable();
    }
  }

  whenReady(callback: (e: { target: Map }) => void, context?: any): this {
    if (this._loaded) {
      callback.call(context || this, { target: this });
    } else {
      this.on('load', callback, context);
    }
    return this;
  }

  _getMapPanePos(): Point {
    return DomUtil.getPosition(this._mapPane) || new Point(0, 0);
  }

  _moved(): boolean {
    const pos = this._getMapPanePos();
    return pos && !pos.equals(new Point(0, 0));
  }

  _getTopLeftPoint(center?: LatLng, zoom?: number): Point {
    const pixelOrigin =
      center && zoom !== undefined
        ? this._getNewPixelOrigin(center, zoom)
        : this.getPixelOrigin();
    return pixelOrigin.subtract(this._getMapPanePos());
  }

  _getNewPixelOrigin(center: LatLng, zoom?: number): Point {
    const viewHalf = this.getSize()._divideBy(2);
    return (this.project(center, zoom) as any)
      ._subtract(viewHalf)
      ._add(this._getMapPanePos())
      ._round();
  }

  _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
    const topLeft = this._getNewPixelOrigin(center, zoom);
    return (this.project(latlng, zoom) as any)._subtract(topLeft);
  }

  _latLngBoundsToNewLayerBounds(
    latLngBounds: LatLngBounds,
    zoom: number,
    center: LatLng,
  ): Bounds {
    const topLeft = this._getNewPixelOrigin(center, zoom);
    return new Bounds(
      (this.project(latLngBounds.getSouthWest(), zoom) as any)._subtract(topLeft),
      (this.project(latLngBounds.getNorthEast(), zoom) as any)._subtract(topLeft),
    );
  }

  _getCenterLayerPoint(): Point {
    return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
  }

  _getCenterOffset(latlng: LatLng): Point {
    return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
  }

  _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
    if (!bounds) {
      return center;
    }
    const centerPoint = this.project(center, zoom);
    const viewHalf = this.getSize().divideBy(2);
    const viewBounds = new Bounds(
      (centerPoint as any).subtract(viewHalf),
      (centerPoint as any).add(viewHalf),
    );
    const offset = this._getBoundsOffset(viewBounds, bounds, zoom);
    if (Math.abs(offset.x) <= 1 && Math.abs(offset.y) <= 1) {
      return center;
    }
    return this.unproject((centerPoint as any).add(offset), zoom);
  }

  _limitOffset(offset: Point, bounds: LatLngBounds): Point {
    if (!bounds) {
      return offset;
    }
    const viewBounds = this.getPixelBounds();
    const newBounds = new Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
    return offset.add(this._getBoundsOffset(newBounds, bounds));
  }

  _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom?: number): Point {
    const projectedMaxBounds = new Bounds(
      this.project(maxBounds.getNorthEast(), zoom) as any,
      this.project(maxBounds.getSouthWest(), zoom) as any,
    );
    const minOffset = (projectedMaxBounds.min as any).subtract(pxBounds.min);
    const maxOffset = (projectedMaxBounds.max as any).subtract(pxBounds.max);
    const dx = this._rebound(minOffset.x, -maxOffset.x);
    const dy = this._rebound(minOffset.y, -maxOffset.y);
    return new Point(dx, dy);
  }

  _rebound(left: number, right: number): number {
    return left + right > 0
      ? Math.round(left - right) / 2
      : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
  }

  _limitZoom(zoom: number): number {
    const min = this.getMinZoom();
    const max = this.getMaxZoom();
    const snap = Browser.any3d ? (this as any).options.zoomSnap : 1;
    if (snap) {
      zoom = Math.round(zoom / snap) * snap;
    }
    return Math.max(min, Math.min(max, zoom));
  }

  _onPanTransitionStep(): void {
    this.fire('move');
  }

  _onPanTransitionEnd(): void {
    DomUtil.removeClass(this._mapPane, 'atlas-pan-anim');
    this.fire('moveend');
  }

  _tryAnimatedPan(center: LatLng, options: any): boolean {
    const offset = this._getCenterOffset(center)._trunc();
    if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
      return false;
    }
    this.panBy(offset, options);
    return true;
  }

  _createAnimProxy(): void {
    const proxy = (this._proxy = DomUtil.create(
      'div',
      'atlas-proxy atlas-zoom-animated',
    ));
    this._panes.mapPane.appendChild(proxy);
    this.on('zoomanim', (e: any) => {
      const prop = DomUtil.TRANSFORM;
      const transform = this._proxy.style[prop as any];
      DomUtil.setTransform(
        this._proxy,
        this.project(e.center, e.zoom) as any,
        this.getZoomScale(e.zoom, 1),
      );
      if (transform === this._proxy.style[prop as any] && this._animatingZoom) {
        this._onZoomTransitionEnd();
      }
    }, this);
    this.on('load moveend', this._animMoveEnd, this);
    this.on('unload', this._destroyAnimProxy, this);
  }

  _destroyAnimProxy(): void {
    DomUtil.remove(this._proxy);
    this.off('load moveend', this._animMoveEnd, this);
    // @ts-ignore
    delete this._proxy;
  }

  _animMoveEnd(): void {
    const c = this.getCenter();
    const z = this.getZoom();
    DomUtil.setTransform(this._proxy, this.project(c, z) as any, this.getZoomScale(z, 1));
  }

  _catchTransitionEnd(e: any): void {
    if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
      this._onZoomTransitionEnd();
    }
  }

  _nothingToAnimate(): boolean {
    return !this._container.getElementsByClassName('atlas-zoom-animated').length;
  }

  _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
    if (this._animatingZoom) {
      return true;
    }
    options = options || {};
    if (
      !this._zoomAnimated ||
      options.animate === false ||
      this._nothingToAnimate() ||
      Math.abs(zoom - this._zoom) > (this as any).options.zoomAnimationThreshold
    ) {
      return false;
    }
    const scale = this.getZoomScale(zoom);
    const offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale);
    if (options.animate !== true && !this.getSize().contains(offset as any)) {
      return false;
    }
    requestAnimFrame(() => {
      this._moveStart(true, options.noMoveStart || false)._animateZoom(
        center,
        zoom,
        true,
      );
    }, this);
    return true;
  }

  _animateZoom(
    center: LatLng,
    zoom: number,
    startAnim: boolean,
    noUpdate?: boolean,
  ): void {
    if (!this._mapPane) {
      return;
    }
    if (startAnim) {
      this._animatingZoom = true;
      this._animateToCenter = center;
      this._animateToZoom = zoom;
      DomUtil.addClass(this._mapPane, 'atlas-zoom-anim');
    }
    this.fire('zoomanim', {
      center: center,
      zoom: zoom,
      noUpdate: noUpdate,
    });
    if (!this._tempFireZoomEvent) {
      this._tempFireZoomEvent = this._zoom !== this._animateToZoom;
    }
    this._move(this._animateToCenter, this._animateToZoom, undefined, true);
    setTimeout(bind(this._onZoomTransitionEnd, this), 250);
  }

  addControl(control: any): this {
    control.addTo(this);
    return this;
  }

  _onZoomTransitionEnd(): void {
    if (!this._animatingZoom) {
      return;
    }
    if (this._mapPane) {
      DomUtil.removeClass(this._mapPane, 'atlas-zoom-anim');
    }
    this._animatingZoom = false;
    this._move(this._animateToCenter, this._animateToZoom, undefined, true);
    if (this._tempFireZoomEvent) {
      this.fire('zoom');
    }
    // @ts-ignore
    delete this._tempFireZoomEvent;
    this.fire('move');
    this._moveEnd(true);
  }
}

export function createMap(id: string | HTMLElement, options?: any): Map {
  return new Map(id, options);
}

export const map = createMap;

(Map as any).mergeOptions({
  zoomControl: true,
});

(Map as any).addInitHook(function (this: any) {
  if (this.options.zoomControl) {
    this.zoomControl = new Zoom();
    this.addControl(this.zoomControl);
  }
});

function indexOf(mouseEvents: string[], type: string): number {
  return mouseEvents.indexOf(type);
}
function isExternalTarget(src: any, e: any) {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _handleDOMEvent() {
	throw new Error('Function not implemented.');
}
function _handleGeolocationError() {
	throw new Error('Function not implemented.');
}
function _handleGeolocationResponse() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function addLayer(arg0: any) {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, zoomOptions: any) {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, panOptions: any) {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _panInsideMaxBounds() {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not implemented.');
}
function _limitOffset(offset: Point, bounds: LatLngBounds): Point {
	throw new Error('Function not implemented.');
}
function _getBoundsOffset(pxBounds: Bounds, maxBounds: LatLngBounds, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _rebound(left: number, right: number): number {
	throw new Error('Function not implemented.');
}
function _limitZoom(zoom: number): number {
	throw new Error('Function not implemented.');
}
function _onPanTransitionStep() {
	throw new Error('Function not implemented.');
}
function _onPanTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _tryAnimatedPan(center: LatLng, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _createAnimProxy() {
	throw new Error('Function not implemented.');
}
function _destroyAnimProxy() {
	throw new Error('Function not implemented.');
}
function _animMoveEnd() {
	throw new Error('Function not implemented.');
}
function _catchTransitionEnd(e: any) {
	throw new Error('Function not implemented.');
}
function _nothingToAnimate(): boolean {
	throw new Error('Function not implemented.');
}
function _tryAnimatedZoom(center: LatLng, zoom: number, options: any): boolean {
	throw new Error('Function not implemented.');
}
function _animateZoom(center: LatLng, zoom: number, startAnim: boolean, noUpdate: boolean) {
	throw new Error('Function not implemented.');
}
function _onZoomTransitionEnd() {
	throw new Error('Function not implemented.');
}
function _onResize() {
	throw new Error('Function not implemented.');
}
function _stop() {
	throw new Error('Function not implemented.');
}
function _rawPanBy(offset: Point) {
	throw new Error('Function not implemented.');
}
function _initLayout() {
	throw new Error('Function not implemented.');
}
function _initContainer(id: string | HTMLElement) {
	throw new Error('Function not implemented.');
}
function _resetView(center: LatLng, zoom: number, noMoveStart: boolean) {
	throw new Error('Function not implemented.');
}
function _moveStart(zoomChanged: boolean, noMoveStart: boolean): Map {
	throw new Error('Function not implemented.');
}
function _move(center: LatLng, zoom: number, data: any, supressEvent: boolean): Map {
	throw new Error('Function not implemented.');
}
function _moveEnd(zoomChanged: boolean): Map {
	throw new Error('Function not implemented.');
}
function _initPanes() {
	throw new Error('Function not implemented.');
}
function _checkIfLoaded() {
	throw new Error('Function not implemented.');
}
function _initEvents(remove: boolean) {
	throw new Error('Function not implemented.');
}
function _onScroll() {
	throw new Error('Function not implemented.');
}
function _onMoveEnd() {
	throw new Error('Function not implemented.');
}
function _findEventTargets(e: any, type: string): any[] {
	throw new Error('Function not implemented.');
}
function _isClickDisabled(el: HTMLElement): boolean {
	throw new Error('Function not implemented.');
}
function _fireDOMEvent(e: any, type: string, canvasTargets: any[]) {
	throw new Error('Function not implemented.');
}
function _draggableMoved(obj: any): boolean {
	throw new Error('Function not implemented.');
}
function _clearHandlers() {
	throw new Error('Function not implemented.');
}
function _getMapPanePos(): Point {
	throw new Error('Function not implemented.');
}
function _moved(): boolean {
	throw new Error('Function not implemented.');
}
function _getTopLeftPoint(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _getNewPixelOrigin(center: LatLng, zoom: number): Point {
	throw new Error('Function not implemented.');
}
function _latLngToNewLayerPoint(latlng: LatLng, zoom: number, center: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _latLngBoundsToNewLayerBounds(latLngBounds: LatLngBounds, zoom: number, center: LatLng): Bounds {
	throw new Error('Function not implemented.');
}
function _getCenterLayerPoint(): Point {
	throw new Error('Function not implemented.');
}
function _getCenterOffset(latlng: LatLng): Point {
	throw new Error('Function not implemented.');
}
function _limitCenter(center: LatLng, zoom: number, bounds: LatLngBounds): LatLng {
	throw new Error('Function not. I will now create the `src/layers/Layer.ts` file. This file will define the abstract base layer class that all other layers will extend.