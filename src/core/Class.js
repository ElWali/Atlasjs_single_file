import {
    extend,
    create,
    setOptions,
    isArray
} from './Util.js';

export function Class() {}

Class.extend = function(props) {
    var NewClass = function() {
        setOptions(this);
        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }
        this.callInitHooks();
    };

    var parentProto = NewClass.__super__ = this.prototype;
    var proto = create(parentProto);
    proto.constructor = NewClass;
    NewClass.prototype = proto;

    for (var i in this) {
        if (Object.prototype.hasOwnProperty.call(this, i) && i !== 'prototype' && i !== '__super__') {
            NewClass[i] = this[i];
        }
    }

    if (props.statics) {
        extend(NewClass, props.statics);
    }

    if (props.includes) {
        checkDeprecatedMixinEvents(props.includes);
        extend.apply(null, [proto].concat(props.includes));
    }

    extend(proto, props);
    delete proto.statics;
    delete proto.includes;

    if (proto.options) {
        proto.options = parentProto.options ? create(parentProto.options) : {};
        extend(proto.options, props.options);
    }

    proto._initHooks = [];
    proto.callInitHooks = function() {
        if (this._initHooksCalled) {
            return;
        }

        if (parentProto.callInitHooks) {
            parentProto.callInitHooks.call(this);
        }

        this._initHooksCalled = true;

        for (var i = 0, len = proto._initHooks.length; i < len; i++) {
            proto._initHooks[i].call(this);
        }
    };

    return NewClass;
};

Class.include = function(props) {
    var parentOptions = this.prototype.options;
    extend(this.prototype, props);
    if (props.options) {
        this.prototype.options = parentOptions;
        this.mergeOptions(props.options);
    }
    return this;
};

Class.mergeOptions = function(options) {
    extend(this.prototype.options, options);
    return this;
};

Class.addInitHook = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1);

    var init = typeof fn === 'function' ? fn : function() {
        this[fn].apply(this, args);
    };

    this.prototype._initHooks = this.prototype._initHooks || [];
    this.prototype._initHooks.push(init);
    return this;
};

function checkDeprecatedMixinEvents(includes) {
    if (typeof atlas === 'undefined' || !atlas || !atlas.Mixin) {
        return;
    }

    includes = isArray(includes) ? includes : [includes];

    for (var i = 0; i < includes.length; i++) {
        if (includes[i] === atlas.Mixin.Events) {
            console.warn('Deprecated include of atlas.Mixin.Events: ' +
                'this property will be removed in future releases, ' +
                'please inherit from atlas.Evented instead.', new Error().stack);
        }
    }
}