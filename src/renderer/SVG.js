import {
    Renderer
} from './Renderer.js';
import {
    create,
    addClass,
    remove,
    on,
    off,
    toFront,
    toBack,
    setPosition
} from '../core/Dom.js';
import * as Browser from '../core/Browser.js';
import {
    pointsToPath
} from './SVG.Util.js';
import {
    stamp,
    isArray
} from '../core/Util.js';

const vmlCreate = (function() {
    try {
        document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
        return function(name) {
            return document.createElement('<lvml:' + name + ' class="lvml">');
        };
    } catch (e) {}
    return function(name) {
        return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft-com:vml" class="lvml">');
    };
}());

export const SVG = Renderer.extend({
    _initContainer: function() {
        this._container = create('svg');
        this._container.setAttribute('pointer-events', 'none');
        this._rootGroup = create('g');
        this._container.appendChild(this._rootGroup);
    },

    _destroyContainer: function() {
        remove(this._container);
        off(this._container);
        delete this._container;
        delete this._rootGroup;
        delete this._svgSize;
    },

    _update: function() {
        if (this._map._animatingZoom && this._bounds) {
            return;
        }

        Renderer.prototype._update.call(this);

        var b = this._bounds,
            size = b.getSize(),
            container = this._container;

        if (!this._svgSize || !this._svgSize.equals(size)) {
            this._svgSize = size;
            container.setAttribute('width', size.x);
            container.setAttribute('height', size.y);
        }

        setPosition(container, b.min);
        container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));

        this.fire('update');
    },

    _initPath: function(layer) {
        var path = layer._path = create('path');

        if (layer.options.className) {
            addClass(path, layer.options.className);
        }

        if (layer.options.interactive) {
            addClass(path, 'atlas-interactive');
        }

        this._updateStyle(layer);
        this._layers[stamp(layer)] = layer;
    },

    _addPath: function(layer) {
        if (!this._rootGroup) {
            this._initContainer();
        }
        this._rootGroup.appendChild(layer._path);
        layer.addInteractiveTarget(layer._path);
    },

    _removePath: function(layer) {
        remove(layer._path);
        layer.removeInteractiveTarget(layer._path);
        delete this._layers[stamp(layer)];
    },

    _updatePath: function(layer) {
        layer._project();
        layer._update();
    },

    _updateStyle: function(layer) {
        var path = layer._path,
            options = layer.options;

        if (!path) {
            return;
        }

        if (options.stroke) {
            path.setAttribute('stroke', options.color);
            path.setAttribute('stroke-opacity', options.opacity);
            path.setAttribute('stroke-width', options.weight);
            path.setAttribute('stroke-linecap', options.lineCap);
            path.setAttribute('stroke-linejoin', options.lineJoin);

            if (options.dashArray) {
                path.setAttribute('stroke-dasharray', options.dashArray);
            } else {
                path.removeAttribute('stroke-dasharray');
            }

            if (options.dashOffset) {
                path.setAttribute('stroke-dashoffset', options.dashOffset);
            } else {
                path.removeAttribute('stroke-dashoffset');
            }
        } else {
            path.setAttribute('stroke', 'none');
        }

        if (options.fill) {
            path.setAttribute('fill', options.fillColor || options.color);
            path.setAttribute('fill-opacity', options.fillOpacity);
            path.setAttribute('fill-rule', options.fillRule || 'evenodd');
        } else {
            path.setAttribute('fill', 'none');
        }
    },

    _updatePoly: function(layer, closed) {
        this._setPath(layer, pointsToPath(layer._parts, closed));
    },

    _updateCircle: function(layer) {
        var p = layer._point,
            r = Math.max(Math.round(layer._radius), 1),
            r2 = Math.max(Math.round(layer._radiusY), 1) || r,
            arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

        var d = layer._empty() ? 'M0 0' :
            'M' + (p.x - r) + ',' + p.y +
            arc + (r * 2) + ',0 ' +
            arc + (-r * 2) + ',0 ';

        this._setPath(layer, d);
    },

    _setPath: function(layer, path) {
        layer._path.setAttribute('d', path);
    },

    _bringToFront: function(layer) {
        toFront(layer._path);
    },

    _bringToBack: function(layer) {
        toBack(layer._path);
    }
});

if (Browser.vml) {
    SVG.include({
        _initContainer: function() {
            this._container = create('div', 'atlas-vml-container');
        },

        _update: function() {
            if (this._map._animatingZoom) {
                return;
            }
            Renderer.prototype._update.call(this);
            this.fire('update');
        },

        _initPath: function(layer) {
            var container = layer._container = vmlCreate('shape');

            addClass(container, 'atlas-vml-shape ' + (this.options.className || ''));

            container.coordsize = '1 1';

            layer._path = vmlCreate('path');
            container.appendChild(layer._path);

            this._updateStyle(layer);
            this._layers[stamp(layer)] = layer;
        },

        _addPath: function(layer) {
            var container = layer._container;
            this._container.appendChild(container);

            if (layer.options.interactive) {
                layer.addInteractiveTarget(container);
            }
        },

        _removePath: function(layer) {
            var container = layer._container;
            remove(container);
            layer.removeInteractiveTarget(container);
            delete this._layers[stamp(layer)];
        },

        _updateStyle: function(layer) {
            var stroke = layer._stroke,
                fill = layer._fill,
                options = layer.options,
                container = layer._container;

            container.stroked = !!options.stroke;
            container.filled = !!options.fill;

            if (options.stroke) {
                if (!stroke) {
                    stroke = layer._stroke = vmlCreate('stroke');
                }
                container.appendChild(stroke);
                stroke.weight = options.weight + 'px';
                stroke.color = options.color;
                stroke.opacity = options.opacity;

                if (options.dashArray) {
                    stroke.dashStyle = isArray(options.dashArray) ?
                        options.dashArray.join(' ') :
                        options.dashArray.replace(/( *, *)/g, ' ');
                } else {
                    stroke.dashStyle = '';
                }
                stroke.endcap = options.lineCap.replace('butt', 'flat');
                stroke.joinstyle = options.lineJoin;

            } else if (stroke) {
                container.removeChild(stroke);
                layer._stroke = null;
            }

            if (options.fill) {
                if (!fill) {
                    fill = layer._fill = vmlCreate('fill');
                }
                container.appendChild(fill);
                fill.color = options.fillColor || options.color;
                fill.opacity = options.fillOpacity;

            } else if (fill) {
                container.removeChild(fill);
                layer._fill = null;
            }
        },

        _updateCircle: function(layer) {
            var p = layer._point.round(),
                r = Math.round(layer._radius),
                r2 = Math.round(layer._radiusY || r);

            this._setPath(layer, layer._empty() ? 'M0 0' :
                'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + (65535 * 360));
        },

        _setPath: function(layer, path) {
            layer._path.v = path;
        }
    });
}

export function svg(options) {
    return Browser.svg || Browser.vml ? new SVG(options) : null;
}