import { GenerateAccountInfo } from "../../../../libs/core/Core.account.mjs"
import { getUserInfo } from "../../../../libs/core/Core.fetch.mjs"
import { GetEntitiesFromText, VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json, updateGuestToken } from "../../share.mjs"

const ApiUserInfo = async (req, env) => {
    const name = VerifyQueryString(req.query.name, '')
    const uid = VerifyQueryString(req.query.uid, '0')
    //TODO errors
    if (!(name || uid)) {
        return apiTemplate(404, 'No such account')
    }
    let userInfo = {}
    try {
        userInfo = await getUserInfo(name || uid, req.guest_token)
        
        //updateGuestToken
        await updateGuestToken(env, 'guest_token', 0, userInfo.headers.get('x-rate-limit-remaining') < 20)
    } catch (e) {
        console.error(`[${new Date()}]: #OnlineUserInfo #${name || uid} #${e.code} ${e.message}`)
        return json(apiTemplate(e.code, e.message))
    }
    let {GeneralAccountData} = GenerateAccountInfo(userInfo.data, {
        hidden: 0,
        lockes: 0,
        deleted: 0,
        organization: 0,
    })
    if (!GeneralAccountData.uid) {
        return json(apiTemplate(404, 'No such account'))
    }

    if (GeneralAccountData.description) {
        GeneralAccountData.description = GeneralAccountData.description.replaceAll("\n", "\n<br>")
    }
    
    GeneralAccountData.top = String(GeneralAccountData.top)
    GeneralAccountData.header = GeneralAccountData.header.replaceAll(/http(|s):\/\//gm, '')
    GeneralAccountData.uid_str = String(GeneralAccountData.uid)
    //GeneralAccountData.uid = Number(GeneralAccountData.uid)

    let originTextAndEntities = GetEntitiesFromText(GeneralAccountData.description)
    GeneralAccountData.description_origin = originTextAndEntities.originText
    GeneralAccountData.description_entities = originTextAndEntities.entities

    return json(apiTemplate(200, 'OK', GeneralAccountData))
}

export {ApiUserInfo}