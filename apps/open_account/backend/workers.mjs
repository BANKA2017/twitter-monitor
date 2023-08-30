import { Router } from 'itty-router'
import { apiTemplate } from '../../../libs/share/Constant.mjs'
import { PostBodyParser } from '../../cfworkers/share.mjs'
import { Log } from '../../../libs/core/Core.function.mjs'

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
        await env.kv.put(`tm:open_account:${config.user.screen_name}`, req.postBody.get('account'), { expiration: Math.floor(Date.now() + 100 * 60 * 60 * 24 * 30) / 1000 })
        return new Response(JSON.stringify(apiTemplate(200, 'OK', config.user, 'open_account_list')))
    }
)
//workersApi.get('/data/random', async (req, env) => {
//    const list = await env.kv.list({ prefix: 'tm:open_account:_LO_', limit: 1000 })
//    return new Response(JSON.stringify(apiTemplate(200, 'OK', list, 'open_account_list')))
//})

workersApi.all('*', () => new Response(JSON.stringify(apiTemplate(403, 'Invalid Request', {}, 'open_account_list')), { status: 403 }))

export default {
    fetch: (req, env, ...args) =>
        workersApi.handle(req, env, ...args).catch((e) => {
            Log(false, 'log', e)
            return new Response(JSON.stringify(apiTemplate(500, 'Unknown error', {}, 'open_account_list')), { status: 500 })
        })
}
