import { GenerateAccountInfo } from "../../../../libs/core/Core.account.mjs"
import { getTypeahead } from "../../../../libs/core/Core.fetch.mjs"
import { VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"
import { json } from "../../share.mjs"


const ApiTypeahead = async (req, env) => {
    const text = VerifyQueryString(req.query.text, '')
    let tmpTypeahead = {
        users: [],
        topics: []
    }
    try {
        const tmpTypeaheadResponse = await getTypeahead({text, guest_token: req.guest_token.token})
        //no rate limit
        tmpTypeahead.topics = tmpTypeaheadResponse.data.topics
        tmpTypeahead.users = tmpTypeaheadResponse.data.users.map(user => GenerateAccountInfo(user).GeneralAccountData)
    } catch (e) {
        console.log(e)
        return json(apiTemplate(500, 'Ok', {users: [],topics: []}, 'online'))
    }

    return json(apiTemplate(200, 'OK', tmpTypeahead, 'online'))
}

export {ApiTypeahead}
