import { Layer } from '../Layer';
import { setOptions } from '../../utils/Util';
import { LatLng } from '../../geo/LatLng';

export class Polyline extends Layer {
  private _latlngs: LatLng[];

  constructor(latlngs: LatLng[], options?: any) {
    super();
    setOptions(this, options);
    this._latlngs = latlngs;
  }
}

export function polyline(latlngs: LatLng[], options?: any): Polyline {
  return new Polyline(latlngs, options);
}