import { writeFileSync } from 'fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import axiosFetch from 'axios-helper'

let queryIdList = {}
let featuresValueList = {}
const updateIdList = (content, type = 'main') => {
    const pattern = /exports=({.+?})(;|)},/gm //=Object\.freeze\(([\w:!,"{}]+)\)

    while ((match = pattern.exec(content)) !== null) {
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++
        }
        let tmpData = Function(`return ${match[1]}`)()
        queryIdList[tmpData.operationName] = tmpData
        //features
        console.log(queryIdList[tmpData.operationName])
        if (queryIdList[tmpData.operationName].metadata) {
            queryIdList[tmpData.operationName].features = Object.fromEntries(queryIdList[tmpData.operationName].metadata.featureSwitches.map((feature) => [feature, featuresValueList[feature]]))
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
    console.log(`tmv3: graphqlQueryIdList (${type}) success`)
}

let match
axiosFetch()
    .get('https://twitter.com/', { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36', cookie: 'guest_id=v1:0' } })
    .then(async (response) => {
        if (response.data) {
            //get main link
            const mainLink = /(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data)[0]
            //api:"8684ec1"
            const apiLink = `https://abs.twimg.com/responsive-web/client-web/api.${/api:(?:\s+|)"([^"]+)"/gm.exec(response.data)[1]}a.js`

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
                const apiId = await axiosFetch().get(apiLink)
                if (apiId.data) {
                    updateIdList(apiId.data, 'api')
                }
                process.exit()
            } catch (e) {
                console.log(e)
                process.exit()
            }
        } else {
            console.log(`tmv3: no such file`)
            process.exit()
        }
    })
    .catch((e) => {
        console.log(e)
        process.exit()
    })
