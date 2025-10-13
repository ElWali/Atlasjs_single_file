import { DivOverlay } from './DivOverlay.js';
import { on, off, remove, getPosition, setPosition, getScale, disableClickPropagation, toFront, toBack, setOpacity, getStyle, create } from '../core/Dom.js';
import { Point } from '../geo/Point.js';
import { stamp, setOptions, toPoint, toLatLng, bind } from '../core/Util.js';
import { Layer } from '../layer/Layer.js';
import { FeatureGroup } from '../layer/FeatureGroup.js';

export const Popup = DivOverlay.extend({
    options: {
        pane: 'popupPane',
        offset: [0, 7],
        maxWidth: 300,
        minWidth: 50,
        maxHeight: null,
        autoPan: true,
        autoPanPaddingTopLeft: null,
        autoPanPaddingBottomRight: null,
        autoPanPadding: [5, 5],
        keepInView: false,
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        closeOnClick: true,
        className: ''
    },

    openOn: function(map) {
        map.openPopup(this);
        return this;
    },

    onAdd: function(map) {
        DivOverlay.prototype.onAdd.call(this, map);

        map.fire('popupopen', {
            popup: this
        });

        if (this._source) {
            this._source.fire('popupopen', {
                popup: this
            }, true);
            if (!(this._source instanceof Layer)) {
                this._source.on('preclick', stopPropagation);
            }
        }
    },

    onRemove: function(map) {
        DivOverlay.prototype.onRemove.call(this, map);

        map.fire('popupclose', {
            popup: this
        });

        if (this._source) {
            this._source.fire('popupclose', {
                popup: this
            }, true);
            if (!(this._source instanceof Layer)) {
                this._source.off('preclick', stopPropagation);
            }
        }
    },

    getEvents: function() {
        var events = DivOverlay.prototype.getEvents.call(this);

        if (this.options.closeOnClick !== undefined ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
            events.preclick = this._close;
        }

        if (this.options.keepInView) {
            events.moveend = this._adjustPan;
        }
        return events;
    },

    _close: function() {
        if (this._map) {
            this._map.closePopup(this);
        }
    },

    _initLayout: function() {
        var prefix = 'atlas-popup',
            container = this._container =
            create('div', prefix + ' ' + (this.options.className || '') + ' atlas-zoom-animated');

        var wrapper = this._wrapper = create('div', prefix + '-content-wrapper', container);
        this._contentNode = create('div', prefix + '-content', wrapper);

        disableClickPropagation(wrapper);
        disableScrollPropagation(this._contentNode);
        on(wrapper, 'contextmenu', stopPropagation);

        this._tipContainer = create('div', prefix + '-tip-container', container);
        this._tip = create('div', prefix + '-tip', this._tipContainer);

        if (this.options.closeButton) {
            var closeButton = this._closeButton = create('a', prefix + '-close-button', container);
            closeButton.setAttribute('role', 'button');
            closeButton.setAttribute('aria-label', 'Close popup');
            closeButton.href = '#close';
            closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';

            on(closeButton, 'click', this._onCloseButtonClick, this);
        }
    },

    _updateLayout: function() {
        var container = this._contentNode,
            style = container.style;

        style.width = '';
        style.whiteSpace = 'nowrap';

        var width = container.offsetWidth;
        width = Math.min(width, this.options.maxWidth);
        width = Math.max(width, this.options.minWidth);

        style.width = (width + 1) + 'px';
        style.whiteSpace = '';

        style.height = '';

        var height = container.offsetHeight,
            maxHeight = this.options.maxHeight,
            scrolledClass = 'atlas-popup-scrolled';

        if (maxHeight && height > maxHeight) {
            style.height = maxHeight + 'px';
            addClass(container, scrolledClass);
        } else {
            removeClass(container, scrolledClass);
        }

        this._containerWidth = this._container.offsetWidth;
    },

    _updatePosition: function() {
        if (!this._map) {
            return;
        }

        var pos = this._map.latLngToLayerPoint(this._latlng),
            offset = toPoint(this.options.offset),
            anchor = this._getAnchor();

        if (this._zoomAnimated) {
            setPosition(this._container, pos.add(anchor));
        } else {
            offset = offset.add(pos).add(anchor);
        }

        var bottom = this._containerBottom = -offset.y,
            left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

        this._container.style.bottom = bottom + 'px';
        this._container.style.left = left + 'px';
    },

    _adjustPan: function() {
        if (!this.options.autoPan) {
            return;
        }
        if (this._map._panAnim && this._map._panAnim.inProgress) {
            return;
        }

        var map = this._map,
            marginBottom = parseInt(getStyle(this._container, 'marginBottom'), 10) || 0,
            containerHeight = this._container.offsetHeight + marginBottom,
            containerWidth = this._containerWidth,
            layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);

        layerPos._add(getPosition(this._container));

        var containerPos = map.layerPointToContainerPoint(layerPos),
            padding = toPoint(this.options.autoPanPadding),
            paddingTL = toPoint(this.options.autoPanPaddingTopLeft || padding),
            paddingBR = toPoint(this.options.autoPanPaddingBottomRight || padding),
            size = map.getSize(),
            dx = 0,
            dy = 0;

        if (containerPos.x + containerWidth + paddingBR.x > size.x) {
            dx = containerPos.x + containerWidth - size.x + paddingBR.x;
        }
        if (containerPos.x - dx - paddingTL.x < 0) {
            dx = containerPos.x - paddingTL.x;
        }
        if (containerPos.y + containerHeight + paddingBR.y > size.y) {
            dy = containerPos.y + containerHeight - size.y + paddingBR.y;
        }
        if (containerPos.y - dy - paddingTL.y < 0) {
            dy = containerPos.y - paddingTL.y;
        }

        if (dx || dy) {
            map
                .fire('autopanstart')
                .panBy([dx, dy]);
        }
    },

    _onCloseButtonClick: function(e) {
        this._close();
        stop(e);
    },

    _getAnchor: function() {
        return toPoint(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
    }
});

