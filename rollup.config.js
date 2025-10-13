import terser from '@rollup/plugin-terser';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');


const banner = `/*
 * Atlas.js ${pkg.version}
 * ${new Date().toUTCString()}
 */`;

export default {
    input: 'src/main.js',
    output: [
        {
            file: pkg.main,
            format: 'iife',
            name: 'atlas',
            banner,
            sourcemap: true
        },
        {
            file: pkg.main.replace('.js', '.min.js'),
            format: 'iife',
            name: 'atlas',
            banner,
            plugins: [terser()]
        }
    ]
};