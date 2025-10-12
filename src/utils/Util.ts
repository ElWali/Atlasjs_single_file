/* eslint-disable @typescript-eslint/no-explicit-any */
export function extend(dest: any, ...sources: any[]): any {
  for (const src of sources) {
    for (const i in src) {
      dest[i] = src[i];
    }
  }
  return dest;
}

export const createObject = Object.create || (function () {
    function F() {
        // empty
    }
    return function (proto: any) {
        F.prototype = proto;
        return new (F as any)();
    };
})();

export function bind(fn: any, obj: any): () => any {
    const slice = Array.prototype.slice;
    if (fn.bind) {
        return fn.bind.apply(fn, slice.call(arguments, 1));
    }
    const args = slice.call(arguments, 2);
    return function () {
        return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
    };
}

let lastId = 0;
export function stamp(obj: any): number {
    obj._atlas_id = obj._atlas_id || ++lastId;
    return obj._atlas_id;
}

export function throttle(fn: () => void, time: number, context: any): () => void {
    let lock: any, args: any, wrapperFn: any, later: any;
    later = function () {
        lock = false;
        if (args) {
            wrapperFn.apply(context, args);
            args = false;
        }
    };
    wrapperFn = function () {
        if (lock) {
            args = arguments;
        } else {
            fn.apply(context, arguments);
            setTimeout(later, time);
            lock = true;
        }
    };
    return wrapperFn;
}

export function wrapNum(x: number, range: number[], includeMax: boolean): number {
    const max = range[1];
    const min = range[0];
    const d = max - min;
    return x === max && includeMax ? x : ((((x - min) % d) + d) % d) + min;
}

export function formatNum(num: number, digits?: number): number {
    const pow = Math.pow(10, digits || 5);
    return Math.round(num * pow) / pow;
}

export function trim(str: string): string {
    return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

export function splitWords(str: string): string[] {
    return trim(str).split(/\s+/);
}

export function setOptions(obj: any, options: any): any {
    if (!Object.prototype.hasOwnProperty.call(obj, 'options')) {
        obj.options = obj.options ? createObject(obj.options) : {};
    }
    for (const i in options) {
        obj.options[i] = options[i];
    }
    return obj.options;
}

export function getUrl(url: string, data?: any): string {
    return url + '?' + Object.keys(data).map(key => key + '=' + data[key]).join('&');
}

export const isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
};

export function indexOf(array: any[], el: any): number {
    for (let i = 0; i < array.length; i++) {
        if (array[i] === el) {
            return i;
        }
    }
    return -1;
}

export const requestAnimFrame = (function () {
    function getPrefixed(name: string) {
        return (window as any)['webkit' + name] || (window as any)['moz' + name] || (window as any)['ms' + name];
    }
    const raf =
        window.requestAnimationFrame ||
        getPrefixed('RequestAnimationFrame') ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    const caf =
        window.cancelAnimationFrame ||
        getPrefixed('CancelAnimationFrame') ||
        getPrefixed('CancelRequestAnimationFrame') ||
        function (id) {
            window.clearTimeout(id);
        };
    return function (fn: any, context: any, immediate?: boolean): any {
        if (immediate && raf === setTimeout) {
            fn.call(context);
        } else {
            return raf.call(window, bind(fn, context));
        }
    };
})();

export const cancelAnimFrame = function (id: number): void {
    if (id) {
        (window as any).cancelAnimationFrame(id);
    }
};