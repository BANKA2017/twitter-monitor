import axios from "axios"
import { PROXY_CONFIG } from '../../assets/setting.mjs'
import HttpsProxyAgent from "https-proxy-agent"
import { writeFileSync } from "fs"
import { basePath } from "../../src/share/Constant.mjs"


let axiosConfig = {
    timeout: 30000,//TODO check timeout
    proxy: false,
}

if (PROXY_CONFIG) {
    axiosConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
}

const axiosFetch = axios.create(axiosConfig)
let match
axiosFetch.get("https://twitter.com/", {headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'}}).then(response => {
    if (response.data) {
        //get main link
        //const mainLink = (/(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:[^\/]+|)\/main\.[^.]+\.js)/gm.exec(response.data))[0]
        //api:"8684ec1"
        const apiLink = `https://abs.twimg.com/responsive-web/client-web/api.${/api:(?:\s+|)"([^"]+)"/gm.exec(response.data)[1]}a.js`

        const __INITIAL_STATE__ = Function(`return ${/window\.__INITIAL_STATE__=([^;]+);/gm.exec(response.data)[1]}`)()
        const tmpConfigKV = {...__INITIAL_STATE__.featureSwitch.defaultConfig, ...__INITIAL_STATE__.featureSwitch.user.config}
        writeFileSync(basePath + '/../assets/featuresValueList.json', JSON.stringify(Object.fromEntries(Object.keys(tmpConfigKV).map(key => [key, tmpConfigKV[key].value])), null, 4))
        axiosFetch.get(apiLink).then(response => {
            if (response.data) {
                let queryIdList = {}
                const pattern = /exports=({.+?})(;|)},/gm//=Object\.freeze\(([\w:!,"{}]+)\)
                
                while ((match = pattern.exec(response.data)) !== null) {
                    if (match.index === pattern.lastIndex) {
                        pattern.lastIndex++;
                    }
                    let tmpData = Function(`return ${match[1]}`)()
                    queryIdList[tmpData.operationName] = tmpData
                }
                writeFileSync(basePath + '/../assets/graphqlQueryIdList.json', JSON.stringify(queryIdList, null, 4))
                console.log(`tmv3: graphqlQueryIdList success`)
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