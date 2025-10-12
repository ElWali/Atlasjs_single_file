/* eslint-disable @typescript-eslint/no-explicit-any */

// Provides a cross-browser way to listen to DOM events.
export function on(
  el: HTMLElement | Window,
  types: string,
  fn: (event: any) => void,
  context?: any,
): any {
  const handler = context ? (e: any) => fn.call(context, e) : fn;
  const typeArray = types.split(' ');

  for (let i = 0; i < typeArray.length; i++) {
    el.addEventListener(typeArray[i], handler);
  }

  return {
    destroy: () => {
      for (let i = 0; i < typeArray.length; i++) {
        el.removeEventListener(typeArray[i], handler);
      }
    },
  };
}

// Provides a cross-browser way to stop listening to DOM events.
export function off(
  el: HTMLElement | Window,
  types: string,
  fn: (event: any) => void,
  context?: any,
): void {
    const handler = context ? (e: any) => fn.call(context, e) : fn;
    const typeArray = types.split(' ');
    for (let i = 0; i < typeArray.length; i++) {
        el.removeEventListener(typeArray[i], handler);
    }
}

// Prevents the default action of an event.
export function preventDefault(e: Event): void {
    if (e.preventDefault) {
        e.preventDefault();
    } else {
        e.returnValue = false;
    }
}

// Stops the propagation of an event.
export function stopPropagation(e: Event): void {
    if (e.stopPropagation) {
        e.stopPropagation();
    } else {
        e.cancelBubble = true;
    }
}

// Gets the mouse position from a mouse event.
export function getMousePosition(e: MouseEvent, container?: HTMLElement): any {
    if (e.clientX === undefined) {
        return { x: e.pageX, y: e.pageY };
    }
    if (!container) {
        return { x: e.clientX, y: e.clientY };
    }
    const rect = container.getBoundingClientRect();
    return {
        x: e.clientX - rect.left - container.clientLeft,
        y: e.clientY - rect.top - container.clientTop,
    };
}