import { Point } from '../geo/Point.js';

export const LineUtil = {
    simplify: function(points, tolerance) {
        if (!tolerance || !points.length) {
            return points.slice();
        }

        var sqTolerance = tolerance * tolerance;
        points = this._reducePoints(points, sqTolerance);
        points = this._simplifyDP(points, sqTolerance);

        return points;
    },

    pointToSegmentDistance: function(p, p1, p2) {
        return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
    },

    closestPointOnSegment: function(p, p1, p2) {
        return this._sqClosestPointOnSegment(p, p1, p2);
    },

    _simplifyDP: function(points, sqTolerance) {
        var len = points.length,
            ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
            markers = new ArrayConstructor(len);

        markers[0] = markers[len - 1] = 1;
        this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

        var i,
            newPoints = [];

        for (i = 0; i < len; i++) {
            if (markers[i]) {
                newPoints.push(points[i]);
            }
        }
        return newPoints;
    },

    _simplifyDPStep: function(points, markers, sqTolerance, first, last) {
        var maxSqDist = 0,
            index, i, sqDist;

        for (i = first + 1; i < last; i++) {
            sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;
            this._simplifyDPStep(points, markers, sqTolerance, first, index);
            this._simplifyDPStep(points, markers, sqTolerance, index, last);
        }
    },

    _reducePoints: function(points, sqTolerance) {
        var reducedPoints = [points[0]];

        for (var i = 1, prev = 0, len = points.length; i < len; i++) {
            if (this._sqDist(points[i], points[prev]) > sqTolerance) {
                reducedPoints.push(points[i]);
                prev = i;
            }
        }
        if (prev < len - 1) {
            reducedPoints.push(points[len - 1]);
        }
        return reducedPoints;
    },

    clipSegment: function(a, b, bounds, useLastCode, round) {
        var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
            codeB = this._getBitCode(b, bounds),
            codeOut, p, newCode;

        this._lastCode = codeB;

        while (true) {
            if (!(codeA | codeB)) {
                return [a, b];
            }
            if (codeA & codeB) {
                return false;
            }
            codeOut = codeA || codeB;
            p = this._getEdgeIntersection(a, b, codeOut, bounds, round);
            newCode = this._getBitCode(p, bounds);

            if (codeOut === codeA) {
                a = p;
                codeA = newCode;
            } else {
                b = p;
                codeB = newCode;
            }
        }
    },

    _getEdgeIntersection: function(a, b, code, bounds, round) {
        var dx = b.x - a.x,
            dy = b.y - a.y,
            min = bounds.min,
            max = bounds.max,
            x, y;

        if (code & 8) { // top
            x = a.x + dx * (max.y - a.y) / dy;
            y = max.y;
        } else if (code & 4) { // bottom
            x = a.x + dx * (min.y - a.y) / dy;
            y = min.y;
        } else if (code & 2) { // right
            x = max.x;
            y = a.y + dy * (max.x - a.x) / dx;
        } else if (code & 1) { // left
            x = min.x;
            y = a.y + dy * (min.x - a.x) / dx;
        }

        return new Point(x, y, round);
    },

    _getBitCode: function(p, bounds) {
        var code = 0;

        if (p.x < bounds.min.x) {
            code |= 1;
        } else if (p.x > bounds.max.x) {
            code |= 2;
        }
        if (p.y < bounds.min.y) {
            code |= 4;
        } else if (p.y > bounds.max.y) {
            code |= 8;
        }
        return code;
    },

    _sqDist: function(p1, p2) {
        var dx = p2.x - p1.x,
            dy = p2.y - p1.y;
        return dx * dx + dy * dy;
    },

    _sqClosestPointOnSegment: function(p, p1, p2, sqDist) {
        var x = p1.x,
            y = p1.y,
            dx = p2.x - x,
            dy = p2.y - y,
            dot = dx * dx + dy * dy,
            t;

        if (dot > 0) {
            t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.x - x;
        dy = p.y - y;

        return sqDist ? dx * dx + dy * dy : new Point(x, y);
    }
};

export function simplify(points, tolerance) {
    return LineUtil.simplify(points, tolerance);
}

export function pointToSegmentDistance(p, p1, p2) {
    return LineUtil.pointToSegmentDistance(p, p1, p2);
}

export function closestPointOnSegment(p, p1, p2) {
    return LineUtil.closestPointOnSegment(p, p1, p2);
}

export function clipSegment(a, b, bounds, useLastCode, round) {
    return LineUtil.clipSegment(a, b, bounds, useLastCode, round);
}

export function polylineCenter(latlngs, crs) {
	var i, halfDist, segDist, dist, p1, p2, ratio, center;

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

	for (i = 0, halfDist = 0; i < len - 1; i++) {
		halfDist += points[i].distanceTo(points[i + 1]) / 2;
	}

	if (halfDist === 0) {
		center = points[0];
	} else {
		for (i = 0, dist = 0; i < len - 1; i++) {
			p1 = points[i];
			p2 = points[i + 1];
			segDist = p1.distanceTo(p2);
			dist += segDist;

			if (dist > halfDist) {
				ratio = (dist - halfDist) / segDist;
				center = [
					p2.x - ratio * (p2.x - p1.x),
					p2.y - ratio * (p2.y - p1.y)
				];
				break;
			}
		}
	}

	var latlngCenter = crs.unproject(toPoint(center));
	return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
}

export function isFlat(latlngs) {
	return !isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
}