//-> node.js only
import crypto from 'crypto'
//<--
import { base64_to_base64url, base64_to_buffer, base64url_to_base64, buffer_to_base64, concatBuffer } from './utils.mjs'

class Decrypt {
    keyCurve = {}
    publicKey = null
    privateKey = null
    auth = null
    async init(jwk = {}, auth = '') {
        if (!jwk.d || !(jwk.x && jwk.y)) {
            this.keyCurve = await crypto.subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey', 'deriveBits']
            )
        } else {
            this.keyCurve = Object.fromEntries(
                await Promise.all([
                    [
                        'privateKey',
                        await crypto.subtle.importKey(
                            'jwk',
                            jwk,
                            {
                                name: 'ECDH',
                                namedCurve: jwk.crv
                            },
                            true,
                            jwk.key_ops
                        )
                    ],
                    [
                        'publicKey',
                        await crypto.subtle.importKey(
                            'jwk',
                            ((jwk) => {
                                delete jwk.d
                                return jwk
                            })(JSON.parse(JSON.stringify(jwk))),
                            {
                                name: 'ECDH',
                                namedCurve: jwk.crv
                            },
                            true,
                            []
                        )
                    ]
                ])
            )
        }
        this.publicKey = await crypto.subtle.exportKey('raw', this.keyCurve.publicKey)
        this.privateKey = base64_to_buffer(base64url_to_base64((await crypto.subtle.exportKey('jwk', this.keyCurve.privateKey)).d))

        if (auth) {
            if (typeof auth === 'string') {
                this.auth = base64_to_buffer(base64url_to_base64(auth))
            } else {
                this.auth = auth
            }
        } else {
            this.auth = crypto.getRandomValues(new Uint8Array(16)).buffer
        }
    }

    async exportKey() {
        return {
            jwk: await crypto.subtle.exportKey('jwk', this.keyCurve.privateKey),
            auth: base64_to_base64url(buffer_to_base64(this.auth))
        }
    }

    async ecdh(publicKey, privateKey) {
        const ecdh_secret_CryptoKey = await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: publicKey
            },
            privateKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        )
        const ecdh_secret = await crypto.subtle.exportKey('raw', ecdh_secret_CryptoKey)
        return ecdh_secret
    }
    async hmac_sha_256(key, data) {
        const keyData = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
        return new Uint8Array(await crypto.subtle.sign('HMAC', keyData, data))
    }
    async get_ecdh_secret(dh) {
        const pubDH = await crypto.subtle.importKey(
            'raw',
            dh,
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            []
        )
        return await this.ecdh(pubDH, this.keyCurve.privateKey)
    }
    async get_cek_and_nonce(dh, salt) {
        const context = concatBuffer(new TextEncoder().encode('P-256\0'), new Uint8Array([0, 65]), this.publicKey, new Uint8Array([0, 65]), dh)
        const auth_info = new TextEncoder().encode('Content-Encoding: auth\0')
        const PRK_combine = await this.hmac_sha_256(this.auth, await this.get_ecdh_secret(dh))
        const IKM = await this.hmac_sha_256(PRK_combine, concatBuffer(auth_info, new Uint8Array([1])))
        const PRK = await this.hmac_sha_256(salt, IKM)
        const cek_info = concatBuffer(new TextEncoder().encode('Content-Encoding: aesgcm\0'), context)
        let CEK = (await this.hmac_sha_256(PRK, concatBuffer(cek_info, new Uint8Array([1])))).slice(0, 16)
        const nonce_info = concatBuffer(new TextEncoder().encode('Content-Encoding: nonce\0'), context)
        let NONCE = (await this.hmac_sha_256(PRK, concatBuffer(nonce_info, new Uint8Array([1])))).slice(0, 12)

        return { CEK, NONCE }
    }
    getNonce(nonce, SEQ) {
        if (SEQ > 0) {
            nonce = new Uint8Array(nonce)
            return nonce.map((byte, index) => {
                if (index < 6) {
                    return byte
                } else {
                    return byte ^ ((SEQ / Math.pow(256, 12 - 1 - index)) & 0xff)
                }
            })
        }
        return nonce
    }
    splitData(data, size) {
        const result = []
        for (let i = 0; i < data.byteLength; i += size) {
            result.push(data.slice(i, i + size))
        }
        return result
    }
    async decrypt(nonce, contentEncryptionKey, content, rs = 0, encoding = 'aesgcm') {
        const cek = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', true, ['encrypt', 'decrypt'])
        let bufferChunk = []
        if (rs < 18) {
            bufferChunk.push(content)
        } else {
            bufferChunk.push(...this.splitData(content, rs))
        }
        const decodedChunk = await Promise.all(
            bufferChunk.map(async (chunk, index) => {
                // console.log(chunk, index, nonce, this.getNonce(nonce, index))
                let decodedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.getNonce(nonce, index) }, cek, chunk)
                let paddingLength = 0
                if (encoding === 'aes128gcm') {
                    let i = decodedBuffer.byteLength - 1
                    let tmpDecodedBuffer = new Uint8Array(decodedBuffer)
                    while (tmpDecodedBuffer[i--] === 0) {
                        paddingLength++
                    }
                    decodedBuffer = decodedBuffer.slice(0, decodedBuffer.byteLength - paddingLength - 1)
                } else {
                    paddingLength = new DataView(decodedBuffer.slice(0, 2)).getUint8()
                    decodedBuffer = decodedBuffer.slice(2 + paddingLength)
                }
                //const padding = decodedBuffer.slice(2, 2 + paddingLength)
                return { data: decodedBuffer, padding: { length: paddingLength } }
            })
        )
        return { data: concatBuffer(...decodedChunk.map((chunk) => chunk.data)), padding: { length: decodedChunk[0].padding.length }, chunk: decodedChunk }
    }
}
export default Decrypt
