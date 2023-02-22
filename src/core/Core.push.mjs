import axios from "axios"
import {ALERT_TOKEN, ALERT_PUSH_TO} from '../../assets/setting.mjs'
import { PROXY_CONFIG } from '../../assets/setting.mjs'
import HttpsProxyAgent from "https-proxy-agent"
let axiosConfig = {
    timeout: 30000,//TODO check timeout
    proxy: false,
}

if (PROXY_CONFIG) {
    axiosConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
}

const axiosFetch = axios.create(axiosConfig)

const TGPush = async (text = '') => {
    if (ALERT_TOKEN.length) {
        text = [...text]
        const partCount = Math.ceil(text.length / 3000)
        let tmpPartIndex = 0
        for (; tmpPartIndex < partCount; tmpPartIndex++) {
            await axiosFetch.post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
                chat_id: ALERT_PUSH_TO,
                text: text.slice(tmpPartIndex * 3000, tmpPartIndex * 3000 + 3000).join('')
            }).then(response => {
                if (response.data?.ok) {
                    console.log(`TGPush: Successful to push log #part${tmpPartIndex} to chat ->${ALERT_PUSH_TO}<-`)
                } else {
                    console.log(`TGPush: Error #part${response.data?.description}`)
                }
            }).catch(e => {
                console.log(e)
            })
        }
    }
}

export {TGPush}