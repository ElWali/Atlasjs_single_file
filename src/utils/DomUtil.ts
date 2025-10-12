/* eslint-disable @typescript-eslint/no-explicit-any */
import { Point } from '../geo/Point';
import { Browser } from './Browser';
import { on, off, preventDefault } from './DomEvent';
import { splitWords, trim } from './Util';
export const TRANSFORM = testProp([
  'transform',
  'webkitTransform',
  'OTransform',
  'MozTransform',
  'msTransform',
]);
export const TRANSITION = testProp([
  'webkitTransition',
  'transition',
  'OTransition',
  'MozTransition',
  'msTransition',
]);
export const TRANSITION_END =
  TRANSITION === 'webkitTransition' || TRANSITION === 'OTransition'
    ? TRANSITION + 'End'
    : 'transitionend';
export function get(id: string | HTMLElement): HTMLElement {
  return typeof id === 'string' ? document.getElementById(id) : id;
}
export function getStyle(el: HTMLElement, style: string): string {
  let value = el.style[style as any] || (el.currentStyle && el.currentStyle[style as any]);
  if ((!value || value === 'auto') && document.defaultView) {
    const css = document.defaultView.getComputedStyle(el, null);
    value = css ? css[style as any] : null;
  }
  return value === 'auto' ? null : value;
}
export function create(
  tagName: string,
  className?: string,
  container?: HTMLElement,
): HTMLElement {
  const el = document.createElement(tagName);
  el.className = className || '';
  if (container) {
    container.appendChild(el);
  }
  return el;
}
export function remove(el: HTMLElement): void {
  const parent = el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
}
export function empty(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
export function toFront(el: HTMLElement): void {
  const parent = el.parentNode;
  if (parent && parent.lastChild !== el) {
    parent.appendChild(el);
  }
}
export function toBack(el: HTMLElement): void {
  const parent = el.parentNode;
  if (parent && parent.firstChild !== el) {
    parent.insertBefore(el, parent.firstChild);
  }
}
export function hasClass(el: HTMLElement, name: string): boolean {
  if (el.classList !== undefined) {
    return el.classList.contains(name);
  }
  const className = getClass(el);
  return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
}
export function addClass(el: HTMLElement, name: string): void {
  if (el.classList !== undefined) {
    const classes = splitWords(name);
    for (let i = 0, len = classes.length; i < len; i++) {
      el.classList.add(classes[i]);
    }
  } else if (!hasClass(el, name)) {
    const className = getClass(el);
    setClass(el, (className ? className + ' ' : '') + name);
  }
}
export function removeClass(el: HTMLElement, name: string): void {
  if (el.classList !== undefined) {
    el.classList.remove(name);
  } else {
    setClass(el, trim((' ' + getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
  }
}
export function setClass(el: any, name: string): void {
  if (el.className.baseVal === undefined) {
    el.className = name;
  } else {
    el.className.baseVal = name;
  }
}
export function getClass(el: any): string {
  if (el.correspondingElement) {
    el = el.correspondingElement;
  }
  return el.className.baseVal === undefined ? el.className : el.className.baseVal;
}
export function setOpacity(el: HTMLElement, value: number): void {
  if ('opacity' in el.style) {
    el.style.opacity = value as any;
  } else if ('filter' in el.style) {
    _setOpacityIE(el, value);
  }
}
function _setOpacityIE(el: HTMLElement, value: number): void {
  let filter = false;
  const filterName = 'DXImageTransform.Microsoft.Alpha';
  try {
    filter = (el as any).filters.item(filterName);
  } catch (e) {
    if (value === 1) {
      return;
    }
  }
  value = Math.round(value * 100);
  if (filter) {
    (filter as any).Enabled = value !== 100;
    (filter as any).Opacity = value;
  } else {
    el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
  }
}
export function testProp(props: string[]): string | false {
  const style = document.documentElement.style;
  for (let i = 0; i < props.length; i++) {
    if (props[i] in style) {
      return props[i];
    }
  }
  return false;
}
export function setTransform(el: HTMLElement, offset: Point, scale?: number): void {
  const pos = offset || new Point(0, 0);
  el.style[TRANSFORM as any] =
    (Browser.ie3d
      ? 'translate(' + pos.x + 'px,' + pos.y + 'px)'
      : 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
    (scale ? ' scale(' + scale + ')' : '');
}
export function setPosition(el: any, point: Point): void {
  el._atlas_pos = point;
  if (Browser.any3d) {
    setTransform(el, point);
  } else {
    el.style.left = point.x + 'px';
    el.style.top = point.y + 'px';
  }
}
export function getPosition(el: any): Point {
  return el._atlas_pos || new Point(0, 0);
}
export let disableTextSelection: () => void;
export let enableTextSelection: () => void;
let _userSelect: string;
if ('onselectstart' in document) {
  disableTextSelection = function () {
    on(window, 'selectstart', preventDefault);
  };
  enableTextSelection = function () {
    off(window, 'selectstart', preventDefault);
  };
} else {
  const userSelectProperty = testProp([
    'userSelect',
    'WebkitUserSelect',
    'OUserSelect',
    'MozUserSelect',
    'msUserSelect',
  ]);
  disableTextSelection = function () {
    if (userSelectProperty) {
      const style = document.documentElement.style;
      _userSelect = style[userSelectProperty as any];
      style[userSelectProperty as any] = 'none';
    }
  };
  enableTextSelection = function () {
    if (userSelectProperty) {
      document.documentElement.style[userSelectProperty as any] = _userSelect;
      _userSelect = undefined;
    }
  };
}
export function disableImageDrag(): void {
  on(window, 'dragstart', preventDefault);
}
export function enableImageDrag(): void {
  off(window, 'dragstart', preventDefault);
}
let _outlineElement: HTMLElement, _outlineStyle: string;
export function preventOutline(element: HTMLElement): void {
  while (element.tabIndex === -1) {
    element = element.parentNode as HTMLElement;
  }
  if (!element.style) {
    return;
  }
  restoreOutline();
  _outlineElement = element;
  _outlineStyle = element.style.outlineStyle;
  element.style.outlineStyle = 'none';
  on(window, 'keydown', restoreOutline);
}
export function restoreOutline(): void {
  if (!_outlineElement) {
    return;
  }
  _outlineElement.style.outlineStyle = _outlineStyle;
  _outlineElement = undefined;
  _outlineStyle = undefined;
  off(window, 'keydown', restoreOutline);
}
export function getSizedParentNode(element: HTMLElement): HTMLElement {
  do {
    element = element.parentNode as HTMLElement;
  } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
  return element;
}
export function getScale(element: HTMLElement): {
  x: number;
  y: number;
  boundingClientRect: DOMRect;
} {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.width / element.offsetWidth || 1,
    y: rect.height / element.offsetHeight || 1,
    boundingClientRect: rect,
  };
}
export function isExternalTarget(el: any, e: { relatedTarget: any; }): boolean {
  let related = e.relatedTarget;
  if (!related) {
    return true;
  }
  try {
    while (related && (related !== el)) {
      related = related.parentNode;
    }
  } catch (err) {
    return false;
  }
  return (related !== el);
}