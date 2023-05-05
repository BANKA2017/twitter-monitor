/*
 DEPRECATED
 WE MOVE TO `~/tests` WITH vitest
*/


//This file is used for check graphql features after update QueryID

import { getAudioSpace, getConversation, getEditHistory, getTweets, getUserInfo, getVerifiedAvatars } from "../../libs/core/Core.fetch.mjs";
import { GuestToken } from "../../libs/core/Core.function.mjs";


//getUserInfo, getVerifiedAvatars, getTweets, getConversation, getAudioSpace

const token = new GuestToken
token.updateGuestToken(1)
try {
    await getUserInfo({user: "twitter", guest_token: token.token, graphqlMode: true})
    console.log(`tmv3_check: getUserInfo checked`)
} catch (e) {
    console.error(`tmv3_check: getUserInfo failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getVerifiedAvatars({uid: ["783214"], guest_token: token.token})
    console.log(`tmv3_check: getVerifiedAvatars checked`)
} catch (e) {
    console.error(`tmv3_check: getVerifiedAvatars failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getTweets({queryString: "783214", cursor: "", guest_token: token.token, count: 10, online: true, graphqlMode: true, searchMode: true})
    console.log(`tmv3_check: getTweets checked`)
} catch (e) {
    console.error(`tmv3_check: getTweets failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getConversation({tweet_id: "1580661436132757506", guest_token: token.token, graphqlMode: true})
    console.log(`tmv3_check: getConversation checked`)
} catch (e) {
    console.error(`tmv3_check: getConversation failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getAudioSpace({id: "1nAJErvvVXgxL", guest_token: token.token})
    console.log(`tmv3_check: getAudioSpace checked`)
} catch (e) {
    console.error(`tmv3_check: getAudioSpace failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getEditHistory({id: "1580661436132757506", guest_token: token.token})
    console.log(`tmv3_check: getEditHistory checked`)
} catch (e) {
    console.error(`tmv3_check: getEditHistory failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}
