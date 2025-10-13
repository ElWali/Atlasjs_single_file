import {
    Icon
} from './Icon.js';
import {
    empty,
    toPoint
} from '../core/Util.js';

export const DivIcon = Icon.extend({
    options: {
        html: false,
        bgPos: null,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -6],
        className: 'atlas-div-icon'
    },

    createIcon: function(oldIcon) {
        var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
            options = this.options;

        if (options.html instanceof Element) {
            empty(div);
            div.appendChild(options.html);
        } else {
            div.innerHTML = options.html !== false ? options.html : '';
        }

        if (options.bgPos) {
            var bgPos = toPoint(options.bgPos);
            div.style.backgroundPosition = (-bgPos.x) + 'px ' + (-bgPos.y) + 'px';
        }
        this._setIconStyles(div, 'icon');

        return div;
    },

    createShadow: function() {
        return null;
    }
});

export function divIcon(options) {
    return new DivIcon(options);
}