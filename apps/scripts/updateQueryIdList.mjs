import { writeFileSync } from 'fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import axiosFetch from 'axios-helper'
import { PregMatchAll } from '../../libs/share/MockFuntions.mjs'

let link = 'https://x.com/i/flow/login?mx=2'

const Log = (color = false, type = 'log', ...content) => {
    // TODO chalk color/handle
    let isLog = false
    if (globalThis.mute === false || globalThis.mute === undefined || globalThis.mute === null) {
        isLog = true
    } else if (Array.isArray(globalThis.mute)) {
        isLog = !globalThis.mute.includes(type)
    }
    if (isLog) {
        console[type](...content)
    }
}

if (process.argv[2]) {
    try {
        new URL(process.argv[2])
        link = process.argv[2]
    } catch (e) {
        Log(false, 'log', `tmv3: Invalid link`)
    }
}

let queryIdList = {}
let featuresValueList = {}
let existsList = []

let counter = 0

const _axios = axiosFetch({ keepAlive: true })

const mockWebpackFunc = (anyV) => anyV
mockWebpackFunc.d = (anyV) => anyV

const updateIdList = (content) => {
    const functions = Function(`const that = {__SCRIPTS_LOADED__: {vendor: {}}, webpackChunk_twitter_responsive_web: []}; const self=that;const window=that;const globalThis = that;const importScripts=(...args)=>({});\n\n${content}\n\n;return that.webpackChunk_twitter_responsive_web`)()

    //# importScripts:
    //> node_modules_x-clients_features_dist_dms_sqlite_worker_js
    //> node_modules_x-clients_features_dist_dms_sqlite2_worker_js
    for (let tmpFunction of Object.entries(functions?.[0]?.[1] || [])) {
        if (existsList.includes(tmpFunction[0])) {
            continue
        }
        existsList.push(tmpFunction[0])
        tmpFunction = tmpFunction[1]
        //const pattern = /exports=({.+?})(;|)},|params:({.+?})};/gm //=Object\.freeze\(([\w:!,"{}]+)\)

        let tmpData = null
        if (tmpFunction?.toString().includes('{e.exports={queryId:')) {
            let e = {}
            tmpFunction(e, e, mockWebpackFunc)
            tmpData = e.exports
        } else if (/,params:\{id:"/gm.test(tmpFunction?.toString())) {
            tmpData = Function('return ' + (/,params:([^;]+)};/.exec(tmpFunction?.toString() || '')?.[1] || ''))()
        } else {
            //?
            continue
        }
        //let tmpData = e.exports.params || e.exports //Function(`return ${tmpFunction.toString().slice(14,-1)}`)()
        let tmpName = tmpData?.operationName || tmpData?.name || false
        if (!tmpName) {
            continue
        }
        if (tmpData.name !== undefined && !tmpData.operationName) {
            tmpData.operationName = tmpData.name
            delete tmpData.name
        }
        if (tmpData.id !== undefined && !tmpData.queryId) {
            tmpData.queryId = tmpData.id
            delete tmpData.id
        }
        if (tmpData.metadata?.features !== undefined && !tmpData.metadata?.featureSwitches !== undefined) {
            tmpData.metadata.featureSwitches = JSON.parse(JSON.stringify(tmpData.metadata?.features))
            delete tmpData.metadata?.features
            //Log(false, 'log', tmpData)
        }
        queryIdList[tmpName] = tmpData
        //features
        //Log(false, 'log', queryIdList[tmpName])
        if (queryIdList[tmpName]?.metadata?.featureSwitches) {
            queryIdList[tmpName].features = Object.fromEntries((queryIdList[tmpName].metadata.featureSwitches || {}).map((feature) => [feature, featuresValueList[feature] || false]))
        }
    }

    //js
    writeFileSync(
        basePath + '/../libs/assets/graphql/graphqlQueryIdList.js',
        Object.keys(queryIdList)
            .map((key) => `export const _${key} = ${JSON.stringify(queryIdList[key])}`)
            .join('\n') +
            `\nconst graphqlQueryIdList = { ${Object.keys(queryIdList)
                .map((key) => `"${key}": _${key}`)
                .join(',')} }\nexport default graphqlQueryIdList\n`
    )
    //json
    writeFileSync(basePath + '/../libs/assets/graphql/graphqlQueryIdList.json', JSON.stringify(queryIdList, null, 4))
    return true
}

