import {
    Class
} from './Class.js';
import {
    extend,
    splitWords,
    stamp
} from './Util.js';
import {
    falseFn
} from './Dom.js';

export const Events = {
    on: function(types, fn, context) {
        if (typeof types === 'object') {
            for (var type in types) {
                this._on(type, types[type], fn);
            }
        } else {
            types = splitWords(types);
            for (var i = 0, len = types.length; i < len; i++) {
                this._on(types[i], fn, context);
            }
        }
        return this;
    },

    off: function(types, fn, context) {
        if (!arguments.length) {
            delete this._events;
        } else if (typeof types === 'object') {
            for (var type in types) {
                this._off(type, types[type], fn);
            }
        } else {
            types = splitWords(types);
            var removeAll = arguments.length === 1;
            for (var i = 0, len = types.length; i < len; i++) {
                if (removeAll) {
                    this._off(types[i]);
                } else {
                    this._off(types[i], fn, context);
                }
            }
        }
        return this;
    },

    _on: function(type, fn, context, _once) {
        if (typeof fn !== 'function') {
            console.warn('wrong listener type: ' + typeof fn);
            return;
        }

        if (this._listens(type, fn, context) !== false) {
            return;
        }

        if (context === this) {
            context = undefined;
        }

        var newListener = {
            fn: fn,
            ctx: context
        };
        if (_once) {
            newListener.once = true;
        }

        this._events = this._events || {};
        this._events[type] = this._events[type] || [];
        this._events[type].push(newListener);
    },

    _off: function(type, fn, context) {
        var listeners,
            i,
            len;

        if (!this._events) {
            return;
        }

        listeners = this._events[type];

        if (!listeners) {
            return;
        }

        if (arguments.length === 1) {
            if (this._firingCount) {
                for (i = 0, len = listeners.length; i < len; i++) {
                    listeners[i].fn = falseFn;
                }
            }
            delete this._events[type];
            return;
        }

        if (typeof fn !== 'function') {
            console.warn('wrong listener type: ' + typeof fn);
            return;
        }

        var index = this._listens(type, fn, context);
        if (index !== false) {
            var listener = listeners[index];
            if (this._firingCount) {
                listener.fn = falseFn;
                this._events[type] = listeners = listeners.slice();
            }
            listeners.splice(index, 1);
        }
    },

    fire: function(type, data, propagate) {
        if (!this.listens(type, propagate)) {
            return this;
        }

        var event = extend({}, data, {
            type: type,
            target: this,
            sourceTarget: data && data.sourceTarget || this
        });

        if (this._events) {
            var listeners = this._events[type];
            if (listeners) {
                this._firingCount = (this._firingCount + 1) || 1;
                for (var i = 0, len = listeners.length; i < len; i++) {
                    var l = listeners[i];
                    var fn = l.fn;
                    if (l.once) {
                        this.off(type, fn, l.ctx);
                    }
                    fn.call(l.ctx || this, event);
                }
                this._firingCount--;
            }
        }

        if (propagate) {
            this._propagateEvent(event);
        }

        return this;
    },

    listens: function(type, fn, context, propagate) {
        if (typeof type !== 'string') {
            console.warn('"string" type argument expected');
        }
        var _fn = fn;
        if (typeof fn !== 'function') {
            propagate = !!fn;
            _fn = undefined;
            context = undefined;
        }
        var listeners = this._events && this._events[type];
        if (listeners && listeners.length) {
            if (this._listens(type, _fn, context) !== false) {
                return true;
            }
        }

        if (propagate) {
            for (var id in this._eventParents) {
                if (this._eventParents[id].listens(type, fn, context, propagate)) {
                    return true;
                }
            }
        }
        return false;
    },

    _listens: function(type, fn, context) {
        if (!this._events) {
            return false;
        }

        var listeners = this._events[type] || [];
        if (!fn) {
            return !!listeners.length;
        }

        if (context === this) {
            context = undefined;
        }

        for (var i = 0, len = listeners.length; i < len; i++) {
            if (listeners[i].fn === fn && listeners[i].ctx === context) {
                return i;
            }
        }
        return false;
    },

    once: function(types, fn, context) {
        if (typeof types === 'object') {
            for (var type in types) {
                this._on(type, types[type], fn, true);
            }
        } else {
            types = splitWords(types);
            for (var i = 0, len = types.length; i < len; i++) {
                this._on(types[i], fn, context, true);
            }
        }
        return this;
    },

    addEventParent: function(obj) {
        this._eventParents = this._eventParents || {};
        this._eventParents[stamp(obj)] = obj;
        return this;
    },

    removeEventParent: function(obj) {
        if (this._eventParents) {
            delete this._eventParents[stamp(obj)];
        }
        return this;
    },

    _propagateEvent: function(e) {
        for (var id in this._eventParents) {
            this._eventParents[id].fire(e.type, extend({
                layer: e.target,
                propagatedFrom: e.target
            }, e), true);
        }
    }
};

Events.addEventListener = Events.on;
Events.removeEventListener = Events.clearAllEventListeners = Events.off;
Events.addOneTimeEventListener = Events.once;
Events.fireEvent = Events.fire;
Events.hasEventListeners = Events.listens;

export const Evented = Class.extend(Events);