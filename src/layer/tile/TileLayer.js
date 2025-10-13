import {
    GridLayer
} from './GridLayer.js';
import {
    setOptions,
    extend,
    bind,
    template,
    emptyImageUrl
} from '../../core/Util.js';
import {
    falseFn
} from '../../core/Dom.js';
import * as Browser from '../../core/Browser.js';
import {
    on,
    remove
} from '../../core/Dom.js';

export const TileLayer = GridLayer.extend({
    options: {
        minZoom: 0,
        maxZoom: 18,
        subdomains: 'abc',
        errorTileUrl: '',
        zoomOffset: 0,
        tms: false,
        zoomReverse: false,
        detectRetina: false,
        crossOrigin: false,
        referrerPolicy: false
    },

    initialize: function(url, options) {
        this._url = url;

        options = setOptions(this, options);

        if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
            options.tileSize = Math.floor(options.tileSize / 2);

            if (!options.zoomReverse) {
                options.zoomOffset++;
                options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
            } else {
                options.zoomOffset--;
                options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
            }

            options.minZoom = Math.max(0, options.minZoom);
        } else if (!options.zoomReverse) {
            options.maxZoom = Math.max(options.minZoom, options.maxZoom);
        } else {
            options.minZoom = Math.min(options.maxZoom, options.minZoom);
        }

        if (typeof options.subdomains === 'string') {
            options.subdomains = options.subdomains.split('');
        }

        this.on('tileunload', this._onTileRemove);
    },

    setUrl: function(url, noRedraw) {
        if (this._url === url && noRedraw === undefined) {
            noRedraw = true;
        }

        this._url = url;

        if (!noRedraw) {
            this.redraw();
        }
        return this;
    },

    createTile: function(coords, done) {
        var tile = document.createElement('img');

        on(tile, 'load', bind(this._tileOnLoad, this, done, tile));
        on(tile, 'error', bind(this._tileOnError, this, done, tile));

        if (this.options.crossOrigin || this.options.crossOrigin === '') {
            tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
        }

        if (typeof this.options.referrerPolicy === 'string') {
            tile.referrerPolicy = this.options.referrerPolicy;
        }

        tile.alt = '';
        tile.src = this.getTileUrl(coords);

        return tile;
    },

    getTileUrl: function(coords) {
        var data = {
            r: Browser.retina ? '@2x' : '',
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: this._getZoomForUrl()
        };
        if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
                data['y'] = invertedY;
            }
            data['-y'] = invertedY;
        }

        return template(this._url, extend(data, this.options));
    },

    _tileOnLoad: function(done, tile) {
        if (Browser.ielt9) {
            setTimeout(bind(done, this, null, tile), 0);
        } else {
            done(null, tile);
        }
    },

    _tileOnError: function(done, tile, e) {
        var errorUrl = this.options.errorTileUrl;
        if (errorUrl && tile.getAttribute('src') !== errorUrl) {
            tile.src = errorUrl;
        }
        done(e, tile);
    },

    _onTileRemove: function(e) {
        e.tile.onload = null;
    },

    _getZoomForUrl: function() {
        var zoom = this._tileZoom,
            maxZoom = this.options.maxZoom,
            zoomReverse = this.options.zoomReverse,
            zoomOffset = this.options.zoomOffset;

        if (zoomReverse) {
            zoom = maxZoom - zoom;
        }

        return zoom + zoomOffset;
    },

    _getSubdomain: function(tilePoint) {
        var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
        return this.options.subdomains[index];
    },

    _abortLoading: function() {
        var i, tile;
        for (i in this._tiles) {
            if (this._tiles[i].coords.z !== this._tileZoom) {
                tile = this._tiles[i].el;

                tile.onload = falseFn;
                tile.onerror = falseFn;
                if (!tile.complete) {
                    tile.src = emptyImageUrl;
                    var coords = this._tiles[i].coords;
                    remove(tile);
                    delete this._tiles[i];
                    this.fire('tileabort', {
                        tile: tile,
                        coords: coords
                    });
                }
            }
        }
    },

    _removeTile: function(key) {
        var tile = this._tiles[key];
        if (!tile) {
            return;
        }

        tile.el.setAttribute('src', emptyImageUrl);

        return GridLayer.prototype._removeTile.call(this, key);
    },

    _tileReady: function(coords, err, tile) {
        if (!this._map || (tile && tile.getAttribute('src') === emptyImageUrl)) {
            return;
        }

        return GridLayer.prototype._tileReady.call(this, coords, err, tile);
    }
});

export function tileLayer(url, options) {
    return new TileLayer(url, options);
}