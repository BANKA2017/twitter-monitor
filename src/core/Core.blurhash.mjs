import { encode } from "blurhash"
import axios from "axios"
import { PROXY_CONFIG } from '../../assets/setting.mjs'
import HttpsProxyAgent from "https-proxy-agent"
import sharp from 'sharp'
let axiosConfig = {
    timeout: 30000,//TODO check timeout
    proxy: false,
}

if (PROXY_CONFIG) {
    axiosConfig.httpsAgent = new HttpsProxyAgent(PROXY_CONFIG)
}

const axiosFetch = axios.create(axiosConfig)

//https://github.com/woltapp/blurhash/issues/43#issuecomment-597674435
const encodeImageToBlurhash = path => {
    return new Promise((resolve, reject) => {
      sharp(path)
        .raw()
        .ensureAlpha()
        .resize(16, 16, { fit: "inside" })
        .toBuffer((err, buffer, { width, height }) => {
            if (err) {return reject(err)}
            resolve(encode(new Uint8ClampedArray(buffer), width, height, 4, 4))
        })
    });
}

const GetBlurHash = (path = '') => {
    return new Promise((resolve, reject) => {
        axiosFetch.get(path, {
            responseType: 'arraybuffer'
        }).then(response => {
            resolve(encodeImageToBlurhash(response.data))
        }).catch(() => reject("deleted"))
    })
}

export {GetBlurHash}