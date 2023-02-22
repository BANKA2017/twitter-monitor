import axios from "axios"
import HttpsProxyAgent from "https-proxy-agent"
import {existsSync} from 'node:fs'

let axiosConfig = {
    timeout: 30000,//TODO check timeout
    proxy: false,
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    }
}

//get PROXY_CONFIG
if (existsSync("../../assets/setting.mjs")) {
    const {PROXY_CONFIG} = await import("../../assets/setting.mjs")
    if (PROXY_CONFIG) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
    }
}


const axiosFetch = axios.create(axiosConfig)

export default axiosFetch