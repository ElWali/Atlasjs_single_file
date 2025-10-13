import {
    Layer
} from '../Layer.js';
import {
    Bounds
} from '../../geo/Bounds.js';
import {
    Point
} from '../../geo/Point.js';
import {
    setOptions,
    extend,
    stamp,
    bind,
    throttle,
    wrapNum
} from '../../core/Util.js';
import {
    falseFn
} from '../../core/Dom.js';
import * as Browser from '../../core/Browser.js';
import {
    create,
    remove,
    addClass,
    setPosition,
    toFront,
    toBack,
    setOpacity,
    setTransform
} from '../../core/Dom.js';
import {
    toLatLngBounds
} from '../../geo/LatLngBounds.js';
import {
    requestAnimFrame,
    cancelAnimFrame
} from '../../core/Util.js';

export const GridLayer = Layer.extend({
    options: {
        tileSize: 256,
        opacity: 1,
        updateWhenIdle: Browser.mobile,
        updateWhenZooming: true,
        updateInterval: 200,
        zIndex: 1,
        bounds: null,
        minZoom: 0,
        maxZoom: undefined,
        maxNativeZoom: undefined,
        minNativeZoom: undefined,
        noWrap: false,
        pane: 'tilePane',
        className: '',
        keepBuffer: 2
    },

    initialize: function(options) {
        setOptions(this, options);
    },

    onAdd: function() {
        this._initContainer();

        this._levels = {};
        this._tiles = {};

        this._resetView();
    },

    beforeAdd: function(map) {
        map._addZoomLimit(this);
    },

    onRemove: function(map) {
        this._removeAllTiles();
        remove(this._container);
        map._removeZoomLimit(this);
        this._container = null;
        this._tileZoom = undefined;
    },

    bringToFront: function() {
        if (this._map) {
            toFront(this._container);
            this._setAutoZIndex(Math.max);
        }
        return this;
    },

    bringToBack: function() {
        if (this._map) {
            toBack(this._container);
            this._setAutoZIndex(Math.min);
        }
        return this;
    },

    getContainer: function() {
        return this._container;
    },

    setOpacity: function(opacity) {
        this.options.opacity = opacity;
        this._updateOpacity();
        return this;
    },

    setZIndex: function(zIndex) {
        this.options.zIndex = zIndex;
        this._updateZIndex();

        return this;
    },

    isLoading: function() {
        return this._loading;
    },

    redraw: function() {
        if (this._map) {
            this._removeAllTiles();
            var tileZoom = this._clampZoom(this._map.getZoom());
            if (tileZoom !== this._tileZoom) {
                this._tileZoom = tileZoom;
                this._updateLevels();
            }
            this._update();
        }
        return this;
    },

    getEvents: function() {
        var events = {
            viewprereset: this._invalidateAll,
            viewreset: this._resetView,
            zoom: this._resetView,
            moveend: this._onMoveEnd
        };

        if (!this.options.updateWhenIdle) {
            if (!this._onMove) {
                this._onMove = throttle(this._onMoveEnd, this.options.updateInterval, this);
            }
            events.move = this._onMove;
        }

        if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
        }

        return events;
    },

    createTile: function() {
        return document.createElement('div');
    },

    getTileSize: function() {
        var s = this.options.tileSize;
        return s instanceof Point ? s : new Point(s, s);
    },

    _updateZIndex: function() {
        if (this._container && this.options.zIndex !== undefined && this.options.zIndex !== null) {
            this._container.style.zIndex = this.options.zIndex;
        }
    },

    _setAutoZIndex: function(compare) {
        var layers = this.getPane().children,
            edgeZIndex = -compare(-Infinity, Infinity);

        for (var i = 0, len = layers.length, zIndex; i < len; i++) {
            zIndex = layers[i].style.zIndex;
            if (layers[i] !== this._container && zIndex) {
                edgeZIndex = compare(edgeZIndex, +zIndex);
            }
        }

        if (isFinite(edgeZIndex)) {
            this.options.zIndex = edgeZIndex + compare(-1, 1);
            this._updateZIndex();
        }
    },

    _updateOpacity: function() {
        if (!this._map) {
            return;
        }

        if (Browser.ielt9) {
            return;
        }

        setOpacity(this._container, this.options.opacity);

        var now = +new Date(),
            nextFrame = false,
            willPrune = false;

        for (var key in this._tiles) {
            var tile = this._tiles[key];
            if (!tile.current || !tile.loaded) {
                continue;
            }

            var fade = Math.min(1, (now - tile.loaded) / 200);

            setOpacity(tile.el, fade);
            if (fade < 1) {
                nextFrame = true;
            } else {
                if (tile.active) {
                    willPrune = true;
                } else {
                    this._onOpaqueTile(tile);
                }
                tile.active = true;
            }
        }

        if (willPrune && !this._noPrune) {
            this._pruneTiles();
        }

        if (nextFrame) {
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
        }
    },

    _onOpaqueTile: falseFn,

    _initContainer: function() {
        if (this._container) {
            return;
        }

        this._container = create('div', 'atlas-layer ' + (this.options.className || ''));
        this._updateZIndex();

        if (this.options.opacity < 1) {
            this._updateOpacity();
        }

        this.getPane().appendChild(this._container);
    },

    _updateLevels: function() {
        var zoom = this._tileZoom,
            maxZoom = this.options.maxZoom;

        if (zoom === undefined) {
            return undefined;
        }

        for (var z in this._levels) {
            z = Number(z);
            if (this._levels[z].el.children.length || z === zoom) {
                this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
                this._onUpdateLevel(z);
            } else {
                remove(this._levels[z].el);
                this._removeTilesAtZoom(z);
                this._onRemoveLevel(z);
                delete this._levels[z];
            }
        }

        var level = this._levels[zoom],
            map = this._map;

        if (!level) {
            level = this._levels[zoom] = {};

            level.el = create('div', 'atlas-tile-container atlas-zoom-animated', this._container);
            level.el.style.zIndex = maxZoom;

            level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
            level.zoom = zoom;

            this._setZoomTransform(level, map.getCenter(), map.getZoom());

            falseFn(level.el.offsetWidth);

            this._onCreateLevel(level);
        }

        this._level = level;

        return level;
    },

    _onUpdateLevel: falseFn,
    _onRemoveLevel: falseFn,
    _onCreateLevel: falseFn,

    _pruneTiles: function() {
        if (!this._map) {
            return;
        }

        var key, tile;

        var zoom = this._map.getZoom();
        if (zoom > this.options.maxZoom ||
            zoom < this.options.minZoom) {
            this._removeAllTiles();
            return;
        }

        for (key in this._tiles) {
            tile = this._tiles[key];
            tile.retain = tile.current;
        }

        for (key in this._tiles) {
            tile = this._tiles[key];
            if (tile.current && !tile.active) {
                var coords = tile.coords;
                if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
                    this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
                }
            }
        }

        for (key in this._tiles) {
            if (!this._tiles[key].retain) {
                this._removeTile(key);
            }
        }
    },

    _removeTilesAtZoom: function(zoom) {
        for (var key in this._tiles) {
            if (this._tiles[key].coords.z !== zoom) {
                continue;
            }
            this._removeTile(key);
        }
    },

    _removeAllTiles: function() {
        for (var key in this._tiles) {
            this._removeTile(key);
        }
    },

    _invalidateAll: function() {
        for (var z in this._levels) {
            remove(this._levels[z].el);
            this._onRemoveLevel(Number(z));
            delete this._levels[z];
        }
        this._removeAllTiles();

        this._tileZoom = undefined;
    },

    _retainParent: function(x, y, z, minZoom) {
        var x2 = Math.floor(x / 2),
            y2 = Math.floor(y / 2),
            z2 = z - 1,
            coords2 = new Point(+x2, +y2);
        coords2.z = +z2;

        var key = this._tileCoordsToKey(coords2),
            tile = this._tiles[key];

        if (tile && tile.active) {
            tile.retain = true;
            return true;

        } else if (tile && tile.loaded) {
            tile.retain = true;
        }

        if (z2 > minZoom) {
            return this._retainParent(x2, y2, z2, minZoom);
        }

        return false;
    },

    _retainChildren: function(x, y, z, maxZoom) {
        for (var i = 2 * x; i < 2 * x + 2; i++) {
            for (var j = 2 * y; j < 2 * y + 2; j++) {
                var coords = new Point(i, j);
                coords.z = z + 1;

                var key = this._tileCoordsToKey(coords),
                    tile = this._tiles[key];

                if (tile && tile.active) {
                    tile.retain = true;
                    continue;

                } else if (tile && tile.loaded) {
                    tile.retain = true;
                }

                if (z + 1 < maxZoom) {
                    this._retainChildren(i, j, z + 1, maxZoom);
                }
            }
        }
    },

    _resetView: function(e) {
        var animating = e && (e.pinch || e.flyTo);
        this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
    },

    _animateZoom: function(e) {
        this._setView(e.center, e.zoom, true, e.noUpdate);
    },

    _clampZoom: function(zoom) {
        var options = this.options;

        if (undefined !== options.minNativeZoom && zoom < options.minNativeZoom) {
            return options.minNativeZoom;
        }

        if (undefined !== options.maxNativeZoom && options.maxNativeZoom < zoom) {
            return options.maxNativeZoom;
        }

        return zoom;
    },

    _setView: function(center, zoom, noPrune, noUpdate) {
        var tileZoom = Math.round(zoom);
        if ((this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
            (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)) {
            tileZoom = undefined;
        } else {
            tileZoom = this._clampZoom(tileZoom);
        }

        var tileZoomChanged = this.options.updateWhenZooming && (tileZoom !== this._tileZoom);

        if (!noUpdate || tileZoomChanged) {

            this._tileZoom = tileZoom;

            if (this._abortLoading) {
                this._abortLoading();
            }

            this._updateLevels();
            this._resetGrid();

            if (tileZoom !== undefined) {
                this._update(center);
            }

            if (!noPrune) {
                this._pruneTiles();
            }

            this._noPrune = !!noPrune;
        }

        this._setZoomTransforms(center, zoom);
    },

    _setZoomTransforms: function(center, zoom) {
        for (var i in this._levels) {
            this._setZoomTransform(this._levels[i], center, zoom);
        }
    },

    _setZoomTransform: function(level, center, zoom) {
        var scale = this._map.getZoomScale(zoom, level.zoom),
            translate = level.origin.multiplyBy(scale)
            .subtract(this._map._getNewPixelOrigin(center, zoom)).round();

        if (Browser.any3d) {
            setTransform(level.el, translate, scale);
        } else {
            setPosition(level.el, translate);
        }
    },

    _resetGrid: function() {
        var map = this._map,
            crs = map.options.crs,
            tileSize = this._tileSize = this.getTileSize(),
            tileZoom = this._tileZoom;

        var bounds = this._map.getPixelWorldBounds(this._tileZoom);
        if (bounds) {
            this._globalTileRange = this._pxBoundsToTileRange(bounds);
        }

        this._wrapX = crs.wrapLng && !this.options.noWrap && [
            Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
            Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
        ];
        this._wrapY = crs.wrapLat && !this.options.noWrap && [
            Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
            Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
        ];
    },

    _onMoveEnd: function() {
        if (!this._map || this._map._animatingZoom) {
            return;
        }
        this._update();
    },

    _getTiledPixelBounds: function(center) {
        var map = this._map,
            mapZoom = map._animatingZoom ? Math.max(map._animateToZoom, map.getZoom()) : map.getZoom(),
            scale = map.getZoomScale(mapZoom, this._tileZoom),
            pixelCenter = map.project(center, this._tileZoom).floor(),
            halfSize = map.getSize().divideBy(scale * 2);

        return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
    },

    _update: function(center) {
        var map = this._map;
        if (!map) {
            return;
        }
        var zoom = this._clampZoom(map.getZoom());

        if (center === undefined) {
            center = map.getCenter();
        }
        if (this._tileZoom === undefined) {
            return;
        }

        var pixelBounds = this._getTiledPixelBounds(center),
            tileRange = this._pxBoundsToTileRange(pixelBounds),
            tileCenter = tileRange.getCenter(),
            queue = [],
            margin = this.options.keepBuffer,
            noPruneRange = new Bounds(tileRange.getBottomLeft().subtract([margin, -margin]),
                tileRange.getTopRight().add([margin, -margin]));

        if (!(isFinite(tileRange.min.x) &&
                isFinite(tileRange.min.y) &&
                isFinite(tileRange.max.x) &&
                isFinite(tileRange.max.y))) {
            throw new Error('Attempted to load an infinite number of tiles');
        }

        for (var key in this._tiles) {
            var c = this._tiles[key].coords;
            if (c.z !== this._tileZoom || !noPruneRange.contains(new Point(c.x, c.y))) {
                this._tiles[key].current = false;
            }
        }

        if (Math.abs(zoom - this._tileZoom) > 1) {
            this._setView(center, zoom);
            return;
        }

        for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
            for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
                var coords = new Point(i, j);
                coords.z = this._tileZoom;

                if (!this._isValidTile(coords)) {
                    continue;
                }

                var tile = this._tiles[this._tileCoordsToKey(coords)];
                if (tile) {
                    tile.current = true;
                } else {
                    queue.push(coords);
                }
            }
        }

        queue.sort(function(a, b) {
            return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
        });

        if (queue.length !== 0) {
            if (!this._loading) {
                this._loading = true;
                this.fire('loading');
            }

            var fragment = document.createDocumentFragment();

            for (i = 0; i < queue.length; i++) {
                this._addTile(queue[i], fragment);
            }

            this._level.el.appendChild(fragment);
        }
    },

    _isValidTile: function(coords) {
        var crs = this._map.options.crs;

        if (!crs.infinite) {
            var bounds = this._globalTileRange;
            if ((!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
                (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))) {
                return false;
            }
        }

        if (!this.options.bounds) {
            return true;
        }
        var tileBounds = this._tileCoordsToBounds(coords);
        return toLatLngBounds(this.options.bounds).overlaps(tileBounds);
    },

    _keyToBounds: function(key) {
        return this._tileCoordsToBounds(this._keyToTileCoords(key));
    },

    _tileCoordsToNwSe: function(coords) {
        var map = this._map,
            tileSize = this.getTileSize(),
            nwPoint = coords.scaleBy(tileSize),
            sePoint = nwPoint.add(tileSize),
            nw = map.unproject(nwPoint, coords.z),
            se = map.unproject(sePoint, coords.z);
        return [nw, se];
    },

    _tileCoordsToBounds: function(coords) {
        var bp = this._tileCoordsToNwSe(coords),
            bounds = new LatLngBounds(bp[0], bp[1]);

        if (!this.options.noWrap) {
            bounds = this._map.wrapLatLngBounds(bounds);
        }
        return bounds;
    },

    _tileCoordsToKey: function(coords) {
        return coords.x + ':' + coords.y + ':' + coords.z;
    },

    _keyToTileCoords: function(key) {
        var k = key.split(':'),
            coords = new Point(+k[0], +k[1]);
        coords.z = +k[2];
        return coords;
    },

    _removeTile: function(key) {
        var tile = this._tiles[key];
        if (!tile) {
            return;
        }

        remove(tile.el);

        delete this._tiles[key];

        this.fire('tileunload', {
            tile: tile.el,
            coords: this._keyToTileCoords(key)
        });
    },

    _initTile: function(tile) {
        addClass(tile, 'atlas-tile');

        var tileSize = this.getTileSize();
        tile.style.width = tileSize.x + 'px';
        tile.style.height = tileSize.y + 'px';

        tile.onselectstart = falseFn;
        tile.onmousemove = falseFn;

        if (Browser.ielt9 && this.options.opacity < 1) {
            setOpacity(tile, this.options.opacity);
        }
    },

    _addTile: function(coords, container) {
        var tilePos = this._getTilePos(coords),
            key = this._tileCoordsToKey(coords);

        var tile = this.createTile(this._wrapCoords(coords), bind(this._tileReady, this, coords));

        this._initTile(tile);

        if (this.createTile.length < 2) {
            requestAnimFrame(bind(this._tileReady, this, coords, null, tile));
        }

        setPosition(tile, tilePos);

        this._tiles[key] = {
            el: tile,
            coords: coords,
            current: true
        };

        container.appendChild(tile);
        this.fire('tileloadstart', {
            tile: tile,
            coords: coords
        });
    },

    _tileReady: function(coords, err, tile) {
        if (err) {
            this.fire('tileerror', {
                error: err,
                tile: tile,
                coords: coords
            });
        }

        var key = this._tileCoordsToKey(coords);

        tile = this._tiles[key];
        if (!tile) {
            return;
        }

        tile.loaded = +new Date();
        if (this._map._fadeAnimated) {
            setOpacity(tile.el, 0);
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
        } else {
            tile.active = true;
            this._pruneTiles();
        }

        if (!err) {
            addClass(tile.el, 'atlas-tile-loaded');
            this.fire('tileload', {
                tile: tile.el,
                coords: coords
            });
        }

        if (this._noTilesToLoad()) {
            this._loading = false;
            this.fire('load');

            if (Browser.ielt9 || !this._map._fadeAnimated) {
                requestAnimFrame(this._pruneTiles, this);
            } else {
                setTimeout(bind(this._pruneTiles, this), 250);
            }
        }
    },

    _getTilePos: function(coords) {
        return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
    },

    _wrapCoords: function(coords) {
        var newCoords = new Point(
            this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x,
            this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y);
        newCoords.z = coords.z;
        return newCoords;
    },

    _pxBoundsToTileRange: function(bounds) {
        var tileSize = this.getTileSize();
        return new Bounds(
            bounds.min.unscaleBy(tileSize).floor(),
            bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]));
    },

    _noTilesToLoad: function() {
        for (var key in this._tiles) {
            if (!this._tiles[key].loaded) {
                return false;
            }
        }
        return true;
    }
});

export function gridLayer(options) {
    return new GridLayer(options);
}