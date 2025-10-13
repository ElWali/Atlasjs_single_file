import {
    Control
} from './Control.js';
import {
    create,
    disableClickPropagation,
    on,
    stop,
    removeClass,
    addClass
} from '../core/Dom.js';
import {
    Map
} from '../map/Map.js';

export const Zoom = Control.extend({
    options: {
        position: 'topleft',
        zoomInText: '<span aria-hidden="true">+</span>',
        zoomInTitle: 'Zoom in',
        zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
        zoomOutTitle: 'Zoom out'
    },

    onAdd: function(map) {
        var zoomName = 'atlas-control-zoom',
            container = create('div', zoomName + ' atlas-bar'),
            options = this.options;

        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
            zoomName + '-in', container, this._zoomIn);
        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
            zoomName + '-out', container, this._zoomOut);

        this._updateDisabled();
        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

        return container;
    },

    onRemove: function(map) {
        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
    },

    disable: function() {
        this._disabled = true;
        this._updateDisabled();
        return this;
    },

    enable: function() {
        this._disabled = false;
        this._updateDisabled();
        return this;
    },

    _zoomIn: function(e) {
        if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
            this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
        }
    },

    _zoomOut: function(e) {
        if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
            this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
        }
    },

    _createButton: function(html, title, className, container, fn) {
        var link = create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', title);

        disableClickPropagation(link);
        on(link, 'click', stop);
        on(link, 'click', fn, this);
        on(link, 'click', this._refocusOnMap, this);

        return link;
    },

    _updateDisabled: function() {
        var map = this._map,
            className = 'atlas-disabled';

        removeClass(this._zoomInButton, className);
        removeClass(this._zoomOutButton, className);
        this._zoomInButton.setAttribute('aria-disabled', 'false');
        this._zoomOutButton.setAttribute('aria-disabled', 'false');

        if (this._disabled || map._zoom === map.getMinZoom()) {
            addClass(this._zoomOutButton, className);
            this._zoomOutButton.setAttribute('aria-disabled', 'true');
        }
        if (this._disabled || map._zoom === map.getMaxZoom()) {
            addClass(this._zoomInButton, className);
            this._zoomInButton.setAttribute('aria-disabled', 'true');
        }
    }
});

Map.mergeOptions({
    zoomControl: true
});

Map.addInitHook(function() {
    if (this.options.zoomControl) {
        this.zoomControl = new Zoom();
        this.addControl(this.zoomControl);
    }
});

export function zoom(options) {
    return new Zoom(options);
}