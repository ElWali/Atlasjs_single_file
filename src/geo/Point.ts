/* eslint-disable @typescript-eslint/no-explicit-any */
export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  clone(): Point {
    return new Point(this.x, this.y);
  }

  add(point: Point): Point {
    return this.clone()._add(toPoint(point));
  }

  _add(point: Point): this {
    this.x += point.x;
    this.y += point.y;
    return this;
  }

  subtract(point: Point): Point {
    return this.clone()._subtract(toPoint(point));
  }

  _subtract(point: Point): this {
    this.x -= point.x;
    this.y -= point.y;
    return this;
  }

  divideBy(num: number): Point {
    return this.clone()._divideBy(num);
  }

  _divideBy(num: number): this {
    this.x /= num;
    this.y /= num;
    return this;
  }

  multiplyBy(num: number): Point {
    return this.clone()._multiplyBy(num);
  }

  _multiplyBy(num: number): this {
    this.x *= num;
    this.y *= num;
    return this;
  }

  round(): Point {
    return this.clone()._round();
  }

  _round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  floor(): Point {
    return this.clone()._floor();
  }

  _floor(): this {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  ceil(): Point {
    return this.clone()._ceil();
  }

  _ceil(): this {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
  }

  trunc(): Point {
    return this.clone()._trunc();
  }

  _trunc(): this {
    this.x = Math.trunc(this.x);
    this.y = Math.trunc(this.y);
    return this;
  }

  distanceTo(point: Point): number {
    point = toPoint(point);
    const x = point.x - this.x;
    const y = point.y - this.y;
    return Math.sqrt(x * x + y * y);
  }

  equals(point: Point): boolean {
    point = toPoint(point);
    return point.x === this.x && point.y === this.y;
  }

  contains(point: Point): boolean {
    point = toPoint(point);
    return (
      Math.abs(point.x) <= Math.abs(this.x) &&
      Math.abs(point.y) <= Math.abs(this.y)
    );
  }

  toString(): string {
    return 'Point(' + this.x + ', ' + this.y + ')';
  }
}

export function toPoint(x: number | Point | [number, number], y?: number): any {
  if (x instanceof Point) {
    return x;
  }
  if (Array.isArray(x)) {
    return new Point(x[0], x[1]);
  }
  if (x === undefined || x === null) {
    return x;
  }
  if (typeof x === 'object' && 'x' in x && 'y' in x) {
    return new Point(x.x, x.y);
  }
  return new Point(x as number, y as number);
}