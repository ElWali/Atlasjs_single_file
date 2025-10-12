/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatNum, isArray, wrapNum, setOptions } from '../utils/Util';
import { Earth } from './crs/CRS.Earth';
import { Point } from './Point';
import { Layer } from '../layers/Layer';

export class LatLng {
  lat: number;
  lng: number;
  alt?: number;

  constructor(lat: number, lng: number, alt?: number) {
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
    }
    this.lat = +lat;
    this.lng = +lng;
    if (alt !== undefined) {
      this.alt = +alt;
    }
  }

  equals(obj: LatLng, maxMargin?: number): boolean {
    if (!obj) {
      return false;
    }
    obj = toLatLng(obj);
    const margin = Math.max(
      Math.abs(this.lat - obj.lat),
      Math.abs(this.lng - obj.lng),
    );
    return margin <= (maxMargin === undefined ? 1.0e-9 : maxMargin);
  }

  toString(precision?: number): string {
    return (
      'LatLng(' +
      formatNum(this.lat, precision) +
      ', ' +
      formatNum(this.lng, precision) +
      ')'
    );
  }

  distanceTo(other: LatLng): number {
    return (Earth as any).distance(this, toLatLng(other));
  }

  wrap(): LatLng {
    return (Earth as any).wrapLatLng(this);
  }

  toBounds(sizeInMeters: number): LatLngBounds {
    const latAccuracy = (180 * sizeInMeters) / 40075017;
    const lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);
    return new LatLngBounds(
      [this.lat - latAccuracy, this.lng - lngAccuracy],
      [this.lat + latAccuracy, this.lng + lngAccuracy],
    );
  }

  clone(): LatLng {
    return new LatLng(this.lat, this.lng, this.alt);
  }
}

export function toLatLng(
  a?: number | number[] | { lat: number; lng: number; alt?: number } | LatLng,
  b?: number,
  c?: number,
): any {
  if (a instanceof LatLng) {
    return a;
  }
  if (isArray(a) && typeof a[0] !== 'object') {
    if (a.length === 3) {
      return new LatLng(a[0], a[1], a[2]);
    }
    if (a.length === 2) {
      return new LatLng(a[0], a[1]);
    }
    return null;
  }
  if (a === undefined || a === null) {
    return a;
  }
  if (typeof a === 'object' && 'lat' in a) {
    return new LatLng(
      a.lat,
      'lng' in (a as any) ? (a as any).lng : (a as any).lon,
      a.alt,
    );
  }
  if (b === undefined) {
    return null;
  }
  return new LatLng(a as number, b, c);
}

export class LatLngBounds {
  _southWest!: LatLng;
  _northEast!: LatLng;
  constructor(corner1: LatLng | [number, number], corner2?: LatLng | [number, number]) {
    if (!corner1) {
      return;
    }
    const latlngs = corner2 ? [corner1, corner2] : [corner1];
    for (let i = 0, len = latlngs.length; i < len; i++) {
      this.extend(latlngs[i] as any);
    }
  }

  extend(obj: LatLng | LatLngBounds | [number, number]): this {
    const sw = this._southWest;
    const ne = this._northEast;
    let sw2, ne2;
    if (obj instanceof LatLng) {
      sw2 = obj;
      ne2 = obj;
    } else if (obj instanceof LatLngBounds) {
      sw2 = obj._southWest;
      ne2 = obj._northEast;
      if (!sw2 || !ne2) {
        return this;
      }
    } else {
      return obj
        ? this.extend(toLatLng(obj as [number, number]) || toLatLngBounds(obj as any))
        : this;
    }
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

  pad(bufferRatio: number): LatLngBounds {
    const sw = this._southWest;
    const ne = this._northEast;
    const heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio;
    const widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
    return new LatLngBounds(
      new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
      new LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer),
    );
  }

  getCenter(): LatLng {
    return new LatLng(
      (this._southWest.lat + this._northEast.lat) / 2,
      (this._southWest.lng + this._northEast.lng) / 2,
    );
  }

  getSouthWest(): LatLng {
    return this._southWest;
  }

  getNorthEast(): LatLng {
    return this._northEast;
  }

  getNorthWest(): LatLng {
    return new LatLng(this.getNorth(), this.getWest());
  }

  getSouthEast(): LatLng {
    return new LatLng(this.getSouth(), this.getEast());
  }

