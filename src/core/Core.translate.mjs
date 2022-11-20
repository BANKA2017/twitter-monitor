import axios from "axios"
import HttpsProxyAgent from "https-proxy-agent"
import { PROXY_CONFIG, TRANSLATE_TARGET } from "../assets/setting.mjs"


let axoisConfig = {
    proxy: false,
    headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    }
}

if (PROXY_CONFIG) {
    axoisConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
}

const axiosFetch = axios.create(axoisConfig)

//TODO other source

const GoogleTranslate = async (text = '', target = TRANSLATE_TARGET) => {
    if(text === '') {
        return ''
    }
    const query = new URLSearchParams({"client": "webapp", "sl": "auto", "tl": target, "hl": target, "dt": "t", "clearbtn": 1, "otf": 1, "pc": 1, "ssel": 0, "tsel": 0, "kc": 2, "tk": "", "q": text})
    return await new Promise((resolve, reject) => {
        axiosFetch.get('https://translate.google.com/translate_a/single?' + query, {
            headers: {
                referer: 'https://translate.google.com/',
                authority: 'translate.google.com'
            }
        }).then(response => {
            if (response.data && Array.isArray(response.data[0])) {
                resolve(response.data[0].filter(translate => translate).map(translate => translate[0]).join(''))
            }
            reject(response.data)
        }).catch(e => {
            reject(e)
        })
    })
}

export {GoogleTranslate}