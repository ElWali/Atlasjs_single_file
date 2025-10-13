import { DivOverlay } from './DivOverlay.js';
import { on, off, remove, getPosition, setPosition, getScale, disableClickPropagation, toFront, toBack, setOpacity, getStyle, create, addClass, removeClass } from '../core/Dom.js';
import { Point } from '../geo/Point.js';
import { stamp, setOptions, toPoint, toLatLng, bind } from '../core/Util.js';
import { Layer } from '../layer/Layer.js';
import { FeatureGroup } from '../layer/FeatureGroup.js';

export const Tooltip = DivOverlay.extend({
    options: {
        pane: 'tooltipPane',
        offset: [0, 0],
        direction: 'auto',
        permanent: false,
        sticky: false,
        interactive: false,
        opacity: 0.9
    },

    onAdd: function(map) {
        DivOverlay.prototype.onAdd.call(this, map);
        this.setOpacity(this.options.opacity);

        map.fire('tooltipopen', {
            tooltip: this
        });

        if (this._source) {
            this.addEventParent(this._source);
            this._source.fire('tooltipopen', {
                tooltip: this
            }, true);
        }
    },

    onRemove: function(map) {
        DivOverlay.prototype.onRemove.call(this, map);

        map.fire('tooltipclose', {
            tooltip: this
        });

        if (this._source) {
            this.removeEventParent(this._source);
            this._source.fire('tooltipclose', {
                tooltip: this
            }, true);
        }
    },

    getEvents: function() {
        var events = DivOverlay.prototype.getEvents.call(this);

        if (!this.options.permanent) {
            events.preclick = this._close;
        }

        return events;
    },

    _close: function() {
        if (this._map) {
            this._map.closeTooltip(this);
        }
    },

    _initLayout: function() {
        var prefix = 'atlas-tooltip',
            className = prefix + ' ' + (this.options.className || '') + ' atlas-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

        this._contentNode = this._container = create('div', className);
        this._container.setAttribute('role', 'tooltip');
        this._container.setAttribute('id', 'atlas-tooltip-' + stamp(this));
    },

    _updateLayout: function() {},

    _updatePosition: function() {
        var pos = this._map.latLngToLayerPoint(this._latlng),
            offset = toPoint(this.options.offset);

        if (this._zoomAnimated) {
            setPosition(this._container, pos.add(this._getAnchor()));
        } else {
            pos = pos.add(this._getAnchor().add(offset));
        }
        var bottom = this._containerBottom = -pos.y,
            left = this._containerLeft = -Math.round(this._container.offsetWidth / 2) + pos.x;

        this._container.style.bottom = bottom + 'px';
        this._container.style.left = left + 'px';
    },

    setOpacity: function(opacity) {
        this.options.opacity = opacity;
        if (this._container) {
            setOpacity(this._container, opacity);
        }
    },

    _getAnchor: function() {
        var direction = this.options.direction,
            pos = this._map.latLngToContainerPoint(this._latlng),
            centerPoint = this._map.getSize().divideBy(2),
            container = this._container;

        if (direction === 'auto') {
            var anchor = new Point(0, 0);
            if (pos.y - container.offsetHeight - 20 > 0) {
                anchor.y = -container.offsetHeight - 10;
            } else {
                anchor.y = 10;
            }
            return anchor;
        }

        var tooltipContainer = this._container,
            size = this._map.getSize(),
            anchor = new Point(0, 0);

        if (direction === 'top') {
            anchor.y = -tooltipContainer.offsetHeight - 10;
        } else if (direction === 'bottom') {
            anchor.y = 10;
        } else if (direction === 'left') {
            anchor.x = -tooltipContainer.offsetWidth - 10;
        } else if (direction === 'right') {
            anchor.x = 10;
        }
        return anchor;
    },
});

export function tooltip(options, source) {
    return new Tooltip(options, source);
}

Layer.prototype.bindTooltip = function(content, options) {
    if (content instanceof Tooltip) {
        setOptions(content, options);
        this._tooltip = content;
        content._source = this;
    } else {
        if (!this._tooltip || options) {
            this._tooltip = new Tooltip(options, this);
        }
        this._tooltip.setContent(content);
    }

    this._initTooltipInteractions();

    if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
        this.openTooltip();
    }

    return this;
};

Layer.prototype.unbindTooltip = function() {
    if (this._tooltip) {
        this._initTooltipInteractions(true);
        this.closeTooltip();
        this._tooltip = null;
    }
    return this;
};

Layer.prototype.openTooltip = function(latlng) {
    if (this._tooltip && this._map) {
        this._tooltip._prepareOpen(this, latlng);
        this._map.openTooltip(this._tooltip);
    }
    return this;
};

Layer.prototype.closeTooltip = function() {
    if (this._tooltip) {
        this._tooltip._close();
    }
    return this;
};

Layer.prototype.toggleTooltip = function() {
    if (this._tooltip) {
        if (this._tooltip.isOpen()) {
            this.closeTooltip();
        } else {
            this.openTooltip();
        }
    }
    return this;
};

Layer.prototype.isTooltipOpen = function() {
    return this._tooltip ? this._tooltip.isOpen() : false;
};

Layer.prototype.setTooltipContent = function(content) {
    if (this._tooltip) {
        this._tooltip.setContent(content);
    }
    return this;
};

Layer.prototype.getTooltip = function() {
    return this._tooltip;
};

Layer.prototype._initTooltipInteractions = function(remove) {
    if (!remove && this._tooltipHandlersAdded) {
        return;
    }
    var onOff = remove ? 'off' : 'on',
        events = {
            remove: this.closeTooltip,
            move: this._moveTooltip
        };
    if (!this._tooltip.options.permanent) {
        events.mouseover = this._openTooltip;
        events.mouseout = this.closeTooltip;
        events.click = this._openTooltip;
        if (this._tooltip.options.sticky) {
            events.mousemove = this._moveTooltip;
        }
        if (Browser.touch) {
            events.click = this._openTooltip;
        }
    } else {
        events.add = this._openTooltip;
    }
    this[onOff](events);
    this._tooltipHandlersAdded = !remove;
};

Layer.prototype._openTooltip = function(e) {
    var layer = e.layer || e.target;

    if (!this._tooltip || !this._map) {
        return;
    }
    this.openTooltip(layer || this, e.latlng);
};

Layer.prototype._moveTooltip = function(e) {
    var latlng = e.latlng,
        containerPoint, layer;
    if (this._tooltip.options.sticky && e.originalEvent) {
        containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
        layer = this._map.getLayerAt(containerPoint);
        if (layer && layer.getLatLng) {
            latlng = layer.getLatLng();
        }
    }
    this._tooltip.setLatLng(latlng);
};