  getWest(): number {
    return this._southWest.lng;
  }

  getSouth(): number {
    return this._southWest.lat;
  }

  getEast(): number {
    return this._northEast.lng;
  }

  getNorth(): number {
    return this._northEast.lat;
  }

  contains(obj: LatLng | LatLngBounds | [number, number]): boolean {
    if (
      typeof (obj as [number, number])[0] === 'number' ||
      obj instanceof LatLng ||
      'lat' in obj
    ) {
      obj = toLatLng(obj as [number, number]) as LatLng;
    } else {
      obj = toLatLngBounds(obj as LatLngBounds);
    }
    const sw = this._southWest;
    const ne = this._northEast;
    let sw2, ne2;
    if (obj instanceof LatLngBounds) {
      sw2 = obj.getSouthWest();
      ne2 = obj.getNorthEast();
    } else {
      sw2 = ne2 = obj as LatLng;
    }
    return (
      sw2.lat >= sw.lat &&
      ne2.lat <= ne.lat &&
      sw2.lng >= sw.lng &&
      ne2.lng <= ne.lng
    );
  }

  intersects(bounds: LatLngBounds): boolean {
    bounds = toLatLngBounds(bounds);
    const sw = this._southWest;
    const ne = this._northEast;
    const sw2 = bounds.getSouthWest();
    const ne2 = bounds.getNorthEast();
    const latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat;
    const lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
    return latIntersects && lngIntersects;
  }

  overlaps(bounds: LatLngBounds): boolean {
    bounds = toLatLngBounds(bounds);
    const sw = this._southWest;
    const ne = this._northEast;
    const sw2 = bounds.getSouthWest();
    const ne2 = bounds.getNorthEast();
    const latOverlaps = ne2.lat > sw.lat && sw2.lat < ne.lat;
    const lngOverlaps = ne2.lng > sw.lng && sw2.lng < ne.lng;
    return latOverlaps && lngOverlaps;
  }

  toBBoxString(): string {
    return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(
      ',',
    );
  }

  equals(bounds: LatLngBounds, maxMargin?: number): boolean {
    if (!bounds) {
      return false;
    }
    bounds = toLatLngBounds(bounds);
    return (
      this._southWest.equals(bounds.getSouthWest(), maxMargin) &&
      this._northEast.equals(bounds.getNorthEast(), maxMargin)
    );
  }

  isValid(): boolean {
    return !!(this._southWest && this._northEast);
  }
}

export function toLatLngBounds(
  a: LatLng | LatLngBounds | [number, number] | [LatLng, LatLng],
  b?: LatLng | [number, number],
): LatLngBounds {
  if (a instanceof LatLngBounds) {
    return a;
  }
  return new LatLngBounds(a as [number, number], b as [number, number]);
}

export class Bounds {
  min!: Point;
  max!: Point;

  constructor(corner1: Point | [Point, Point], corner2?: Point) {
    if (!corner1) {
      return;
    }
    const points = corner2 ? [corner1 as Point, corner2] : (corner1 as [Point, Point]);
    for (let i = 0, len = points.length; i < len; i++) {
      this.extend(points[i]);
    }
  }

  extend(point: Point): this {
    point = new Point(point.x, point.y);
    if (!this.min && !this.max) {
      this.min = point.clone();
      this.max = point.clone();
    } else {
      this.min.x = Math.min(point.x, this.min.x);
      this.max.x = Math.max(point.x, this.max.x);
      this.min.y = Math.min(point.y, this.min.y);
      this.max.y = Math.max(point.y, this.max.y);
    }
    return this;
  }

  getCenter(round?: boolean): Point {
    return new Point(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
    );
  }

  getBottomLeft(): Point {
    return new Point(this.min.x, this.max.y);
  }

  getTopRight(): Point {
    return new Point(this.max.x, this.min.y);
  }

  getSize(): Point {
    return this.max.subtract(this.min);
  }

  contains(obj: Bounds | Point): boolean {
    let min, max;
    if (obj instanceof Bounds) {
        min = obj.min;
        max = obj.max;
    } else {
        min = max = obj;
    }
    return (
      min.x >= this.min.x &&
      max.x <= this.max.x &&
      min.y >= this.min.y &&
      max.y <= this.max.y
    );
  }

