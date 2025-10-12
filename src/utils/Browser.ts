/* eslint-disable @typescript-eslint/no-explicit-any */
const userAgent = navigator.userAgent.toLowerCase();
const documentMode = (document as any).documentMode;
const opera = window.opera;

const ie = 'ActiveXObject' in window;
const ielt9 = ie && !document.addEventListener;
const ie11 = ie && window.location.hash;
const edge = 'msLaunchUri' in navigator && !('documentMode' in document);
const webkit = userAgent.indexOf('webkit') !== -1;
const android = userAgent.indexOf('android') !== -1;
const android23 = userAgent.search('android [23]') !== -1;
const chrome = userAgent.indexOf('chrome') !== -1;
const safari = !chrome && userAgent.indexOf('safari') !== -1;
const gecko = userAgent.indexOf('gecko') !== -1 && !webkit && !opera && !ie;
const phantom = userAgent.indexOf('phantom') !== -1;
const opera12 = opera && opera.version && parseInt(opera.version(), 10) === 12;
const win = navigator.platform.indexOf('Win') === 0;

const mobile = 'ontouchstart' in window || 'msMaxTouchPoints' in navigator;
const touch = 'ontouchstart' in window || (window.navigator as any).msPointerEnabled;
const pointer = 'pointerEnabled' in window.navigator;
const retina = 'devicePixelRatio' in window && window.devicePixelRatio > 1 || 'matchMedia' in window && window.matchMedia('(min-resolution:144dpi)') && window.matchMedia('(min-resolution:144dpi)').matches;

const any3d = (function () {
    const el = document.createElement('div');
    el.style.transform = 'translate3d(0,0,0)';
    return el.style.transform !== '';
})();

export const Browser = {
    ie: ie,
    ielt9: ielt9,
    ie11: ie11,
    edge: edge,
    webkit: webkit,
    android: android,
    android23: android23,
    chrome: chrome,
    safari: safari,
    gecko: gecko,
    phantom: phantom,
    opera: opera,
    opera12: opera12,
    win: win,
    mobile: mobile,
    touch: touch,
    pointer: pointer,
    retina: retina,
    any3d: any3d,
    mobileWebkit: mobile && webkit,
    mobileOpera: mobile && opera
};