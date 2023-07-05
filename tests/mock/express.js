/*
  Mock express.js Node.js 18.x required
  Twitter Monitor v3 test
  @BANKA2017 && NEST.MOE
*/

import { GuestToken } from '../../libs/core/Core.function.mjs'

class MockExpress {
    query = {}
    params = []
    body = ''
    type = ''
    guest_token2 = null
    url = ''
    env = {}

    statusCode = 200
    headers = new Headers()
    redirect = undefined

    globalResponseCtx = {}

    constructor() {
        this.guest_token2 = new GuestToken('android')
    }

    updateGuestToken() {
        this.guest_token2.updateGuestToken(this.guest_token2.open_account.authorization)
    }
    init(url = '', params = [], body = '', type = '') {
        this.statusCode = 200
        this.headers = new Headers()
        this.redirect = undefined
        this.globalResponseCtx = {}

        this.body = body
        this.type = type
        this.params = params
        //parse url
        const parseURL = new URL(url)
        this.url = parseURL.href
        this.query = Object.fromEntries(parseURL.searchParams.entries())
    }
    setEnv(k, v) {
        this.env[k] = v
    }

    get req() {
        return {
            query: this.query,
            params: this.params,
            body: this.body,
            postBody: this.body,
            guest_token2: this.guest_token2.token,
            url: this.url,
            type: this.type,
            env: this.env
        }
    }

    set = (k, v) => this.setHeader(k, v)
    append = (k, v) => this.headers.append(k, v)
    setHeader = (k, v) => this.headers.set(k, v)
    status = (v) => {
        this.statusCode = v
        return {
            send: this.send,
            end: this.end,
            json: this.json,
            redirect: this.redirectPath
        }
    }

    send = (ctx) => this.responseCtx(ctx)
    end = () => this.responseCtx(null)
    redirectPath = (n, path) => {
        this.statusCode = n
        this.redirect = path
        return this.responseCtx(null)
    }
    json = (obj) => this.responseCtx(obj)
    responseCtx = (body) => {
        //console.log(body)
        this.globalResponseCtx = {
            body,
            status: this.statusCode,
            headers: this.headers,
            redirect: this.redirect
        }
        return this.globalResponseCtx
    }

    get res() {
        return {
            set: this.set,
            append: this.append,
            setHeader: this.setHeader,
            status: this.status,

            send: this.send,
            end: this.end,
            redirect: this.redirectPath,
            json: this.json
        }
    }
}

// req
// express.js req.query, req.params, req.body, // cfworkers req.url, req.postBody, env.guest_token2, req.type
// res
// res.set(1, 2), res.append(1, 2), res.json(1, ?2), res.status(number).json(<-), res.send(string),
//                                                                     .end()
// res.setHeader(1, 2), res.redirect(number, string path),

export default MockExpress
