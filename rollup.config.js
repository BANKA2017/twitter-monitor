import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import bundleSize from 'rollup-plugin-bundle-size'
import terser from "@rollup/plugin-terser"
import cleanup from 'rollup-plugin-cleanup'

const buildConfig = (input, output, format = 'esm', minified = false, browser = false, external = []) => {
    const name = input.split('/').pop().replace(/\.(?:m|c|)js/gm, '')
    const tmpConfig = []
    tmpConfig.push({
        input,
        output: {
            file: output,
            format: format,
            sourcemap: true,
            name,
            exports: format === 'esm' ? "named" : "default"
        },
        external,
        plugins: [
            commonjs(),
            resolve({browser}),
            bundleSize(),
            cleanup()//will couse a loooooong time build
        ]
    })
    if (minified) {
        tmpConfig.push({
            input,
            output: {
                file: output.replace('.js', '.min.js'),
                format: format,
                sourcemap: true,
                name,
                exports: format === 'esm' ? "named" : "default"
            },
            external,
            plugins: [
                commonjs(),
                resolve({browser}),
                terser(),
                bundleSize(),
                cleanup()
            ]
        })
    }
    return tmpConfig
}

export default [
    ...buildConfig('apps/archiver/archive_lite.mjs', 'dist/archiver/archive_lite.js', 'esm', true, true),
]
