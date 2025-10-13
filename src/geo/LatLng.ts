/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatNum, isArray } from '../utils/Util';
import { Earth } from './crs/CRS.Earth';
import { LatLngBounds } from './LatLngBounds';

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