import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

/** @type {import('rollup').RollupOptions} */
export default [
    {
        input: 'src/devtools/devtools.registration.ts',
        output: {
            dir: 'extension',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript()
        ]
    },
    {
        input: 'src/devtools/devtools.element.ts',
        output: {
            dir: 'extension',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript()
        ]
    },
    {
        input: 'src/background/background.ts',
        output: {
            dir: 'extension',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript()
        ]
    },
    {
        input: 'src/content-script/content.ts',
        output: {
            dir: 'extension',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript()
        ]
    },
    {
        input: 'src/content-script/content-page-bridge.ts',
        output: {
            dir: 'extension',
            format: 'esm',
            sourcemap: true
        },
        plugins: [
            nodeResolve(),
            commonjs(),
            typescript()
        ]
    }
];