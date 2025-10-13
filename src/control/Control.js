import {
    Class
} from '../core/Class.js';
import {
    setOptions
} from '../core/Util.js';
import {
    create,
    addClass,
    remove
} from '../core/Dom.js';
import {
    Map
} from '../map/Map.js';

export const Control = Class.extend({
    options: {
        position: 'topright'
    },

    initialize: function(options) {
        setOptions(this, options);
    },

    getPosition: function() {
        return this.options.position;
    },

    setPosition: function(position) {
        var map = this._map;

        if (map) {
            map.removeControl(this);
        }

        this.options.position = position;

        if (map) {
            map.addControl(this);
        }

        return this;
    },

    getContainer: function() {
        return this._container;
    },

    addTo: function(map) {
        this.remove();
        this._map = map;

        var container = this._container = this.onAdd(map),
            pos = this.getPosition(),
            corner = map._controlCorners[pos];

        addClass(container, 'atlas-control');

        if (pos.indexOf('bottom') !== -1) {
            corner.insertBefore(container, corner.firstChild);
        } else {
            corner.appendChild(container);
        }

        this._map.on('unload', this.remove, this);

        return this;
    },

    remove: function() {
        if (!this._map) {
            return this;
        }

        remove(this._container);

        if (this.onRemove) {
            this.onRemove(this._map);
        }

        this._map.off('unload', this.remove, this);
        this._map = null;

        return this;
    },

    _refocusOnMap: function(e) {
        if (this._map && e && e.screenX > 0 && e.screenY > 0) {
            this._map.getContainer().focus();
        }
    }
});

export function control(options) {
    return new Control(options);
}

Map.include({
    addControl: function(control) {
        control.addTo(this);
        return this;
    },

    removeControl: function(control) {
        control.remove();
        return this;
    },

    _initControlPos: function() {
        var corners = this._controlCorners = {},
            l = 'atlas-',
            container = this._controlContainer =
            create('div', l + 'control-container', this._container);

        function createCorner(vSide, hSide) {
            var className = l + vSide + ' ' + l + hSide;
            corners[vSide + hSide] = create('div', className, container);
        }

        createCorner('top', 'left');
        createCorner('top', 'right');
        createCorner('bottom', 'left');
        createCorner('bottom', 'right');
    },

    _clearControlPos: function() {
        for (var i in this._controlCorners) {
            remove(this._controlCorners[i]);
        }
        remove(this._controlContainer);
        delete this._controlCorners;
        delete this._controlContainer;
    }
});