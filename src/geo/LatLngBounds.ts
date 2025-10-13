import { LatLng, toLatLng } from './LatLng';

export class LatLngBounds {
  private _southWest: LatLng;
  private _northEast: LatLng;
  constructor(
    corner1: LatLng | [number, number],
    corner2: LatLng | [number, number],
  ) {
    if (!corner1) {
      return;
    }
    const latlngs = corner2 ? [corner1, corner2] : [corner1];
    for (let i = 0, len = latlngs.length; i < len; i++) {
      this.extend(latlngs[i]);
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
        ? this.extend(toLatLng(obj as [number, number]) || toLatLngBounds(obj))
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
      obj = toLatLng(obj as [number, number]);
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
      sw2 = ne2 = obj;
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
  b?: LatLng,
): LatLngBounds {
  if (a instanceof LatLngBounds) {
    return a;
  }
  return new LatLngBounds(a as [number, number], b);
}