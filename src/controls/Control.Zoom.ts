import { Control } from './Control';

export class Zoom extends Control {
  constructor(options?: any) {
    super(options);
  }
}

export function zoom(options?: any): Zoom {
  return new Zoom(options);
}