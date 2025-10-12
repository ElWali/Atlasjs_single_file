import { Layer } from './Layer';
import { setOptions } from '../utils/Util';
import { LatLng } from '../geo/LatLng';

export class Marker extends Layer {
  private _latlng: LatLng;

  constructor(latlng: LatLng, options?: any) {
    super();
    setOptions(this, options);
    this._latlng = latlng;
  }

  getLatLng(): LatLng {
    return this._latlng;
  }
}

export function marker(latlng: LatLng, options?: any): Marker {
  return new Marker(latlng, options);
}