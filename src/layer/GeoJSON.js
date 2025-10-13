import {
    FeatureGroup
} from './FeatureGroup.js';
import {
    Marker
} from './Marker.js';
import {
    Polyline
} from './Polyline.js';
import {
    Polygon
} from './Polygon.js';
import {
    LayerGroup
} from './LayerGroup.js';
import {
    CircleMarker
} from './CircleMarker.js';
import {
    Circle
} from './Circle.js';
import {
    toLatLng
} from '../geo/LatLng.js';
import {
    extend,
    setOptions,
    isArray,
    formatNum
} from '../core/Util.js';

export const GeoJSON = FeatureGroup.extend({
    initialize: function(geojson, options) {
        setOptions(this, options);

        this._layers = {};

        if (geojson) {
            this.addData(geojson);
        }
    },

    addData: function(geojson) {
        var features = isArray(geojson) ? geojson : geojson.features,
            i, len, feature;

        if (features) {
            for (i = 0, len = features.length; i < len; i++) {
                feature = features[i];
                if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                    this.addData(feature);
                }
            }
            return this;
        }

        var options = this.options;

        if (options.filter && !options.filter(geojson)) {
            return this;
        }

        var layer = geometryToLayer(geojson, options);
        if (!layer) {
            return this;
        }
        layer.feature = asFeature(geojson);

        layer.defaultOptions = layer.options;
        this.resetStyle(layer);

        if (options.onEachFeature) {
            options.onEachFeature(geojson, layer);
        }

        return this.addLayer(layer);
    },

    resetStyle: function(layer) {
        if (layer === undefined) {
            return this.eachLayer(this.resetStyle, this);
        }
        layer.options = extend({}, layer.defaultOptions);
        this._setLayerStyle(layer, this.options.style);
        return this;
    },

    setStyle: function(style) {
        return this.eachLayer(function(layer) {
            this._setLayerStyle(layer, style);
        }, this);
    },

    _setLayerStyle: function(layer, style) {
        if (layer.setStyle) {
            if (typeof style === 'function') {
                style = style(layer.feature);
            }
            layer.setStyle(style);
        }
    }
});

export function geometryToLayer(geojson, options) {

    var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
        coords = geometry ? geometry.coordinates : null,
        layers = [],
        pointToLayer = options && options.pointToLayer,
        _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng,
        latlng, latlngs, i, len;

    if (!coords && !geometry) {
        return null;
    }

    switch (geometry.type) {
        case 'Point':
            latlng = _coordsToLatLng(coords);
            return _pointToLayer(pointToLayer, geojson, latlng, options);

        case 'MultiPoint':
            for (i = 0, len = coords.length; i < len; i++) {
                latlng = _coordsToLatLng(coords[i]);
                layers.push(_pointToLayer(pointToLayer, geojson, latlng, options));
            }
            return new FeatureGroup(layers);

        case 'LineString':
        case 'MultiLineString':
            latlngs = coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
            return new Polyline(latlngs, options);

        case 'Polygon':
        case 'MultiPolygon':
            latlngs = coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
            return new Polygon(latlngs, options);

        case 'GeometryCollection':
            for (i = 0, len = geometry.geometries.length; i < len; i++) {
                var geoLayer = geometryToLayer({
                    geometry: geometry.geometries[i],
                    type: 'Feature',
                    properties: geojson.properties
                }, options);

                if (geoLayer) {
                    layers.push(geoLayer);
                }
            }
            return new FeatureGroup(layers);

        case 'FeatureCollection':
            for (i = 0, len = geometry.features.length; i < len; i++) {
                var featureLayer = geometryToLayer(geometry.features[i], options);
                if (featureLayer) {
                    layers.push(featureLayer);
                }
            }
            return new FeatureGroup(layers);

        default:
            throw new Error('Invalid GeoJSON object.');
    }
}

function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
    return pointToLayerFn ?
        pointToLayerFn(geojson, latlng) :
        new Marker(latlng, options && options.markersInheritOptions && options);
}

export function coordsToLatLng(coords) {
    return new LatLng(coords[1], coords[0], coords[2]);
}

export function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
    var latlngs = [];

    for (var i = 0, len = coords.length, latlng; i < len; i++) {
        latlng = levelsDeep ?
            coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng) :
            (_coordsToLatLng || coordsToLatLng)(coords[i]);

        latlngs.push(latlng);
    }

    return latlngs;
}

export function latLngToCoords(latlng, precision) {
    latlng = toLatLng(latlng);
    return latlng.alt !== undefined ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
}

export function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
    var coords = [];

    for (var i = 0, len = latlngs.length; i < len; i++) {
        coords.push(levelsDeep ?
            latLngsToCoords(latlngs[i], isFlat(latlngs[i]) ? 0 : levelsDeep - 1, closed, precision) :
            latLngToCoords(latlngs[i], precision));
    }

    if (!levelsDeep && closed && coords.length > 0) {
        coords.push(coords[0].slice());
    }

    return coords;
}

export function getFeature(layer, newGeometry) {
    return layer.feature ?
        extend({}, layer.feature, {
            geometry: newGeometry
        }) :
        asFeature(newGeometry);
}

export function asFeature(geojson) {
    if (geojson.type === 'Feature' || geojson.type === 'FeatureCollection') {
        return geojson;
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: geojson
    };
}

const PointToGeoJSON = {
    toGeoJSON: function(precision) {
        return getFeature(this, {
            type: 'Point',
            coordinates: latLngToCoords(this.getLatLng(), precision)
        });
    }
};

Marker.include(PointToGeoJSON);
Circle.include(PointToGeoJSON);
CircleMarker.include(PointToGeoJSON);

Polyline.include({
    toGeoJSON: function(precision) {
        var multi = !isFlat(this._latlngs);

        var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);

        return getFeature(this, {
            type: (multi ? 'Multi' : '') + 'LineString',
            coordinates: coords
        });
    }
});

Polygon.include({
    toGeoJSON: function(precision) {
        var holes = !isFlat(this._latlngs),
            multi = holes && !isFlat(this._latlngs[0]);

        var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);

        if (!holes) {
            coords = [coords];
        }

        return getFeature(this, {
            type: (multi ? 'Multi' : '') + 'Polygon',
            coordinates: coords
        });
    }
});

LayerGroup.include({
    toMultiPoint: function(precision) {
        var coords = [];

        this.eachLayer(function(layer) {
            coords.push(layer.toGeoJSON(precision).geometry.coordinates);
        });

        return getFeature(this, {
            type: 'MultiPoint',
            coordinates: coords
        });
    },

    toGeoJSON: function(precision) {

        var type = this.feature && this.feature.geometry && this.feature.geometry.type;

        if (type === 'MultiPoint') {
            return this.toMultiPoint(precision);
        }

        var isGeometryCollection = type === 'GeometryCollection',
            jsons = [];

        this.eachLayer(function(layer) {
            if (layer.toGeoJSON) {
                var json = layer.toGeoJSON(precision);
                if (isGeometryCollection) {
                    jsons.push(json.geometry);
                } else {
                    var feature = asFeature(json);
                    if (feature.type === 'FeatureCollection') {
                        jsons.push.apply(jsons, feature.features);
                    } else {
                        jsons.push(feature);
                    }
                }
            }
        });

        if (isGeometryCollection) {
            return getFeature(this, {
                geometries: jsons,
                type: 'GeometryCollection'
            });
        }

        return {
            type: 'FeatureCollection',
            features: jsons
        };
    }
});

export function geoJSON(geojson, options) {
    return new GeoJSON(geojson, options);
}

export const geoJson = geoJSON;