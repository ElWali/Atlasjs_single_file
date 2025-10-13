import { LatLng } from '../LatLng';

export const Earth = {
  distance(latlng1: LatLng, latlng2: LatLng): number {
    const rad = Math.PI / 180;
    const lat1 = latlng1.lat * rad;
    const lat2 = latlng2.lat * rad;
    const a =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);
    return 6371000 * Math.acos(Math.min(a, 1));
  },

  wrapLatLng(latlng: LatLng): LatLng {
    const lng = latlng.lng;
    latlng.lng = lng > 180 ? lng - 360 : lng < -180 ? lng + 360 : lng;
    return latlng;
  },
};
