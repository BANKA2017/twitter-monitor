import { existsSync, writeFileSync } from 'fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'
import { Log } from '../../libs/core/Core.function.mjs'

const json = (data, status = 200) => ({
    status,
    data,
    format: 'json'
})

const xml = (data, status = 200) => ({
    status,
    data,
    format: 'xml'
})

const updateGuestToken = async (env, k, tokenType = 0, update = true, type = '') => {
    if (update) {
        env[`${k}_handle`].updateRateLimit(type, 0)
    } else if (type) {
        env[`${k}_handle`].updateRateLimit(type)
    }
    return {}
}

const ResponseWrapper = (data, status = 403, headers = new Headers()) => ({
    data,
    status,
    headers
})

const mediaExistPreCheck = (name = '') => existsSync(`${basePath}/../apps/backend/cache/${name}`)

const mediaCacheSave = (data, name) => {
    try {
        writeFileSync(`${basePath}/../apps/backend/cache/${name}`, data)
    } catch (e) {
        Log(false, 'error', `Cache: #Cache error`, e)
    }
}

export { json, xml, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave }
