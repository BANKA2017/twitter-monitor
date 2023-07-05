import { getToken } from '../../libs/core/Core.fetch.mjs'
import { GuestToken } from '../../libs/core/Core.function.mjs'

const json = (data) =>
    new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'content-type': 'application/json'
        }
    })

//Type is useless in cfworkers api
const updateGuestToken = async (env, k, tokenType = 0, update = true, type = '') => {
    if (update) {
        const handle = new GuestToken('android')
        await handle.updateGuestToken(handle.open_account.authorization)
        const tmpToken = handle.token //  await getToken()
        if (tmpToken.success) {
            await env.kv.put(k, JSON.stringify(tmpToken), { expiration: Math.floor(tmpToken.expire / 1000) })
        }
        return tmpToken
    }
    return {}
}

const ResponseWrapper = (data, status = 403, headers = new Headers()) =>
    new Response(data, {
        status,
        headers
    })

const mediaExistPreCheck = (path = '') => false

const mediaCacheSave = (buffer, name) => {}

const PostBodyParser = async (req, defaultValue = new Map([])) => {
    if (req.body) {
        const reader = req.body.getReader()
        const pipe = []
        while (true) {
            const { done, value } = await reader.read()
            if (done) {
                break
            }
            pipe.push(value)
        }
        //https://gist.github.com/72lions/4528834
        let offset = 0
        let body = new Uint8Array(pipe.reduce((acc, cur) => acc + cur.byteLength, 0))
        for (const chunk of pipe) {
            body.set(new Uint8Array(chunk), offset)
            offset += chunk.byteLength
        }
        //TODO json parser
        req.postBody = new URLSearchParams(new TextDecoder('utf-8').decode(body))
    } else {
        return defaultValue
    }
}

export { json, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave, PostBodyParser }
