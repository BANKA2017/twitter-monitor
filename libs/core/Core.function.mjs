import { getBearerToken, postOpenAccount, postOpenAccountInit } from './Core.android.mjs'
import { getToken, postFlowTask, getJsInstData, getViewer } from './Core.fetch.mjs'
//import * as twitter_text from 'twitter-text'

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
        total_errors_count: 0
    }
    #now
    constructor() {
        this.#now = new Date()
        this.tw_server_info.time = Math.floor(this.#now / 1000)
        this.tw_server_info.microtime = this.#now / 1000
    }
    get value() {
        return this.tw_server_info
    }
    getValue(key = '') {
        if (this.tw_server_info[key]) {
            return this.tw_server_info[key]
        }
        return 0
    }
    updateValue(key = '', value = 1) {
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
    open_account = {}
    type = 'browser'
    constructor(type = 'browser') {
        this.type = type
        this.open_account = {}
    }
    async openAccountInit(openAccount = null) {
        Log(false, 'log', `[${new Date()}]: #GuestToken Update open account`)
        if (openAccount && openAccount?.authorization && openAccount?.oauth_token && openAccount.oauth_token_secret) {
            this.open_account = openAccount
            await this.updateGuestToken(this.open_account.authorization, true)
        } else {
            try {
                //TODO error
                this.open_account.authorization = getBearerToken() //((token) => token.data?.token_type + ' ' + token.data?.access_token)(await getBearerToken())
                await this.updateGuestToken(this.open_account.authorization)
                if (this.type === 'android') {
                    const onboardingResponse = (await postOpenAccountInit({ guest_token: this.#guest_token, authorization: this.open_account.authorization })).data
                    let flowToken = onboardingResponse.flow_token
                    const OpenAccount = (await postOpenAccount({ guest_token: this.#guest_token, authorization: this.open_account.authorization, flow_token: flowToken })).data
                    this.open_account.oauth_token = OpenAccount.subtasks[0].open_account.oauth_token
                    this.open_account.oauth_token_secret = OpenAccount.subtasks[0].open_account.oauth_token_secret
                    this.open_account.user = OpenAccount.subtasks[0].open_account.user
                    this.#guest_token.open_account = this.open_account
                    ConsoleLo(false, 'log', `[${new Date()}]: #GuestToken Successful get account @${this.open_account.user.screen_name}`)
                }
            } catch (e) {
                Log(false, 'error', e)
            }
        }
        return this
    }
    async updateGuestToken(authorizationMode = 0, rateLimitOnly = false) {
        // init authorizationMode not string
        if (['android', 'android_bearer'].includes(this.type) && typeof authorizationMode !== 'string') {
            await this.openAccountInit()
            return this
        }
        const now = Date.now()
        if (
            (!this.#guest_token.nextActiveTime || (this.#guest_token.nextActiveTime && this.#guest_token.nextActiveTime < now)) &&
            (Object.keys(this.#guest_token).length === 0 || Object.values(this.#guest_token.rate_limit).some((value) => value <= 0) || this.#guest_token.expire < now || now - this.heartBeat > 1700000)
        ) {
            Log(false, 'log', `[${new Date()}]: #GuestToken Update guest token #${authorizationMode}`)
            do {
                this.#guest_token = await getToken(authorizationMode, [1, 4].includes(authorizationMode) ? 'web' : 'api', rateLimitOnly)
                this.errorCount--
                if (!this.#guest_token.success) {
                    Log(false, 'error', `[${new Date()}]: #GuestToken Unable to get guest token, remain ${this.errorCount}`)
                }
            } while (!this.#guest_token.success && this.errorCount > 0)
            if (!this.#guest_token.success && this.errorCount <= 0) {
                //force stop 31 minutes
                this.#guest_token.nextActiveTime = now + 1860000
                Log(false, 'error', `[${new Date()}]: #GuestToken Force delay, next active date is -->${this.#guest_token.nextActiveTime}<--`)
            } else {
                this.heartBeat = now
                this.errorCount = 10
            }
        }
        if (this.type === 'android') {
            this.#guest_token.open_account = this.open_account
        }
        //Log(false, 'log', {...this.#guest_token.rate_limit, ...{expire: this.#guest_token.expire}})
        return this
    }
    updateRateLimit(key = '', value = 1) {
        if (this.#guest_token.rate_limit[key] !== undefined) {
            this.#guest_token.rate_limit[key] -= value
            this.heartBeat = Date.now()
        }
        return this
    }
    getRateLimit(key = '') {
        if (this.#guest_token.rate_limit[key] !== undefined) {
            return this.#guest_token.rate_limit[key]
        }
        return 0
    }
    preCheck(key = '', value = 1) {
        if (this.#guest_token.rate_limit[key] !== undefined && this.#guest_token.rate_limit[key] - value > 0) {
            return true
        }
        return false
    }
    get token() {
        return this.#guest_token
    }
}

//TODO guest token rate limit
export class Login {
    cookie = {}
    flow_token = ''
    subtask_id = ''
    guest_token = {}
    constructor(guest_token, cookie = {}, flow_token = '') {
        this.guest_token = guest_token
        this.cookie = { ...Object.fromEntries((this.guest_token?.token?.cookies || []).map((x) => x.split('='))), ...cookie }
        if (flow_token) {
            this.flow_token = flow_token
        }
    }
    get pureCookie() {
        return { auth_token: this.cookie.auth_token, ct0: this.cookie.ct0 }
    }
    getItem(itemName = 'cookie') {
        if (itemName in this) {
            return this[itemName]
        } else {
            return undefined
        }
    }
    updateItems(flowData = {}) {
        //Log(false, 'log', flowData)
        if (flowData.flow_data?.flow_token) {
            this.flow_token = flowData.flow_data.flow_token
        }
        if (Object.keys(flowData.flow_data?.cookie || {}).length > 0) {
            this.cookie = { ...this.cookie, ...flowData.flow_data.cookie }
        }
        if (flowData.flow_data?.subtask_id) {
            this.subtask_id = flowData.flow_data.subtask_id
        }
        return this
    }
    // set att
    async Init() {
        const tmpLoginData = await postFlowTask({ flow_name: 'login', guest_token: this.guest_token, cookie: this.cookie })
        this.updateItems(tmpLoginData)
        return tmpLoginData
    }
    // set _twitter_sess
    async LoginJsInstrumentationSubtask() {
        const jsInstrumentation = await getJsInstData({ cookie: this.cookie })
        this.updateItems(jsInstrumentation)
        const loginTasks = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                js_instrumentation: {
                    link: 'next_link',
                    response: JSON.stringify(jsInstrumentation.js_instrumentation)
                },
                subtask_id: 'LoginJsInstrumentationSubtask'
            }
        })
        this.updateItems(loginTasks)
        return loginTasks
    }
    // Screen name only, because [Discoverability by phone number/email restriction bypass](https://hackerone.com/reports/1439026)

    async LoginEnterUserIdentifierSSO(account = '') {
        const postId = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                settings_list: {
                    link: 'next_link',
                    setting_responses: [
                        {
                            key: 'user_identifier',
                            response_data: {
                                text_data: {
                                    result: account
                                }
                            }
                        }
                    ]
                },
                subtask_id: 'LoginEnterUserIdentifierSSO'
            }
        })
        this.updateItems(postId)
        return postId
    }
    async LoginEnterAlternateIdentifierSubtask(screen_name = '') {
        const postScreenName = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                enter_text: {
                    link: 'next_link',
                    text: screen_name
                },
                subtask_id: 'LoginEnterAlternateIdentifierSubtask'
            }
        })
        this.updateItems(postScreenName)
        return postScreenName
    }
    async LoginEnterPassword(password) {
        const postPassword = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                enter_password: {
                    link: 'next_link',
                    password
                },
                subtask_id: 'LoginEnterPassword'
            }
        })
        this.updateItems(postPassword)
        return postPassword
    }
    async AccountDuplicationCheck() {
        const loginCheck = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                check_logged_in_account: {
                    link: 'AccountDuplicationCheck_false'
                },
                subtask_id: 'AccountDuplicationCheck'
            }
        })
        //get auth_token
        this.updateItems(loginCheck)
        return loginCheck
    }
    async LoginTwoFactorAuthChallenge(_2fa) {
        const post2FA = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                enter_text: {
                    link: 'next_link',
                    text: _2fa
                },
                subtask_id: 'LoginTwoFactorAuthChallenge'
            }
        })
        //get auth_token
        this.updateItems(post2FA)
        return post2FA
    }
    //select 2fa type '0' -> totp, '1' -> security key, '2' -> backup
    async LoginTwoFactorAuthChooseMethod(type = '0') {
        const choose2FA = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: { att: this.cookie.att, _twitter_sess: this.cookie.att._twitter_sess },
            flow_token: this.flow_token,
            sub_task: {
                choice_selection: {
                    link: 'next_link',
                    selected_choices: [String(type)]
                },
                subtask_id: 'LoginTwoFactorAuthChooseMethod'
            }
        })
        //get auth_token
        this.updateItems(choose2FA)
        return choose2FA
    }
    // for those accounts without 2fa, and send single-use code to email
    // email's title is:
    // We noticed an attempt to log in to your account @<YOUR_SCREEN_NAME> that seems suspicious. Was this you?
    async LoginAcid(acid) {
        const postAcid = await postFlowTask({
            guest_token: false, //this.guest_token,
            cookie: this.cookie,
            flow_token: this.flow_token,
            sub_task: {
                enter_text: {
                    text: acid,
                    link: 'next_link'
                },
                subtask_id: 'LoginAcid'
            }
        })
        //get auth_token
        this.updateItems(postAcid)
        return postAcid
    }
    async Viewer() {
        //get ct0
        const tmpViewer = await getViewer({ cookie: this.cookie, guest_token: this.guest_token })
        this.cookie = { ...this.cookie, ...Object.fromEntries(tmpViewer.headers['set-cookie'].map((x) => x.split(';')[0].split('='))) }
        return { data: tmpViewer.data, cookie: this.cookie }
    }
}