  intersects(bounds: Bounds): boolean {
    bounds = toBounds(bounds);
    const min = this.min;
    const max = this.max;
    const min2 = bounds.min;
    const max2 = bounds.max;
    const xIntersects = max2.x >= min.x && min2.x <= max.x;
    const yIntersects = max2.y >= min.y && min2.y <= max.y;
    return xIntersects && yIntersects;
  }

  overlaps(bounds: Bounds): boolean {
    bounds = toBounds(bounds);
    const min = this.min;
    const max = this.max;
    const min2 = bounds.min;
    const max2 = bounds.max;
    const xOverlaps = max2.x > min.x && min2.x < max.x;
    const yOverlaps = max2.y > min.y && min2.y < max.y;
    return xOverlaps && yOverlaps;
  }

  isValid(): boolean {
    return !!(this.min && this.max);
  }
}

export function toBounds(a: Bounds | [Point, Point]): Bounds {
  if (!a || a instanceof Bounds) {
    return a;
  }
  return new Bounds(a as [Point, Point]);
}

export class GeoJSON extends Layer {
  constructor(data: any, options?: any) {
    super();
    setOptions(this, options);
    // Add parsing and rendering logic here
  }
}

export function geoJSON(data: any, options?: any): GeoJSON {
  return new GeoJSON(data, options);
}

export const CRS = {
  latLngToPoint: function (latlng: LatLng, zoom: number) {
    const projectedPoint = this.projection.project(latlng);
    const scale = this.scale(zoom);
    return this.transformation._transform(projectedPoint, scale);
  },
  pointToLatLng: function (point: Point, zoom: number) {
    const scale = this.scale(zoom);
    const untransformedPoint = this.transformation.untransform(point, scale);
    return this.projection.unproject(untransformedPoint);
  },
  project: function (latlng: LatLng) {
    return this.projection.project(latlng);
  },
  unproject: function (point: Point) {
    return this.projection.unproject(point);
  },
  scale: function (zoom: number) {
    return 256 * Math.pow(2, zoom);
  },
  zoom: function (scale: number) {
    return Math.log(scale / 256) / Math.LN2;
  },
  getProjectedBounds: function (zoom: number) {
    if (this.infinite) {
      return null;
    }
    const b = this.projection.bounds;
    const s = this.scale(zoom);
    const min = this.transformation.transform(b.min, s);
    const max = this.transformation.transform(b.max, s);
    return new Bounds(min, max);
  },
  infinite: false,
  wrapLatLng: function (latlng: LatLng) {
    const lng = this.wrapLng
      ? wrapNum(latlng.lng, this.wrapLng, true)
      : latlng.lng;
    const lat = this.wrapLat
      ? wrapNum(latlng.lat, this.wrapLat, true)
      : latlng.lat;
    const alt = latlng.alt;
    return new LatLng(lat, lng, alt);
  },
  wrapLatLngBounds: function (bounds: LatLngBounds) {
    const center = bounds.getCenter();
    const newCenter = this.wrapLatLng(center);
    const latShift = center.lat - newCenter.lat;
    const lngShift = center.lng - newCenter.lng;
    if (latShift === 0 && lngShift === 0) {
      return bounds;
    }
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift);
    const newNe = new LatLng(ne.lat - latShift, ne.lng + lngShift);
    return new LatLngBounds(newSw, newNe);
  },
};

export class Transformation {
  _a: number;
  _b: number;
  _c: number;
  _d: number;
  constructor(a: number, b: number, c: number, d: number) {
    if (isArray(a)) {
      this._a = a[0];
      this._b = a[1];
      this._c = a[2];
      this._d = a[3];
      return;
    }
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
  }
  transform(point: Point, scale?: number): Point {
    return this._transform(point.clone(), scale);
  }
  _transform(point: Point, scale?: number): Point {
    scale = scale || 1;
    point.x = scale * (this._a * point.x + this._b);
    point.y = scale * (this._c * point.y + this._d);
    return point;
  }
  untransform(point: Point, scale?: number): Point {
    scale = scale || 1;
    return new Point(
      (point.x / scale - this._b) / this._a,
      (point.y / scale - this._d) / this._c,
    );
  }
}

export function toTransformation(
  a: number,
  b: number,
  c: number,
  d: number,
): Transformation {
  return new Transformation(a, b, c, d);
}