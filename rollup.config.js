import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import bundleSize from 'rollup-plugin-bundle-size'
import terser from "@rollup/plugin-terser"
import cleanup from 'rollup-plugin-cleanup'
import json from '@rollup/plugin-json'

const buildConfig = (input, outputPath, format = 'esm', minified = false, browser = false, external = [], useBundleSize = true,) => {
    const name = outputPath.split('/').pop().replace(/\.(?:m|c|)js/gm, '')
    let output = {
        format: format,
        sourcemap: true,
        exports: format === 'esm' ? "named" : "default"
    }
    if (name) {
        output.name = name
        output.file = outputPath
    } else {
        output.dir = outputPath
    }
    const tmpConfig = []
    tmpConfig.push({
        input,
        output,
        external,
        plugins: [
            commonjs(),
            json(),
            resolve({browser, preferBuiltins: true}),
            ...(useBundleSize ? [bundleSize()] : []),
            cleanup()//will couse a loooooong time build
        ]
    })
    if (minified) {
        let minifiedOutput = {...output}
        if (minifiedOutput.file) {
            minifiedOutput.file = minifiedOutput.file.replace('.js', '.min.js')
        }
        tmpConfig.push({
            input,
            output: minifiedOutput,
            external,
            plugins: [
                commonjs(),
                json(),
                resolve({browser, preferBuiltins: true}),
                terser(),
                ...(useBundleSize ? [bundleSize()] : []),
                cleanup()
            ]
        })
    }
    return tmpConfig
}
// not yet supported all scripts that required package `Sequelize`
// include full version of backend, tweet crawler, analytics, trends
export default [
    //...buildConfig('apps/backend/app.mjs', 'dist/backend/', 'esm', false, false, [], false), // full backend build success but run failed
    ...buildConfig('apps/backend/app_online.mjs', 'dist/backend/app_online.js', 'esm', false, false), // online mode
    ...buildConfig('apps/archiver/archive.mjs', 'dist/archiver/archive_node.js', 'esm', false, false),
    ...buildConfig('apps/archiver/archive_lite.mjs', 'dist/archiver/archive_browser.js', 'esm', true, true),
]
