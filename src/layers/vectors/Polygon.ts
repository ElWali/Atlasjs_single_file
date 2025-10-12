import { Layer } from '../Layer';
import { setOptions } from '../../utils/Util';
import { LatLng } from '../../geo/LatLng';

export class Polygon extends Layer {
  private _latlngs: LatLng[];

  constructor(latlngs: LatLng[], options?: any) {
    super();
    setOptions(this, options);
    this._latlngs = latlngs;
  }
}

export function polygon(latlngs: LatLng[], options?: any): Polygon {
  return new Polygon(latlngs, options);
}