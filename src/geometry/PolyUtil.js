import { LineUtil } from './LineUtil.js';
import { pointToSegmentDistance } from './LineUtil.js';

export const PolyUtil = {
    clipPolygon: function(points, bounds, round) {
        var clippedPoints,
            i, j, k,
            a, b,
            len, edge, p,
            lu = LineUtil;

        if (!points || points.length === 0) {
            return [];
        }

        points = lu.simplify(points, 0);
        len = points.length;

        if (len <= 2) {
            return points;
        }

        var inside = function(p) {
            return bounds.contains(p);
        };

        for (i = 0; i < len - 1; i++) {
            if (inside(points[i]) && inside(points[i + 1])) {
                continue;
            }
            clippedPoints = [];
            for (j = 0; j < len; j++) {
                k = (j + 1) % len;
                a = points[j];
                b = points[k];

                if (inside(a)) {
                    clippedPoints.push(a);
                }

                if (inside(a) !== inside(b)) {
                    p = lu._getEdgeIntersection(b, a, lu._getBitCode(b, bounds), bounds, round);
                    clippedPoints.push(p);
                }
            }
            points = clippedPoints;
            len = points.length;
        }

        return points;
    },

    pointToPolygonDist: function(p, polygon) {
        var min = Infinity,
            i, j,
            dist;

        for (i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            dist = pointToSegmentDistance(p, polygon[i], polygon[j]);
            if (dist < min) {
                min = dist;
            }
        }
        return min;
    }
};

export function clipPolygon(points, bounds, round) {
    return PolyUtil.clipPolygon(points, bounds, round);
}

export function polygonCenter(latlngs, crs) {
	var i, j, p1, p2, f, area, x, y, center;

	if (!latlngs || latlngs.length === 0) {
		throw new Error('latlngs not passed');
	}

	if (!isFlat(latlngs)) {
		console.warn('latlngs are not flat! Only the first ring will be used');
		latlngs = latlngs[0];
	}

	var centroidLatLng = toLatLng([0, 0]);
	var bounds = toLatLngBounds(latlngs);
	var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
	if (areaBounds < 1700) {
		centroidLatLng = centroid(latlngs);
	}

	var len = latlngs.length;
	var points = [];
	for (i = 0; i < len; i++) {
		var latlng = toLatLng(latlngs[i]);
		points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
	}

	area = x = y = 0;

	for (i = 0, j = len - 1; i < len; j = i++) {
		p1 = points[i];
		p2 = points[j];

		f = p1.y * p2.x - p2.y * p1.x;
		x += (p1.x + p2.x) * f;
		y += (p1.y + p2.y) * f;
		area += f * 3;
	}

	if (area === 0) {
		center = points[0];
	} else {
		center = [x / area, y / area];
	}
	var latlngCenter = crs.unproject(toPoint(center));
	return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
}

function centroid(coords) {
	var latSum = 0;
	var lngSum = 0;
	var len = 0;
	for (var i = 0; i < coords.length; i++) {
		var latlng = toLatLng(coords[i]);
		latSum += latlng.lat;
		lngSum += latlng.lng;
		len++;
	}
	return toLatLng([latSum / len, lngSum / len]);
}

function isFlat(latlngs) {
	return !isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
}