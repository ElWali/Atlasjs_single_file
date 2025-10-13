import {
    ImageOverlay
} from './ImageOverlay.js';
import {
    addClass,
    falseFn
} from '../core/Dom.js';

export const SVGOverlay = ImageOverlay.extend({
    _initImage: function() {
        var el = this._image = this._url;

        addClass(el, 'atlas-image-layer');
        if (this._zoomAnimated) {
            addClass(el, 'atlas-zoom-animated');
        }
        if (this.options.className) {
            addClass(el, this.options.className);
        }

        el.onselectstart = falseFn;
        el.onmousemove = falseFn;
    }
});

export function svgOverlay(el, bounds, options) {
    return new SVGOverlay(el, bounds, options);
}