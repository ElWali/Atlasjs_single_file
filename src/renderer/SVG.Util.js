import * as Browser from '../core/Browser.js';

export function pointsToPath(rings, closed) {
    var str = '',
        i, j, len, len2, points, p;

    for (i = 0, len = rings.length; i < len; i++) {
        points = rings[i];

        for (j = 0, len2 = points.length; j < len2; j++) {
            p = points[j];
            str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
        }

        str += closed ? (Browser.svg ? 'z' : 'x') : '';
    }

    return str || 'M0 0';
}