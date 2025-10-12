import { Layer } from './Layer';
import { setOptions } from '../utils/Util';

export class TileLayer extends Layer {
  constructor(urlTemplate: string, options?: any) {
    super();
    setOptions(this, options);
    this.options.urlTemplate = urlTemplate;
  }
}

export function tileLayer(urlTemplate: string, options?: any): TileLayer {
  return new TileLayer(urlTemplate, options);
}