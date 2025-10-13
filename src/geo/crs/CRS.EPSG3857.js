import { Earth } from './CRS.Earth';
import { LatLng } from '../LatLng';
import { Point } from '../Point';
import { Transformation, toTransformation } from '../Geo';

export const EPSG3857 = {
  ...Earth,
  code: 'EPSG:3857',
  projection: {
    project: (latlng: { lat: number; lng: number }) => {
      const d = Math.PI / 180;
      const max = 1 - 1e-15;
      const sin = Math.max(Math.min(Math.sin(latlng.lat * d), max), -max);
      return new Point(
        6378137 * latlng.lng * d,
        (6378137 * Math.log((1 + sin) / (1 - sin))) / 2,
      );
    },
    unproject: (point: { x: number; y: number }) => {
      const d = 180 / Math.PI;
      return new (LatLng as any)(
        (2 * Math.atan(Math.exp(point.y / 6378137)) - Math.PI / 2) * d,
        (point.x * d) / 6378137,
      );
    },
    bounds: (() => {
      const d = 6378137 * Math.PI;
      return new (Point as any)([-d, -d], [d, d]);
    })(),
  },
  transformation: toTransformation(0.5 / Math.PI, 0.5, -0.5 / Math.PI, 0.5),
};
