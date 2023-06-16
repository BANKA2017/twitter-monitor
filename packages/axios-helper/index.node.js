import axios from 'axios'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'
import { Agent as httpsAgent } from 'https'
import { Agent as httpAgent } from 'http'
import { DEFAULT_CIPHERS } from 'tls'

const axiosFetch = (config) => {
    const HTTPS_PROXY = process.env.https_proxy || process.env.HTTPS_PROXY || ''
    const HTTP_PROXY = process.env.http_proxy || process.env.HTTP_PROXY || ''

    let axiosConfig = {
        timeout: 30000, //TODO check timeout
        proxy: false,
        headers: {
            //authorization: TW_AUTHORIZATION,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
        }
    }

    //https://httptoolkit.com/blog/tls-fingerprinting-node-js/
    const defaultCiphers = DEFAULT_CIPHERS.split(':')
    const shuffledCiphers = [
        defaultCiphers[0],
        // Swap the 2nd & 3rd ciphers:
        defaultCiphers[2],
        defaultCiphers[1],
        ...defaultCiphers.slice(3)
    ].join(':')

    if (HTTPS_PROXY) {
        axiosConfig.httpsAgent = new HttpsProxyAgent({ proxy: HTTPS_PROXY, ciphers: shuffledCiphers })
    } else {
        axiosConfig.httpsAgent = new httpsAgent({ ciphers: shuffledCiphers })
    }
    if (HTTP_PROXY) {
        axiosConfig.httpAgent = new HttpProxyAgent({ proxy: HTTP_PROXY, ciphers: shuffledCiphers })
    } else {
        axiosConfig.httpAgent = new httpAgent({ ciphers: shuffledCiphers })
    }

    if (config?.headers) {
        const tmpHeaders = config.headers
        delete config.headers
        axiosConfig = { ...config, ...axiosConfig }
        axiosConfig.headers = { ...tmpHeaders, ...axiosConfig.headers }
    } else {
        axiosConfig = { ...config, ...axiosConfig }
    }
    return axios.create(axiosConfig)
}

export default axiosFetch
