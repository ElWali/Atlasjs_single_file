/* eslint-disable @typescript-eslint/no-explicit-any */
export class Evented {
  _events: any = {};

  on(types: string | any, fn?: any, context?: any): this {
    if (typeof types === 'object') {
      for (const type in types) {
        this._on(type, types[type], fn);
      }
    } else {
      types = types.split(' ');
      for (let i = 0; i < types.length; i++) {
        this._on(types[i], fn, context);
      }
    }
    return this;
  }

  off(types: string | any, fn?: any, context?: any): this {
    if (types) {
      if (typeof types === 'object') {
        for (const type in types) {
          this._off(type, types[type], fn);
        }
      } else {
        types = types.split(' ');
        for (let i = 0; i < types.length; i++) {
          this._off(types[i], fn, context);
        }
      }
    } else {
      delete this._events;
    }
    return this;
  }

  _on(type: string, fn: any, context: any): void {
    const anEvent = {
      fn: fn,
      ctx: context,
    };
    if (this._events[type] === undefined) {
      this._events[type] = [];
    }
    this._events[type].push(anEvent);
  }

  _off(type: string, fn: any, context: any): void {
    let listeners, i, len;
    if (this._events[type] === undefined) {
      return;
    }
    if (fn) {
      listeners = this._events[type];
      for (i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i].ctx === context && listeners[i].fn === fn) {
          listeners[i].fn = function (): void {
            return;
          };
          this._events[type].splice(i, 1);
          return;
        }
      }
    }
  }

  fire(type: string, data?: any): this {
    if (!this.listens(type)) {
      return this;
    }
    const event = { ...data, type: type, target: this };
    const listeners = [...this._events[type]];

    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener.fn.call(listener.ctx || this, event);
    }
    return this;
  }

  listens(type: string): boolean {
    return this._events && this._events[type] && this._events[type].length > 0;
  }
}