//https://stackoverflow.com/questions/14249506
const Sleep = (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const PathInfo = (path) => {
    let tmpPathInfo = {
        dirname: '',
        basename: '',
        filename: '',
        pathtype: 0,
        extension: '',
        size: 'normal',
        firstpath: ''
    }
    const noProtocol = !/^[\w]+:\/\//g.test(path)
    const parsePath = new URL((noProtocol ? 'http://' : '') + path)

    let tmpBase = parsePath.pathname.split('/')
    parsePath.base = tmpBase.pop()
    parsePath.dir = (noProtocol ? '' : parsePath.protocol + '//') + (parsePath.username && parsePath.password ? [parsePath.username, parsePath.password].join(':') + '@' : '') + parsePath.host + tmpBase.join('/') + '/'
    const tmpBaseParse = parsePath.base.split('.')
    parsePath.ext = tmpBaseParse.length > 1 ? tmpBaseParse.pop() : ''
    parsePath.name = tmpBaseParse.join('.')

    tmpPathInfo.dirname = parsePath.dir
    if (parsePath.ext === '') {
        try {
            tmpPathInfo.pathtype = 1
            tmpPathInfo.extension = parsePath.searchParams.get('format') ?? 'jpg'
            tmpPathInfo.size = parsePath.searchParams.get('name') ?? 'normal'
            tmpPathInfo.filename = parsePath.base
        } catch (e) {}
    } else if (parsePath.ext.includes(':')) {
        ;[tmpPathInfo.extension, tmpPathInfo.size] = parsePath.ext.split(':')
        parsePath.base = parsePath.base.replaceAll(`:${tmpPathInfo.size}`, '')
        tmpPathInfo.pathtype = 2
        tmpPathInfo.filename = parsePath.name
    } else {
        if (/^(?:http(?:s|):\/\/|)[^\/]+\.pscp\.tv\//g.test(tmpPathInfo.dirname)) {
            tmpPathInfo.pathtype = 3
        }
        tmpPathInfo.filename = parsePath.name
        tmpPathInfo.extension = parsePath.ext
    }
    tmpPathInfo.basename = parsePath.base
    tmpPathInfo.firstpath = parsePath.host
    return tmpPathInfo
}

const GetEntitiesFromText = (text = '', type = 'description') => {
    let pattern = /<a href="([^"]+)"(?: id="[^"]"+|)(?: target="_blank"|)[^>]+>([^<]+)<\/a>|(?:\s|\p{P}|\p{S}|^)(#|\$)((?:[^\s\p{P}\p{S}]|_)+)|(?:\s|\p{P}|\p{S}|^)@([\w]+)/gmu

    text = text.replaceAll(/(?:|\n)(?:<br>|<br \/>)(?:|\n)/gm, '\n')
    const originText = text.replaceAll(/<a[^>]+>([^<]+)<\/a>/gm, '$1')
    let match
    const tmpList = []
    let lastEnd = 0
    while ((match = pattern.exec(text)) !== null) {
        // 这对于避免零宽度匹配的无限循环是必要的
        if (match.index === pattern.lastIndex) {
            pattern.lastIndex++
        }
        //hashtag
        if (match[2] === undefined && match[4] !== undefined) {
            const prefix = match[3]
            const hashtagText = match[4]
            //Log(false, 'log', [originText.slice(lastEnd).split(`#${hashtagText}`), originText.slice(lastEnd).split(`#${hashtagText}`).length])
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(`${prefix}${hashtagText}`)[0]].length + lastEnd
            lastEnd = beforeLength + [...match[4]].length + 1
            tmpList.push({
                expanded_url: '',
                indices_end: lastEnd,
                indices_start: beforeLength,
                text: hashtagText,
                type: prefix === '#' ? 'hashtag' : 'symbol'
            })
        } else if (match[2] === undefined && match[5] !== undefined) {
            const userMention = match[5]
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(`@${userMention}`)[0]].length + lastEnd
            lastEnd = beforeLength + [...match[5]].length + 1
            tmpList.push({ expanded_url: '', indices_end: lastEnd, indices_start: beforeLength, text: `@${userMention}`, type: 'user_mention' })
        } else {
            const beforeLength = [...[...originText].slice(lastEnd).join('').split(match[2])[0]].length + lastEnd // + (type === 'description' ? 0 : 1)
            lastEnd = beforeLength + [...match[2]].length
            let type = match[1].replaceAll('//http', 'http').startsWith('https://twitter.com/') && match[2].startsWith('@') ? 'user_mention' : match[2].startsWith('#') ? 'hashtag' : match[2].startsWith('$') ? 'symbol' : 'url'
            tmpList.push({
                expanded_url: match[1].replaceAll('//http', 'http'),
                indices_end: lastEnd,
                indices_start: beforeLength,
                text: ['hashtag', 'symbol'].includes(type) ? match[2].slice(1) : match[2],
                type
            })
        }
    }

    return { originText, entities: tmpList }
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

const Log = (color = false, type = 'log', ...content) => {
    // TODO chalk color/handle
    let isLog = false
    if (globalThis.mute === false || globalThis.mute === undefined || globalThis.mute === null) {
        isLog = true
    } else if (Array.isArray(globalThis.mute)) {
        isLog = !globalThis.mute.includes(type)
    }
    if (isLog) {
        console[type](...content)
    }
}

export { Sleep, PathInfo, GetEntitiesFromText, VerifyQueryString, Log }
