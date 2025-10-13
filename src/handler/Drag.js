import {
    Handler
} from './Handler.js';
import {
    Draggable
} from './Draggable.js';
import {
    toLatLngBounds
} from '../geo/LatLngBounds.js';
import {
    toBounds
} from '../geo/Bounds.js';
import {
    toPoint
} from '../geo/Point.js';
import {
    addClass,
    removeClass
} from '../core/Dom.js';
import {
    requestAnimFrame
} from '../core/Util.js';

export const MarkerDrag = Handler.extend({
	initialize: function (marker) {
		this._marker = marker;
	},

	addHooks: function () {
		var icon = this._marker._icon;

		if (!this._draggable) {
			this._draggable = new Draggable(icon, icon, true);
		}

		this._draggable.on({
			dragstart: this._onDragStart,
			predrag: this._onPreDrag,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).enable();

		addClass(icon, 'atlas-marker-draggable');
	},

	removeHooks: function () {
		this._draggable.off({
			dragstart: this._onDragStart,
			predrag: this._onPreDrag,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).disable();

		if (this._marker._icon) {
			removeClass(this._marker._icon, 'atlas-marker-draggable');
		}
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_adjustPan: function (e) {
		var marker = this._marker,
		    map = marker._map,
		    speed = this._marker.options.autoPanSpeed,
		    padding = this._marker.options.autoPanPadding,
		    iconPos = getPosition(marker._icon),
		    bounds = map.getPixelBounds(),
		    origin = map.getPixelOrigin();

		var panBounds = toBounds(
			bounds.min._subtract(origin).add(padding),
			bounds.max._subtract(origin).subtract(padding)
		);

		if (!panBounds.contains(iconPos)) {
			var movement = toPoint(
				(Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) -
				(Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x),

				(Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) -
				(Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)
			).multiplyBy(speed);

			map.panBy(movement, {animate: false});

			this._draggable._newPos._add(movement);
			this._draggable._startPos._add(movement);

			setPosition(marker._icon, this._draggable._newPos);
			this._onDrag(e);

			this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
		}
	},

	_onDragStart: function () {
		this._oldLatLng = this._marker.getLatLng();
		this._marker.closePopup && this._marker.closePopup();

		this._marker
			.fire('movestart')
			.fire('dragstart');
	},

	_onPreDrag: function (e) {
		if (this._marker.options.autoPan) {
			cancelAnimFrame(this._panRequest);
			this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
		}
	},

	_onDrag: function (e) {
		var marker = this._marker,
		    shadow = marker._shadow,
		    iconPos = getPosition(marker._icon),
		    latlng = marker._map.layerPointToLatLng(iconPos);

		if (shadow) {
			setPosition(shadow, iconPos);
		}

		marker._latlng = latlng;
		e.latlng = latlng;
		e.oldLatLng = this._oldLatLng;

		marker
		    .fire('move', e)
		    .fire('drag', e);
	},

	_onDragEnd: function (e) {
		 cancelAnimFrame(this._panRequest);
		delete this._oldLatLng;
		this._marker
		    .fire('moveend')
		    .fire('dragend', e);
	}
});

export const Drag = Handler.extend({
    addHooks: function() {
        if (!this._draggable) {
            var map = this._map;

            this._draggable = new Draggable(map._mapPane, map._container);

            this._draggable.on({
                dragstart: this._onDragStart,
                drag: this._onDrag,
                dragend: this._onDragEnd
            }, this);

            this._draggable.on('predrag', this._onPreDragLimit, this);
            if (map.options.worldCopyJump) {
                this._draggable.on('predrag', this._onPreDragWrap, this);
                map.on('zoomend', this._onZoomEnd, this);
                map.whenReady(this._onZoomEnd, this);
            }
        }
        addClass(this._map._container, 'atlas-grab atlas-touch-drag');
        this._draggable.enable();
        this._positions = [];
        this._times = [];
    },

    removeHooks: function() {
        removeClass(this._map._container, 'atlas-grab');
        removeClass(this._map._container, 'atlas-touch-drag');
        this._draggable.disable();
    },

    moved: function() {
        return this._draggable && this._draggable._moved;
    },

    moving: function() {
        return this._draggable && this._draggable._moving;
    },

    _onDragStart: function() {
        var map = this._map;

        map._stop();
        if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
            var bounds = toLatLngBounds(this._map.options.maxBounds);

            this._offsetLimit = toBounds(
                this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
                this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1)
                .add(this._map.getSize()));
            this._viscosity = Math.min(1.0, Math.max(0.0, this._map.options.maxBoundsViscosity));
        } else {
            this._offsetLimit = null;
        }

        map
            .fire('movestart')
            .fire('dragstart');

        if (map.options.inertia) {
            this._positions = [];
            this._times = [];
        }
    },

    _onDrag: function(e) {
        if (this._map.options.inertia) {
            var time = this._lastTime = +new Date(),
                pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;

            this._positions.push(pos);
            this._times.push(time);

            this._prunePositions(time);
        }

        this._map
            .fire('move', e)
            .fire('drag', e);
    },

    _prunePositions: function(time) {
        while (this._positions.length > 1 && time - this._times[0] > 50) {
            this._positions.shift();
            this._times.shift();
        }
    },

    _onZoomEnd: function() {
        var pxCenter = this._map.getSize().divideBy(2),
            pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

        this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
        this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
    },

    _viscousLimit: function(value, threshold) {
        return value - (value - threshold) * this._viscosity;
    },

    _onPreDragLimit: function() {
        if (!this._viscosity || !this._offsetLimit) {
            return;
        }

        var offset = this._draggable._newPos.subtract(this._draggable._startPos);

        var limit = this._offsetLimit;
        if (offset.x < limit.min.x) {
            offset.x = this._viscousLimit(offset.x, limit.min.x);
        }
        if (offset.y < limit.min.y) {
            offset.y = this._viscousLimit(offset.y, limit.min.y);
        }
        if (offset.x > limit.max.x) {
            offset.x = this._viscousLimit(offset.x, limit.max.x);
        }
        if (offset.y > limit.max.y) {
            offset.y = this._viscousLimit(offset.y, limit.max.y);
        }

        this._draggable._newPos = this._draggable._startPos.add(offset);
    },

    _onPreDragWrap: function() {
        var worldWidth = this._worldWidth,
            halfWidth = Math.round(worldWidth / 2),
            dx = this._initialWorldOffset,
            x = this._draggable._newPos.x,
            newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
            newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
            newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

        this._draggable._absPos = this._draggable._newPos.clone();
        this._draggable._newPos.x = newX;
    },

    _onDragEnd: function(e) {
        var map = this._map,
            options = map.options,
            noInertia = !options.inertia || e.noInertia || this._times.length < 2;

        map.fire('dragend', e);

        if (noInertia) {
            map.fire('moveend');

        } else {
            this._prunePositions(+new Date());

            var direction = this._lastPos.subtract(this._positions[0]),
                duration = (this._lastTime - this._times[0]) / 1000,
                ease = options.easeLinearity,

                speedVector = direction.multiplyBy(ease / duration),
                speed = speedVector.distanceTo([0, 0]),

                limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
                limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

                decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
                offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

            if (!offset.x && !offset.y) {
                map.fire('moveend');

            } else {
                offset = map._limitOffset(offset, map.options.maxBounds);

                requestAnimFrame(function() {
                    map.panBy(offset, {
                        duration: decelerationDuration,
                        easeLinearity: ease,
                        noMoveStart: true,
                        animate: true
                    });
                });
            }
        }
    }
});