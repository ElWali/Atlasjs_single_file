import {
    Control
} from './Control.js';
import {
    create,
    disableClickPropagation
} from '../core/Dom.js';
import {
    setOptions
} from '../core/Util.js';
import * as Browser from '../core/Browser.js';
import {
    Map
} from '../map/Map.js';

var MoroccanFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="atlas-attribution-flag"><rect width="12" height="8" fill="#c1272d"/><path d="M6 2l1.176 3.608H3.824L5 3.392 6 2z" fill="#006233"/></svg>';

export const Attribution = Control.extend({
    options: {
        position: 'bottomright',
        prefix: '<a href="https://atlasjs.com" title="A JavaScript library for interactive maps">' + (Browser.inlineSvg ? MoroccanFlag + ' ' : '') + 'Atlas</a>'
    },

    initialize: function(options) {
        setOptions(this, options);
        this._attributions = {};
    },

    onAdd: function(map) {
        map.attributionControl = this;
        this._container = create('div', 'atlas-control-attribution');
        disableClickPropagation(this._container);

        for (var i in map._layers) {
            if (map._layers[i].getAttribution) {
                this.addAttribution(map._layers[i].getAttribution());
            }
        }

        this._update();
        map.on('layeradd', this._addAttribution, this);

        return this._container;
    },

    onRemove: function(map) {
        map.off('layeradd', this._addAttribution, this);
    },

    _addAttribution: function(ev) {
        if (ev.layer.getAttribution) {
            this.addAttribution(ev.layer.getAttribution());
            ev.layer.once('remove', function() {
                this.removeAttribution(ev.layer.getAttribution());
            }, this);
        }
    },

    setPrefix: function(prefix) {
        this.options.prefix = prefix;
        this._update();
        return this;
    },

    addAttribution: function(text) {
        if (!text) {
            return this;
        }
        if (!this._attributions[text]) {
            this._attributions[text] = 0;
        }
        this._attributions[text]++;
        this._update();
        return this;
    },

    removeAttribution: function(text) {
        if (!text) {
            return this;
        }
        if (this._attributions[text]) {
            this._attributions[text]--;
            this._update();
        }
        return this;
    },

    _update: function() {
        if (!this._map) {
            return;
        }

        var attribs = [];
        for (var i in this._attributions) {
            if (this._attributions[i]) {
                attribs.push(i);
            }
        }

        var prefixAndAttribs = [];
        if (this.options.prefix) {
            prefixAndAttribs.push(this.options.prefix);
        }
        if (attribs.length) {
            prefixAndAttribs.push(attribs.join(', '));
        }

        this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
    }
});

Map.mergeOptions({
    attributionControl: true
});

Map.addInitHook(function() {
    if (this.options.attributionControl) {
        new Attribution().addTo(this);
    }
});

export function attribution(options) {
    return new Attribution(options);
}