//This file is used for check graphql features after update QueryID

import { getAudioSpace, getConversation, getEditHistory, getTweets, getUserInfo, getVerifiedAvatars } from "../../libs/core/Core.fetch.mjs";
import { GuestToken } from "../../libs/core/Core.function.mjs";


//getUserInfo, getVerifiedAvatars, getTweets, getConversation, getAudioSpace

const token = new GuestToken
token.updateGuestToken(0)
try {
    await getUserInfo("twitter", token.token, true)
    console.log(`tmv3_check: getUserInfo checked`)
} catch (e) {
    console.error(`tmv3_check: getUserInfo failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getVerifiedAvatars(["783214"], token.token)
    console.log(`tmv3_check: getVerifiedAvatars checked`)
} catch (e) {
    console.error(`tmv3_check: getVerifiedAvatars failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getTweets("783214", "", token.token, 10, true, true, true)
    console.log(`tmv3_check: getTweets checked`)
} catch (e) {
    console.error(`tmv3_check: getTweets failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getConversation("1580661436132757506", token.token, true)
    console.log(`tmv3_check: getConversation checked`)
} catch (e) {
    console.error(`tmv3_check: getConversation failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getAudioSpace("1nAJErvvVXgxL", token.token)
    console.log(`tmv3_check: getAudioSpace checked`)
} catch (e) {
    console.error(`tmv3_check: getAudioSpace failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}

try {
    await getEditHistory("1580661436132757506", token.token)
    console.log(`tmv3_check: getEditHistory checked`)
} catch (e) {
    console.error(`tmv3_check: getEditHistory failed`)
    console.log(e.message.replace("The following features cannot be null: ", "").split(', '))
}