_axios
    .get(link, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'sec-fetch-mode': 'navigate'
        }
    })
    .then(async (response) => {
        if (response.data) {
            // NOT a good regexp, we will fix it later.
            const jsFileValues = ((regexpData) =>{
                let indexKV = {}
                for (let i=0; i<regexpData[0].length; i++) {
                    if (!indexKV[regexpData[1][i]]) {
                        indexKV[regexpData[1][i]] = [regexpData[2][i]]
                    } else {
                        indexKV[regexpData[1][i]].push(regexpData[2][i])
                    }
                }

                return Object.fromEntries(Object.values(indexKV).filter(kv => kv.length === 2 && !['themeColor', 'type', 'value'].includes(kv[0])))
            })(PregMatchAll(/(\d+):(?:"|)([\w\/~\-\.]+)(?:"|)(?:,|})/gm, response.data))
            //get main link
            const mainLink = /(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data)[0]
            //api:"8684ec1"

            const __INITIAL_STATE__ = Function(`return {${/window\.__INITIAL_STATE__=\{(.+?)\};/gm.exec(response.data)[1]}}`)()
            const tmpConfigKV = { ...__INITIAL_STATE__.featureSwitch.defaultConfig, ...__INITIAL_STATE__.featureSwitch.user.config }
            featuresValueList = Object.fromEntries(Object.keys(tmpConfigKV).map((key) => [key, tmpConfigKV[key].value]))
            //js
            writeFileSync(
                basePath + '/../libs/assets/graphql/featuresValueList.js',
                Object.keys(featuresValueList)
                    .map((key) => `export const _${key} = ${JSON.stringify(featuresValueList[key])}`)
                    .join('\n') +
                    `\nconst featuresValueList = { ${Object.keys(featuresValueList)
                        .map((key) => `"${key}": _${key}`)
                        .join(',')} }\nexport default featuresValueList\n`
            )
            //json
            writeFileSync(basePath + '/../libs/assets/graphql/featuresValueList.json', JSON.stringify(featuresValueList, null, 4))
            try {
                const mainId = await _axios.get(mainLink)
                if (mainId.data) {
                    updateIdList(mainId.data)
                }
                // full version
                const jsFileValuesEntries = Object.entries(jsFileValues)
                Log(false, 'log', `tmv3: graphqlQueryIdList ->[${jsFileValuesEntries.length}]<-`)
                const sliceCount = 30
                for (let x = 0; x < jsFileValuesEntries.length; x += sliceCount) {
                    //filter
                    const jsFilesNameList = jsFileValuesEntries.slice(x, x + sliceCount).filter((item) => !item[0].startsWith('icons/') && !item[0].startsWith('i18n/') && !item[0].startsWith('react-syntax-highlighter'))
                    counter += jsFileValuesEntries.slice(x, x + sliceCount).length - jsFilesNameList.length
                    Log(false, 'log', `tmv3: graphqlQueryIdList break ${sliceCount - jsFilesNameList.length} ->[${counter}/${jsFileValuesEntries.length}]<-`)
                    const allData = await Promise.allSettled(jsFilesNameList.map((tmpValue) => _axios.get(`https://abs.twimg.com/responsive-web/client-web/${tmpValue[0]}.${tmpValue[1]}a.js`)))
                    //readFileSync(`./js/${file}`).toString()// await _axios.get(`https://abs.twimg.com/responsive-web/client-web/bundle.Communities.${jsFileValues['bundle.Communities']}a.js`)

                    for (let allDataIndex in allData) {
                        allDataIndex = Number(allDataIndex)
                        counter++
                        if (allData[allDataIndex].status === 'fulfilled') {
                            let status = updateIdList(allData[allDataIndex].value.data)
                            if (status) {
                                Log(false, 'log', `tmv3: graphqlQueryIdList (${jsFilesNameList[allDataIndex][0]}) ->[${counter}/${jsFileValuesEntries.length}]<- success`)
                            }
                        } else {
                            Log(false, 'log', `tmv3: graphqlQueryIdList ${jsFilesNameList[allDataIndex][0]} ->[${counter}/${jsFileValuesEntries.length}]<- falied`)
                        }
                    }
                }

                // for twitter monitor only
                //const apiId = await _axios.get(`https://abs.twimg.com/responsive-web/client-web/api.${jsFileValues['api']}a.js`)
                //if (apiId.data) {
                //    updateIdList(apiId.data, 'api')
                //}
                //const communityId = await _axios.get(`https://abs.twimg.com/responsive-web/client-web/bundle.Communities.${jsFileValues['bundle.Communities']}a.js`)
                //if (communityId.data) {
                //    updateIdList(communityId.data, 'community')
                //}
                process.exit()
            } catch (e) {
                Log(false, 'log', e)
                process.exit()
            }
        } else {
            Log(false, 'log', `tmv3: no such file`)
            process.exit()
        }
    })
    .catch((e) => {
        Log(false, 'log', e)
        process.exit()
    })
