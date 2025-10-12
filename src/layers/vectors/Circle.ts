import { Layer } from '../Layer';
import { setOptions } from '../../utils/Util';
import { LatLng } from '../../geo/LatLng';

export class Circle extends Layer {
  private _latlng: LatLng;
  private _radius: number;

  constructor(latlng: LatLng, radius: number, options?: any) {
    super();
    setOptions(this, options);
    this._latlng = latlng;
    this._radius = radius;
  }
}

export function circle(latlng: LatLng, radius: number, options?: any): Circle {
  return new Circle(latlng, radius, options);
}