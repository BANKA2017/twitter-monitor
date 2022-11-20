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

axiosFetch.get("https://twitter.com/").then(response => {
    if (response.data) {
        axiosFetch.get((/(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data))[0]).then(response => {
            if (response.data) {
                let queryIdList = {}
                const pattern = /{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)"/gm
                let match
                while ((match = pattern.exec(response.data)) !== null) {
                    if (match.index === pattern.lastIndex) {
                        pattern.lastIndex++;
                    }
                    queryIdList[match[2]] = {
                        queryId: match[1],
                        operationName: match[2],
                        operationType: match[3],
                    }
                }
                writeFileSync(basePath + '/assets/graphqlQueryIdList.json', JSON.stringify(queryIdList))
                console.log(`tmv3: graphqlQueryIdList success`)
            }
        }).catch(e => {
            console.log(e)
        })
    } else {
        console.log(`tmv3: no such file`)
    }
}).catch(e => {
    console.log(e)
})