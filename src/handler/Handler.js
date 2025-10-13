import {
    Class
} from '../core/Class.js';

export const Handler = Class.extend({
    initialize: function(map) {
        this._map = map;
    },

    enable: function() {
        if (this._enabled) {
            return this;
        }

        this._enabled = true;
        this.addHooks();
        return this;
    },

    disable: function() {
        if (!this._enabled) {
            return this;
        }

        this._enabled = false;
        this.removeHooks();
        return this;
    },

    enabled: function() {
        return !!this._enabled;
    }
});

Handler.addTo = function(map, name) {
    map.addHandler(name, this);
    return this;
};