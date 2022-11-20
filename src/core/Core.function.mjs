import {parse} from 'node:path'
import { getToken } from './Core.fetch.mjs'

export class setGlobalServerInfo {
    tw_server_info = {
        time: 0,
        microtime: 0,
        total_users: 0,
        total_tweets: 0,
        total_req_tweets: 0,
        total_throw_tweets: 0,
        total_req_times: 0,
        total_media_count: 0,
        //avgtimecost: 0,
        total_time_cost: 0,
        //avgreqtimecost: 0,
        //savetimecost: 0,
        total_errors_count: 0,
    }
    #now
    constructor() {
        this.#now = new Date()
        this.tw_server_info.time = Math.floor(this.#now / 1000)
        this.tw_server_info.microtime = this.#now / 1000
    }
    get value () {
        return this.tw_server_info
    }
    getValue (key = '') {
        if (this.tw_server_info[key]) {
            return this.tw_server_info[key]
        }
        return 0
    }
    updateValue (key = '', value = 1) {
        if (this.tw_server_info !== undefined) {
            this.tw_server_info[key] += value
        }
        return this
    }

}

export class GuestToken {
    #guest_token = {}
    heartBeat
    errorCount = 10
    constructor () {}
    async updateGuestToken (authorizationMode = 0) {
        const now = Number(new Date())
        if ((!this.#guest_token.nextActiveTime || (this.#guest_token.nextActiveTime && this.#guest_token.nextActiveTime < now) ) && (Object.keys(this.#guest_token).length === 0 || Object.values(this.#guest_token.rate_limit).some(value => value <= 0) || this.#guest_token.expire < now || (now - this.heartBeat) > 1700000)) {
            console.log(`[${new Date()}]: #GuestToken Update guest token`)
            do {
                this.#guest_token = await getToken(authorizationMode)
                this.errorCount--
                if (!this.#guest_token.success) {
                    console.error(`[${new Date()}]: #GuestToken Unable to get guest token, remain ${this.errorCount}`)
                }
            } while (!this.#guest_token.success && this.errorCount > 0)
            if (!this.#guest_token.success && this.errorCount <= 0) {
                //force stop 31 minutes
                this.#guest_token.nextActiveTime = now + 1860000
                console.error(`[${new Date()}]: #GuestToken Force delay, next active date is -->${this.#guest_token.nextActiveTime}<--`)
            } else {
                this.heartBeat = now
                this.errorCount = 10
            }
        }
        //console.log({...this.#guest_token.rate_limit, ...{expire: this.#guest_token.expire}})
        return this
    }
    updateRateLimit (key = '', value = 1) {
        if (this.#guest_token.rate_limit[key] !== undefined) {
            this.#guest_token.rate_limit[key] -= value
            this.heartBeat = Number(new Date())
        }
        return this
    }
    getRateLimit (key = '') {
        if (this.#guest_token.rate_limit[key] !== undefined) {
            return this.#guest_token.rate_limit[key]
        }
        return 0
    }
    preCheck (key = '', value = 1) {
        if (this.#guest_token.rate_limit[key] !== undefined && (this.#guest_token.rate_limit[key] - value) > 0) {
            return true
        }
        return false
    }
    get token() {
        return this.#guest_token
    }
}

//https://stackoverflow.com/questions/14249506
const Sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const PathInfo = (path) => {
    let tmpPathInfo = {
        dirname: '',
        basename: '',
        filename: '',
        pathtype: 0,
        extension: '',
        size: 'normal'
    }
    const parsePath = parse(path)
    tmpPathInfo.dirname = parsePath.dir
    if (parsePath.ext === '') {
        try {
            const tmpPathInfoParse = new URL('http://' + parsePath.name)
            tmpPathInfo.pathtype = 1
            tmpPathInfo.extension = tmpPathInfoParse.searchParams.get('format') ?? 'jpg'
            tmpPathInfo.size = tmpPathInfoParse.searchParams.get('name') ?? 'normal'
            tmpPathInfo.filename = tmpPathInfoParse.host
        } catch (e) {}
    } else if (parsePath.ext.includes(':')) {
        [tmpPathInfo.extension, tmpPathInfo.size] = parsePath.ext.slice(1).split(':')
        tmpPathInfo.pathtype = 2
        tmpPathInfo.filename = parsePath.name
    } else {
        if (/^[^\/]+\.pscp\.tv\//.test(tmpPathInfo.dirname)) {
            tmpPathInfo.pathtype = 3
        }
        tmpPathInfo.filename = parsePath.name
        tmpPathInfo.extension = parsePath.ext.slice(1)
    }
    tmpPathInfo.basename = tmpPathInfo.filename + '.' + tmpPathInfo.extension
    return tmpPathInfo
}

const GetEntitiesFromText = (text = '', type = 'description') => {
    let pattern = /<a href="([^"]+)" target="_blank">([^<]+)<\/a>|(?:\s|\p{P}|^)#((?:[^\s\p{P}]|_)+)|(?:\s|\p{P}|^)@([\w]+)/gmu
    if (type !== 'description') {
        pattern = /<a href="([^"]+)"[^>]+>([^<]+)<\/a>|(?:\s|\p{P}|^)#((?:[^\s\p{P}]|_)+)|(?:\s|\p{P}|^)@([\w]+)/gmu
    }

    text = text.replaceAll(/<br>|<br \/>/gm, '')
    const originText = text.replaceAll(/<a[^>]+>([^<]+)<\/a>/gm, "$1")
    let match;
    const tmpList = []
    let lastEnd = 0
    while ((match = pattern.exec(text)) !== null) {
        // 这对于避免零宽度匹配的无限循环是必要的
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++;
        }
        //hashtag
        if (match[2] === undefined && match[3] !== undefined) {
            const hashtagText = match[3]
            //console.log([originText.slice(lastEnd).split(`#${hashtagText}`), originText.slice(lastEnd).split(`#${hashtagText}`).length])
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(`#${hashtagText}`)[0]].length + lastEnd
            lastEnd = beforeLength + [...match[3]].length + 1
            tmpList.push({ expanded_url: "", indices_end: lastEnd, indices_start: beforeLength, text: hashtagText, type: "hashtag" })
        } else if (match[2] === undefined && match[4] !== undefined) {
            const userMention = match[4]
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(`@${userMention}`)[0]].length + lastEnd
            lastEnd = beforeLength + [...match[4]].length + 1
            tmpList.push({ expanded_url: "", indices_end: lastEnd, indices_start: beforeLength, text: `@${userMention}`, type: "user_mention" })
        } else {
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(match[2])[0]].length + lastEnd// + (type === 'description' ? 0 : 1)
            lastEnd = beforeLength + [...match[2]].length
            tmpList.push({ expanded_url: match[1].replaceAll("//http", "http"), indices_end: lastEnd, indices_start: beforeLength, text: match[2], type: "url"})
        }
    }
    
    return {originText, entities: tmpList}

}

const VerifyQueryString = (value, defaultValue) => {
    if (!value || typeof value === 'object' || ((typeof defaultValue === 'number' || typeof defaultValue === 'bigint') && isNaN(value))) {
        return defaultValue
    }

    if (typeof defaultValue === 'number' && typeof value === 'number' && (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER)) {
        return defaultValue
    }
    return value
}

export {Sleep, PathInfo, GetEntitiesFromText, VerifyQueryString}