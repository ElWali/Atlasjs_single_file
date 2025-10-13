/* eslint-disable @typescript-eslint/no-explicit-any */
import { Evented } from './Evented';
import { requestAnimFrame, cancelAnimFrame } from '../utils/Util';
import { setPosition } from '../utils/DomUtil';
import { Point } from '../geo/Point';

export class PosAnimation extends Evented {
  _step: any;
  _easing: any;
  _duration: any;
  _running: boolean;
  _el: any;
  _from: any;
  _to: any;
  _startTime: any;
  _timer: any;

  constructor() {
    super();
    this._running = false;
    this._step = this._step.bind(this);
  }

  run(el: HTMLElement, to: Point, duration?: number, easing?: number): void {
    this.stop();
    this._el = el;
    this._from = (el as any)._atlas_pos || new Point(0, 0);
    this._to = to;
    this._duration = duration || 0.25;
    this._easing = easing || 0.25;
    this._startTime = +new Date();
    this._running = true;
    this.fire('start');
    this._animate();
  }

  stop(): void {
    if (!this._running) {
      return;
    }
    this._running = false;
    if (this._timer) {
      cancelAnimFrame(this._timer);
      this._timer = null;
    }
    setPosition(this._el, this._to);
    this.fire('end');
  }

  _animate(): void {
    this._timer = requestAnimFrame(this._step, this);
  }

  _step(): void {
    const now = +new Date();
    const elapsedTime = now - this._startTime;
    const duration = this._duration * 1000;
    if (elapsedTime < duration) {
      this._runFrame(this._easeOut(elapsedTime / duration));
      this._animate();
    } else {
      this._runFrame(1.0);
      this.stop();
    }
  }

  _runFrame(progress: number): void {
    const delta = this._to.subtract(this._from).multiplyBy(progress);
    const newPos = this._from.add(delta);
    setPosition(this._el, newPos);
    this.fire('step');
  }

  _easeOut(t: number): number {
    return 1 - Math.pow(1 - t, this._easing);
  }
}