import {
    falseFn
} from './Dom.js';

export const ie = 'ActiveXObject' in window;
export const ielt9 = ie && !document.addEventListener;
export const edge = 'msLaunchUri' in navigator && !('documentMode' in document);
export const webkit = userAgentContains('webkit');
export const android = userAgentContains('android');
export const android23 = userAgentContains('android 2') || userAgentContains('android 3');
const webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10);
export const androidStock = android && userAgentContains('Google') && webkitVer < 537 && !('AudioNode' in window);
export const opera = !!window.opera;
export const chrome = !edge && userAgentContains('chrome');
export const gecko = userAgentContains('gecko') && !webkit && !opera && !ie;
export const safari = !chrome && userAgentContains('safari');
export const phantom = userAgentContains('phantom');
export const opera12 = 'OTransition' in document.documentElement.style;
export const win = navigator.platform.indexOf('Win') === 0;
export const ie3d = ie && ('transition' in document.documentElement.style);
export const webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23;
export const gecko3d = 'MozPerspective' in document.documentElement.style;
export const any3d = !window.ATLAS_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;
export const mobile = typeof orientation !== 'undefined' || userAgentContains('mobile');
export const mobileWebkit = mobile && webkit;
export const mobileWebkit3d = mobile && webkit3d;
export const msPointer = !window.PointerEvent && window.MSPointerEvent;
export const pointer = !!(window.PointerEvent || msPointer);
export const touchNative = 'ontouchstart' in window || !!window.TouchEvent;
export const touch = !window.ATLAS_NO_TOUCH && (touchNative || pointer);
export const mobileOpera = mobile && opera;
export const mobileGecko = mobile && gecko;
export const retina = (window.devicePixelRatio || (window.screen.deviceXDPI / window.screen.logicalXDPI)) > 1;
export const passiveEvents = (function() {
    var supportsPassiveOption = false;
    try {
        var opts = Object.defineProperty({}, 'passive', {
            get: function() {
                supportsPassiveOption = true;
            }
        });
        window.addEventListener('testPassiveEventSupport', falseFn, opts);
        window.removeEventListener('testPassiveEventSupport', falseFn, opts);
    } catch (e) {
        // Do nothing
    }
    return supportsPassiveOption;
}());
export const canvas = (function() {
    return !!document.createElement('canvas').getContext;
}());
export const svg = !!(document.createElementNS && svgCreate('svg').createSVGRect);
export const inlineSvg = !!svg && (function() {
    var div = document.createElement('div');
    div.innerHTML = '<svg/>';
    return (div.firstChild && div.firstChild.namespaceURI) === 'http://www.w3.org/2000/svg';
})();
export const vml = !svg && (function() {
    try {
        var div = document.createElement('div');
        div.innerHTML = '<v:shape adj="1"/>';

        var shape = div.firstChild;
        shape.style.behavior = 'url(#default#VML)';

        return shape && (typeof shape.adj === 'object');

    } catch (e) {
        return false;
    }
}());
export const mac = navigator.platform.indexOf('Mac') === 0;
export const linux = navigator.platform.indexOf('Linux') === 0;

function userAgentContains(str) {
    return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
}

export function svgCreate(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}