export function popup(options, source) {
    return new Popup(options, source);
}

Layer.prototype.bindPopup = function(content, options) {
    if (content instanceof Popup) {
        setOptions(content, options);
        this._popup = content;
        content._source = this;
    } else {
        if (!this._popup || options) {
            this._popup = new Popup(options, this);
        }
        this._popup.setContent(content);
    }

    if (!this._popupEventsAdded) {
        this.on({
            click: this._openPopup,
            keypress: this._onKeyPress,
            remove: this.closePopup,
            move: this._movePopup
        });
        this._popupEventsAdded = true;
    }

    return this;
};

Layer.prototype.unbindPopup = function() {
    if (this._popup) {
        this.off({
            click: this._openPopup,
            keypress: this._onKeyPress,
            remove: this.closePopup,
            move: this._movePopup
        });
        this._popupEventsAdded = false;
        this._popup = null;
    }
    return this;
};

Layer.prototype.openPopup = function(latlng) {
    if (this._popup && this._map) {
        this._popup._prepareOpen(this, latlng);
        this._map.openPopup(this._popup);
    }

    return this;
};

Layer.prototype.closePopup = function() {
    if (this._popup) {
        this._popup._close();
    }
    return this;
};

Layer.prototype.togglePopup = function() {
    if (this._popup) {
        if (this._popup.isOpen()) {
            this.closePopup();
        } else {
            this.openPopup();
        }
    }
    return this;
};

Layer.prototype.isPopupOpen = function() {
    return (this._popup ? this._popup.isOpen() : false);
};

Layer.prototype.setPopupContent = function(content) {
    if (this._popup) {
        this._popup.setContent(content);
    }
    return this;
};

Layer.prototype.getPopup = function() {
    return this._popup;
};

Layer.prototype._openPopup = function(e) {
    var layer = e.layer || e.target;

    if (!this._popup) {
        return;
    }

    if (!this._map) {
        return;
    }
    stop(e);

    if (layer instanceof FeatureGroup) {
        for (var id in this._layers) {
            layer = this._layers[id];
            break;
        }
    }

    if (!layer.getCenter) {
        layer = this;
    }

    this._popup.setLatLng(e.latlng);
    this.openPopup();
};

Layer.prototype._movePopup = function(e) {
    this._popup.setLatLng(e.latlng);
};

Layer.prototype._onKeyPress = function(e) {
    if (e.originalEvent.keyCode === 13) {
        this._openPopup(e);
    }
};