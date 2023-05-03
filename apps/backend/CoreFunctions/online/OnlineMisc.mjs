import { GenerateAccountInfo } from "../../../../libs/core/Core.account.mjs"
import { getTypeahead } from "../../../../libs/core/Core.fetch.mjs"
import { VerifyQueryString } from "../../../../libs/core/Core.function.mjs"
import { apiTemplate } from "../../../../libs/share/Constant.mjs"


const ApiTypeahead = async (req, res) => {
    const text = VerifyQueryString(req.query.text, '')
    let tmpTypeahead = {
        users: [],
        topics: []
    }
    try {
        const tmpTypeaheadResponse = await getTypeahead({text, guest_token: global.guest_token.token})
        //no rate limit
        //global.guest_token.updateRateLimit('TypeAhead')

        tmpTypeahead.topics = tmpTypeaheadResponse.data.topics
        tmpTypeahead.users = tmpTypeaheadResponse.data.users.map(user => GenerateAccountInfo(user).GeneralAccountData)

    } catch (e) {
        console.log(e)
        res.json(apiTemplate(500, 'Ok', {users: [],topics: []}, 'online'))
        return
    }

    res.json(apiTemplate(200, 'OK', tmpTypeahead, 'online'))
}

export {ApiTypeahead}
