import { getToken } from "../../libs/core/Core.fetch.mjs"

const json = (data) => new Response(JSON.stringify(data), {
    status: 200,
    headers: {
        'content-type': 'application/json'
    }
})

const updateGuestToken = async (env, k, tokenType = 0, update = true) => {
    if (update) {
        const tmpToken = await getToken(tokenType)
        if (tmpToken.success) {
            await env.kv.put(k, JSON.stringify(tmpToken), {expiration: Math.floor(tmpToken.expire / 1000)})
        }
        return tmpToken
    }
    return {}
}

export {json, updateGuestToken}