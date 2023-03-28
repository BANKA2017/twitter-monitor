import { encode } from "blurhash"
import sharp from 'sharp'
import axiosFetch from "axios-helper"

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
        axiosFetch().get(path, {
            responseType: 'arraybuffer'
        }).then(response => {
            resolve(encodeImageToBlurhash(response.data))
        }).catch(() => reject("deleted"))
    })
}

export {GetBlurHash}