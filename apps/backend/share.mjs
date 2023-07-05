import { existsSync, writeFileSync } from 'fs'
import { basePath } from '../../libs/share/NodeConstant.mjs'

const json = (data, status = 200) => ({
    status,
    data
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

const mediaCacheSave = (buffer, name) => {
    try {
        writeFileSync(`${basePath}/../apps/backend/cache/${name}`, buffer)
    } catch (e) {
        console.error(`MediaProxy: #MediaProxy error`, e)
    }
}

export { json, updateGuestToken, ResponseWrapper, mediaExistPreCheck, mediaCacheSave }
