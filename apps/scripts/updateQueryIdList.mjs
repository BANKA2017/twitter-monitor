import axios from "axios"
import { PROXY_CONFIG } from '../../src/assets/setting.mjs'
import HttpsProxyAgent from "https-proxy-agent"
import { writeFileSync } from "fs"
import { basePath } from "../../src/share/Constant.mjs"


let axoisConfig = {
    proxy: false,
}

if (PROXY_CONFIG) {
    axoisConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
}

const axiosFetch = axios.create(axoisConfig)
let match
axiosFetch.get("https://twitter.com/").then(response => {
    if (response.data) {
        axiosFetch.get((/(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data))[0]).then(response => {
            if (response.data) {
                let queryIdList = {}
                const pattern = /exports=({.+?})(;|)},/gm//=Object\.freeze\(([\w:!,"{}]+)\)
                let tmpFeature = ''
                while ((match = pattern.exec(response.data)) !== null) {
                    if (match.index === pattern.lastIndex) {
                        pattern.lastIndex++;
                    }
                    let tmpData = Function(`return ${match[1]}`)()
                    queryIdList[tmpData.operationName] = tmpData
                    if (!tmpFeature && tmpData.metadata.featureSwitches.length) {
                        tmpFeature = tmpData.metadata.featureSwitches[0]
                    }
                }
                writeFileSync(basePath + '/assets/graphqlQueryIdList.json', JSON.stringify(queryIdList, null, 4))
                console.log(`tmv3: graphqlQueryIdList success`)

                const patternForFeatures = /=Object\.freeze\(([\w:!,"{}]+)\)/gm
                while ((match = patternForFeatures.exec(response.data)) !== null) {
                    if (match.index === patternForFeatures.lastIndex) {
                        patternForFeatures.lastIndex++;
                    }
                    if (RegExp(tmpFeature).test(match[1])) {
                        writeFileSync(basePath + '/assets/featuresValueList.json', JSON.stringify(Function(`return ${match[1]}`)(), null, 4))
                        console.log(`tmv3: featuresValueList success`)
                        break
                    }
                }
            }
            process.exit()
        }).catch(e => {
            console.log(e)
            process.exit()
        })
    } else {
        console.log(`tmv3: no such file`)
        process.exit()
    }
}).catch(e => {
    console.log(e)
    process.exit()
})
