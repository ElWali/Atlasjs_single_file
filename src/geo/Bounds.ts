import { Point } from './Point';

export class Bounds {
  min: Point;
  max: Point;

  constructor(corner1: Point | [Point, Point], corner2?: Point) {
    if (!corner1) {
      return;
    }
    const points = corner2 ? [corner1 as Point, corner2] : (corner1 as [Point, Point]);
    for (let i = 0, len = points.length; i < len; i++) {
      this.extend(points[i]);
    }
  }

  extend(point: Point): this {
    point = new Point(point.x, point.y);
    if (!this.min && !this.max) {
      this.min = point.clone();
      this.max = point.clone();
    } else {
      this.min.x = Math.min(point.x, this.min.x);
      this.max.x = Math.max(point.x, this.max.x);
      this.min.y = Math.min(point.y, this.min.y);
      this.max.y = Math.max(point.y, this.max.y);
    }
    return this;
  }

  getCenter(round?: boolean): Point {
    return new Point(
      (this.min.x + this.max.x) / 2,
      (this.min.y + this.max.y) / 2,
    );
  }

  getBottomLeft(): Point {
    return new Point(this.min.x, this.max.y);
  }

  getTopRight(): Point {
    return new Point(this.max.x, this.min.y);
  }

  getSize(): Point {
    return this.max.subtract(this.min);
  }

  contains(obj: Bounds | Point): boolean {
    let min, max;
    if (obj instanceof Bounds) {
        min = obj.min;
        max = obj.max;
    } else {
        min = max = obj;
    }
    return (
      min.x >= this.min.x &&
      max.x <= this.max.x &&
      min.y >= this.min.y &&
      max.y <= this.max.y
    );
  }

  intersects(bounds: Bounds): boolean {
    bounds = toBounds(bounds);
    const min = this.min;
    const max = this.max;
    const min2 = bounds.min;
    const max2 = bounds.max;
    const xIntersects = max2.x >= min.x && min2.x <= max.x;
    const yIntersects = max2.y >= min.y && min2.y <= max.y;
    return xIntersects && yIntersects;
  }

  overlaps(bounds: Bounds): boolean {
    bounds = toBounds(bounds);
    const min = this.min;
    const max = this.max;
    const min2 = bounds.min;
    const max2 = bounds.max;
    const xOverlaps = max2.x > min.x && min2.x < max.x;
    const yOverlaps = max2.y > min.y && min2.y < max.y;
    return xOverlaps && yOverlaps;
  }

  isValid(): boolean {
    return !!(this.min && this.max);
  }
}

export function toBounds(a: Bounds | [Point, Point]): Bounds {
  if (!a || a instanceof Bounds) {
    return a;
  }
  return new Bounds(a as [Point, Point]);
}