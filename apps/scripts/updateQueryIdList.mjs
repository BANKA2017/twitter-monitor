import { writeFileSync } from 'fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import axiosFetch from 'axios-helper'
import { PregMatchAll } from '../../libs/share/MockFuntions.mjs'
import { Log } from '../../libs/core/Core.function.mjs'

let link = 'https://twitter.com/explore'

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
const updateIdList = (content, type = 'main') => {
    const pattern = /exports=({.+?})(;|)},|params:({.+?})};/gm //=Object\.freeze\(([\w:!,"{}]+)\)

    while ((match = pattern.exec(content)) !== null) {
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++
        }
        //Log(false, 'log', match)
        let tmpData = {}
        try {
            tmpData = Function(`return ${match[1] || match[3]}`)()
        } catch (e) {
            //Log(false, 'log', e)
        }
        let tmpName = tmpData?.operationName || tmpData?.name || false
        if (!tmpName) {
            continue
        }
        if (tmpData.name && !tmpData.operationName) {
            tmpData.operationName = tmpData.name
            delete tmpData.name
        }
        if (tmpData.id && !tmpData.queryId) {
            tmpData.queryId = tmpData.id
            delete tmpData.id
        }
        if (tmpData.metadata?.features && !tmpData.metadata?.featureSwitches) {
            tmpData.metadata.featureSwitches = JSON.parse(JSON.stringify(tmpData.metadata?.features))
            delete tmpData.metadata?.features
            //Log(false, 'log', tmpData)
        }
        queryIdList[tmpName] = tmpData
        //features
        //Log(false, 'log', queryIdList[tmpName])
        if (queryIdList[tmpName]?.metadata?.featureSwitches) {
            queryIdList[tmpName].features = Object.fromEntries((queryIdList[tmpName].metadata.featureSwitches || {}).map((feature) => [feature, featuresValueList[feature]]))
        }
    }
    writeFileSync(
        basePath + '/../libs/assets/graphql/graphqlQueryIdList.js',
        Object.keys(queryIdList)
            .map((key) => `const _${key} = ${JSON.stringify(queryIdList[key])}`)
            .join('\n') +
            `\nconst graphqlQueryIdList = { ${Object.keys(queryIdList)
                .map((key) => `"${key}": _${key}`)
                .join(',')} }\nexport default graphqlQueryIdList\nexport {${Object.keys(queryIdList).map((key) => `_${key}`)}}\n`
    )
    Log(false, 'log', `tmv3: graphqlQueryIdList (${type}) success`)
}

let match
axiosFetch()
    .get(link, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            cookie: 'guest_id=v1:0'
        }
    })
    .then(async (response) => {
        if (response.data) {
            // NOT a good regexp, we will fix it later.
            const jsFileValues = ((regexpData) =>
                Object.fromEntries(
                    regexpData[0]
                        .map((x, index) => {
                            if (['themeColor', 'type', 'value'].includes(regexpData[1][index])) {
                                return null
                            }
                            return [regexpData[1][index], regexpData[2][index]]
                        })
                        .filter((x) => x)
                ))(PregMatchAll(/(?:"|)([\w\/~\-\.]+)(?:"|):"([\w]{7})"(?:,|})/gm, response.data))
            //get main link
            const mainLink = /(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data)[0]
            //api:"8684ec1"

            const __INITIAL_STATE__ = Function(`return ${/window\.__INITIAL_STATE__=([^;]+);/gm.exec(response.data)[1]}`)()
            const tmpConfigKV = { ...__INITIAL_STATE__.featureSwitch.defaultConfig, ...__INITIAL_STATE__.featureSwitch.user.config }
            featuresValueList = Object.fromEntries(Object.keys(tmpConfigKV).map((key) => [key, tmpConfigKV[key].value]))
            writeFileSync(
                basePath + '/../libs/assets/graphql/featuresValueList.js',
                Object.keys(featuresValueList)
                    .map((key) => `const _${key} = ${JSON.stringify(featuresValueList[key])}`)
                    .join('\n') +
                    `\nconst featuresValueList = { ${Object.keys(featuresValueList)
                        .map((key) => `"${key}": _${key}`)
                        .join(',')} }\nexport default featuresValueList\nexport {${Object.keys(featuresValueList).map((key) => `_${key}`)}}\n`
            )
            try {
                const mainId = await axiosFetch().get(mainLink)
                if (mainId.data) {
                    updateIdList(mainId.data, 'main')
                }
                // full version
                for (const tmpValue of Object.entries(jsFileValues)) {
                    const data = (await axiosFetch().get(`https://abs.twimg.com/responsive-web/client-web/${tmpValue[0]}.${tmpValue[1]}a.js`)).data //readFileSync(`./js/${file}`).toString()// await axiosFetch().get(`https://abs.twimg.com/responsive-web/client-web/bundle.Communities.${jsFileValues['bundle.Communities']}a.js`)
                    if (data) {
                        updateIdList(data, tmpValue[0])
                    } else {
                        Log(false, 'log', `tmv3: graphqlQueryIdList ${tmpValue[0]} error`)
                    }
                }

                // for twitter monitor only
                //const apiId = await axiosFetch().get(`https://abs.twimg.com/responsive-web/client-web/api.${jsFileValues['api']}a.js`)
                //if (apiId.data) {
                //    updateIdList(apiId.data, 'api')
                //}
                //const communityId = await axiosFetch().get(`https://abs.twimg.com/responsive-web/client-web/bundle.Communities.${jsFileValues['bundle.Communities']}a.js`)
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
