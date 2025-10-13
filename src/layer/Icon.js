import {
    Class
} from '../core/Class.js';
import {
    setOptions,
    toPoint
} from '../core/Util.js';
import * as Browser from '../core/Browser.js';
import {
    create,
    getStyle
} from '../core/Dom.js';

export const Icon = Class.extend({
    options: {
        iconUrl: null,
        iconRetinaUrl: null,
        iconSize: null,
        iconAnchor: null,
        popupAnchor: [0, 0],
        tooltipAnchor: [0, 0],
        shadowUrl: null,
        shadowRetinaUrl: null,
        shadowSize: null,
        shadowAnchor: null,
        className: '',
        crossOrigin: false
    },

    initialize: function(options) {
        setOptions(this, options);
    },

    createIcon: function(oldIcon) {
        return this._createIcon('icon', oldIcon);
    },

    createShadow: function(oldIcon) {
        return this._createIcon('shadow', oldIcon);
    },

    _createIcon: function(name, oldIcon) {
        var src = this._getIconUrl(name);

        if (!src) {
            if (name === 'icon') {
                throw new Error('iconUrl not set in Icon options (see the docs).');
            }
            return null;
        }

        var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
        this._setIconStyles(img, name);

        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }

        return img;
    },

    _setIconStyles: function(img, name) {
        var options = this.options;
        var sizeOption = options[name + 'Size'];

        if (typeof sizeOption === 'number') {
            sizeOption = [sizeOption, sizeOption];
        }

        var size = toPoint(sizeOption),
            anchor = toPoint(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
                size && size.divideBy(2, true));

        img.className = 'atlas-marker-' + name + ' ' + (options.className || '');

        if (anchor) {
            img.style.marginLeft = (-anchor.x) + 'px';
            img.style.marginTop = (-anchor.y) + 'px';
        }

        if (size) {
            img.style.width = size.x + 'px';
            img.style.height = size.y + 'px';
        }
    },

    _createImg: function(src, el) {
        el = el || document.createElement('img');
        el.src = src;
        return el;
    },

    _getIconUrl: function(name) {
        return Browser.retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
    }
});

export function icon(options) {
    return new Icon(options);
}

Icon.Default = Icon.extend({
    options: {
        iconUrl: 'marker-icon.png',
        iconRetinaUrl: 'marker-icon-2x.png',
        shadowUrl: 'marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
    },

    _getIconUrl: function(name) {
        if (typeof Icon.Default.imagePath !== 'string') {
            Icon.Default.imagePath = this._detectIconPath();
        }

        return (this.options.imagePath || Icon.Default.imagePath) + Icon.prototype._getIconUrl.call(this, name);
    },

    _stripUrl: function(path) {
        var strip = function(str, re, idx) {
            var match = re.exec(str);
            return match && match[idx];
        };
        path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
        return path && strip(path, /^(.*)marker-icon\.png$/, 1);
    },

    _detectIconPath: function() {
        var el = create('div', 'atlas-default-icon-path', document.body);
        var path = getStyle(el, 'background-image') ||
            getStyle(el, 'backgroundImage'); // IE8

        document.body.removeChild(el);
        path = this._stripUrl(path);

        if (path) {
            return path;
        }

        var link = document.querySelector('link[href$="atlas.css"]');

        if (!link) {
            return '';
        }

        return link.href.substring(0, link.href.length - 'atlas.css'.length - 1);
    }
});