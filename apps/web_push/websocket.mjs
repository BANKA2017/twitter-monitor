//-> node.js only
import { WebSocket } from 'ws'
import crypto from 'crypto'
//<--
import { fireFoxUserAgent } from './twitter.mjs'
import { base64_to_base64url, base64_to_buffer, base64url_to_base64, buffer_to_base64 } from './utils.mjs'
import callback from './callback.mjs'

class WS {
    _ws = null
    uaid = ''
    remote_settings__monitor_changes = ''
    endpoint = ''
    channelID = ''
    isNode = false
    isClosed = true
    keepStop = false
    latestPing = Date.now()

    constructor(uaid = '', remote_settings__monitor_changes = '', endpoint = '', channelID = '') {
        this.uaid = uaid
        this.remote_settings__monitor_changes = remote_settings__monitor_changes
        this.endpoint = endpoint
        this.channelID = channelID
        this.selfCheck()
    }
    initWebsocket() {
        this.keepStop = false
        this._ws = new WebSocket('wss://push.services.mozilla.com/', {
            protocol: 'push-notification',
            headers: {
                'User-Agent': fireFoxUserAgent
            }
        })

        this.isNode = this._ws.on !== undefined
        this.initWebsocketEvents()
    }
    // send
    _send(msg) {
        try {
            this._ws.send(msg)
            console.log('↑|', new Date(), msg)
        } catch (e) {
            console.error('X|', e)
        }
    }
    async register(VAPID, channelID = '') {
        if (!VAPID) {
            console.log('VAPID is required!')
            return
        }
        if (channelID) {
            this.channelID = channelID
        } else if (!this.channelID) {
            this.channelID = crypto.randomUUID()
        }
        this._send(JSON.stringify({ channelID: this.channelID, messageType: 'register', key: VAPID }))
    }
    async unregister(channelID = '') {
        if (channelID === this.channelID) {
            this.channelID = ''
        } else {
            channelID = this.channelID
        }
        this._send(JSON.stringify({ messageType: 'unregister', channelID, status: 200 }))
    }
    async ack(channelID, version) {
        this._send(JSON.stringify({ messageType: 'ack', updates: [{ channelID, version, code: 100 }] }))
    }
    async close() {
        this._ws.close()
        this._ws = null
        this.keepStop = true
    }
    // events
    async onOpen() {
        this.isClosed = false
        this.latestPing = Date.now()
        console.log('~|', new Date(), 'connected to the webpush server')
        this._send(JSON.stringify({ messageType: 'hello', broadcasts: { 'remote-settings/monitor_changes': this.remote_settings__monitor_changes || undefined }, use_webpush: true, uaid: this.uaid }))
    }
    async onClosed() {
        this.isClosed = true
        console.log('!|', new Date(), 'reconnecting...')
        if (!this.keepStop) {
            this.initWebsocket()
        }
    }
    async onPing() {
        this.latestPing = Date.now()
        this._ws.pong()
        console.log('~|', new Date(), 'ping!')
    }
    async onError(error) {
        console.error('X|', new Date(), 'error', error)
    }
    async onMessage(event) {
        console.log('↓|', new Date(), event.data)
        const message = JSON.parse(event.data)

        if (message.messageType === 'hello') {
            this.uaid = message.uaid
            if (message?.broadcasts?.['remote-settings/monitor_changes']) {
                this.remote_settings__monitor_changes = message.broadcasts['remote-settings/monitor_changes']
            }
        } else if (message.messageType === 'register') {
            //{"messageType":"register","channelID":"<string>","status":200,"pushEndpoint":"<string>"}
            this.endpoint = message.pushEndpoint
            this.channelID = message.channelID
        } else if (message.messageType === 'notification') {
            //{"messageType":"ack","updates":[{"channelID":"<string>","version":"<string>","code":100}]}
            this.ack(message.channelID, message.version)

            // parse data
            await decryptData(message)
        } else if (message.messageType === 'broadcast' && message?.broadcasts?.['remote-settings/monitor_changes']) {
            //{"messageType":"broadcast","broadcasts":{"remote-settings/monitor_changes":"<string>"}}
            this.remote_settings__monitor_changes = message.broadcasts['remote-settings/monitor_changes']
        }
    }
    initWebsocketEvents() {
        this._ws.addEventListener('error', this.onError.bind(this))
        this._ws.addEventListener('open', this.onOpen.bind(this))
        this._ws.addEventListener('message', this.onMessage.bind(this))
        this._ws.addEventListener('close', this.onClosed.bind(this))
        // node.js only
        if (this.isNode) {
            this._ws.on('ping', this.onPing.bind(this))
        }
    }
    selfCheck() {
        setInterval(() => {
            if (this.isNode) {
                console.log('-|', new Date(), 'auto check', Date.now() - this.latestPing + 'ms')
                if (this.isClosed || Date.now() - this.latestPing > 1000 * 60 * 5.5) {
                    console.log('!|', new Date(), 'reconnecting...')
                    this.initWebsocket()
                }
            }
        }, 1000 * 60)
    }
}

const decryptData = async (parsedData) => {
    const crypto_key = Object.fromEntries(parsedData.headers.crypto_key.split(';').map((v) => v.split('=')))

    const dh = base64_to_buffer(base64url_to_base64(crypto_key.dh))
    const salt = base64_to_buffer(base64url_to_base64(parsedData.headers.encryption.split('=')[1]))
    const { CEK, NONCE } = await globalThis._decrypt.get_cek_and_nonce(dh, salt)
    const { data: decryptedData } = await globalThis._decrypt.decrypt(NONCE, CEK, base64_to_buffer(base64url_to_base64(parsedData.data)), 0, 'aesgcm')

    let text = new TextDecoder().decode(decryptedData)
    let dataObject = JSON.parse(text)

    console.log('\n↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓ New Notification ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓\n')
    console.log(dataObject)
    // tweet, self_thread
    // what is self_thread?
    let sft = Number(((BigInt(dataObject.tag.replace(/[^\d]+\-/gm, '')) >> BigInt(22)) & BigInt(2199023255551)) + BigInt(1288834974657))
    console.log('~|', `post ${sft} >>${Number(dataObject.timestamp) - sft}ms>> autopush >>${Date.now() - Number(dataObject.timestamp)}ms>> client`)
    console.log('\n↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ End Notification ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑\n')

    await callback(dataObject)
}

export default WS
