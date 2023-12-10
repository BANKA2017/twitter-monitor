import { Router } from 'itty-router'
import { apiTemplate } from '../../../libs/share/Constant.mjs'
import { PostBodyParser } from '../../cfworkers/share.mjs'
import { Log } from '../../../libs/core/Core.function.mjs'
import { shuffle } from 'lodash-es'

const workersApi = Router()

//favicon
workersApi.all('/favicon.ico', () => new Response(null, { status: 200 }))

//robots.txt
workersApi.all('/robots.txt', () => new Response('User-agent: *\nDisallow: /*', { status: 200 }))

workersApi.post(
    '/upload/account',
    async (req) => {
        await PostBodyParser(req, new Map([]))
    },
    async (req, env) => {
        const key = req.postBody.get('key')
        if (key !== env.SECRET_WORKERS_KEY) {
            return new Response(JSON.stringify(apiTemplate(403, 'Invalid key', {}, 'open_account_list')))
        }
        const config = JSON.parse(req.postBody.get('account'))
        if (!config?.user?.screen_name) {
            return new Response(JSON.stringify(apiTemplate(403, 'Invalid open account', {}, 'open_account_list')))
        }
        await env.kv.put(`tm:open_account:${config.user.screen_name}`, req.postBody.get('account'), { expiration: Math.floor(Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000 })
        return new Response(JSON.stringify(apiTemplate(200, 'OK', config.user, 'open_account_list')))
    }
)
workersApi.get('/data/random', async (req, env) => {
    const key = req.query.key
    if (key !== env.SECRET_WORKERS_KEY) {
        return new Response(JSON.stringify(apiTemplate(403, 'Invalid key', {}, 'open_account_list')))
    }
    const list = (await env.kv.list({ prefix: 'tm:open_account:_LO_', limit: 1000 })).keys.filter((key) => key.expiration)
    let count = Number(req.query.count)
    if (count <= 0 || Number.isNaN(count)) {
        count = 1
    } else if (count > 25) {
        count = 25
    }
    let randomKey = []
    //if (count === 1) {
    //    randomKey = JSON.parse(await env.kv.get(list[Math.floor(list.length * Math.random())].name))
    //} else {
    const shuffledList = shuffle(list)
    for (const tmpListItem of shuffledList.slice(0, count)) {
        randomKey.push(JSON.parse(await env.kv.get(tmpListItem.name)))
    }
    //}
    return new Response(JSON.stringify(apiTemplate(200, 'OK', randomKey, 'open_account_list')))
})

workersApi.get('/data/account', async (req, env) => {
    const key = req.query.key
    if (key !== env.SECRET_WORKERS_KEY) {
        return new Response(JSON.stringify(apiTemplate(403, 'Invalid key', {}, 'open_account_list')))
    }
    const name = req.query.name
    if (!name || typeof name !== 'string') {
        return new Response(JSON.stringify(apiTemplate(403, 'Invalid name', {}, 'open_account_list')))
    }
    const account = await env.kv.get('tm:open_account:' + name)
    if (!account) {
        return new Response(JSON.stringify(apiTemplate(404, 'Account not found', {}, 'open_account_list')))
    }
    return new Response(JSON.stringify(apiTemplate(200, 'OK', JSON.parse(account), 'open_account_list')))
})

workersApi.all('*', () => new Response(JSON.stringify(apiTemplate(403, 'Invalid Request', {}, 'open_account_list')), { status: 403 }))

export default {
    fetch: (req, env, ...args) =>
        workersApi.handle(req, env, ...args).catch((e) => {
            Log(false, 'log', e)
            return new Response(JSON.stringify(apiTemplate(500, 'Unknown error', {}, 'open_account_list')), { status: 500 })
        })
}
