import { describe, expect, it, test } from 'vitest'
import { GuestToken } from '../libs/core/Core.function.mjs'
import { getArticle, getAudioSpace, getBroadcast, getConversation, getEditHistory, getListInfo, getListMember, getListTimeLine, getMediaTimeline, getRecommendations, getTranslate, getTrends, getTweets, getTypeahead, getUserInfo, getVerifiedAvatars } from '../libs/core/Core.fetch.mjs'

let guest_token1 = new GuestToken
let guest_token2 = new GuestToken

test('Guest token', async () => {
    await guest_token1.updateGuestToken(0)
    await guest_token2.updateGuestToken(1)
    
    expect(guest_token1.token.success).toBeTruthy
    expect(guest_token2.token.success).toBeTruthy
})

describe('UserInfo', () => {
    test.concurrent('screen_name (token 1)', async ({ expect }) => {
        expect(await getUserInfo({user: "Twitter", guest_token: guest_token1.token, graphqlMode: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('uid (token 1)', async ({ expect }) => {
        expect(await getUserInfo({user: "783214", guest_token: guest_token1.token, graphqlMode: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('screen_name (token 2)', async ({ expect }) => {
        expect(await getUserInfo({user: "Twitter", guest_token: guest_token2.token, graphqlMode: true, authorization: 1})).toHaveProperty('data')
    })
    test.concurrent('uid (token 2)', async ({ expect }) => {
        expect(await getUserInfo({user: "783214", guest_token: guest_token2.token, graphqlMode: true, authorization: 1})).toHaveProperty('data')
    })
})

describe('VerifiedAvatars', () => {
    test.concurrent('@coinbase (token 1)', async ({ expect }) => {
        expect(await getVerifiedAvatars({uid: "574032254", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('@coinbase (token 2)', async ({ expect }) => {
        expect(await getVerifiedAvatars({uid: "574032254", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Recommendations', () => {
    test.concurrent('@Twitter (token 1)', async ({ expect }) => {
        expect(await getRecommendations({user: "Twitter", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('@Twitter (token 2)', async ({ expect }) => {
        expect(await getRecommendations({user: "Twitter", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Timeline', () => {
    test.concurrent('Tweets (token 1)', async ({ expect }) => {
        expect(await getTweets({queryString: "783214", guest_token: guest_token1.token, graphqlMode: true, online: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('Tweets & Replies (token 1)', async ({ expect }) => {
        expect(await getTweets({queryString: "783214", guest_token: guest_token1.token, graphqlMode: true, online: true, withReply: true, authorization: 0})).toHaveProperty('data')
    })
    //search is not available
    test.skip('Search (token 1)', async ({ expect }) => {
        expect(await getTweets({queryString: "#twitter", guest_token: guest_token1.token, graphqlMode: true, online: true, searchMode: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('Tweets (token 2)', async ({ expect }) => {
        expect(await getTweets({queryString: "783214", guest_token: guest_token2.token, graphqlMode: true, online: true, authorization: 1})).toHaveProperty('data')
    })
    test.concurrent('Tweets & Replies (token 2)', async ({ expect }) => {
        expect(await getTweets({queryString: "783214", guest_token: guest_token2.token, graphqlMode: true, online: true, withReply: true, authorization: 1})).toHaveProperty('data')
    })
    //search is not available
    test.skip('Search (token 2)', async ({ expect }) => {
        expect(await getTweets({queryString: "#twitter", guest_token: guest_token2.token, graphqlMode: true, online: true, searchMode: true, authorization: 1})).toHaveProperty('data')
    })
})


describe('MediaTimeline', () => {
    test.concurrent('@Twitter (token 1)', async ({ expect }) => {
        expect(await getMediaTimeline({uid: "783214", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('@Twitter (token 2)', async ({ expect }) => {
        expect(await getMediaTimeline({uid: "783214", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Conversation', () => {
    test.concurrent('#1623411536243965954 (token 1)', async ({ expect }) => {
        expect(await getConversation({tweet_id: "1623411536243965954", guest_token: guest_token1.token, graphqlMode: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('#1623411536243965954 (token 2)', async ({ expect }) => {
        expect(await getConversation({tweet_id: "1623411536243965954", guest_token: guest_token2.token, graphqlMode: true, authorization: 1})).toHaveProperty('data')
    })
})

describe('EditHistory', () => {
    test.concurrent('#1623411536243965954 (token 1)', async ({ expect }) => {
        expect(await getEditHistory({tweet_id: "1623411536243965954", guest_token: guest_token1.token, graphqlMode: true, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('#1623411536243965954 (token 2)', async ({ expect }) => {
        expect(await getEditHistory({tweet_id: "1623411536243965954", guest_token: guest_token2.token, graphqlMode: true, authorization: 1})).toHaveProperty('data')
    })
})

describe('AudioSpace', () => {
    test.concurrent('#1nAJErvvVXgxL (token 1)', async ({ expect }) => {
        expect(await getAudioSpace({id: "1nAJErvvVXgxL", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('#1nAJErvvVXgxL (token 2)', async ({ expect }) => {
        expect(await getAudioSpace({id: "1nAJErvvVXgxL", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Broadcast', () => {
    test.concurrent('NASA/1592721757294587905 ~ 1jMKgLaeYoAGL (token 1)', async ({ expect }) => {
        expect(await getBroadcast({id: "1jMKgLaeYoAGL", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('NASA/1592721757294587905 ~ 1jMKgLaeYoAGL (token 2)', async ({ expect }) => {
        expect(await getBroadcast({id: "1jMKgLaeYoAGL", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('LiveVideoStream', () => {
    it.todo('media_key for AudioSpace')
})

describe('Typeahead', () => {
    test.concurrent('Twitter (token 1)', async ({ expect }) => {
        expect(await getTypeahead({text: "Twitter", guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('Twitter (token 2)', async ({ expect }) => {
        expect(await getTypeahead({text: "Twitter", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Article', () => {
    //NOT SUPPORTED TOKEN 1
    test.concurrent('notes/1585225861250355201 (token 2)', async ({ expect }) => {
        expect(await getArticle({id: "1585225861250355201", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Trends', () => {
    //NOT SUPPORTED TOKEN 1
    test.concurrent('trends (token 2)', async ({ expect }) => {
        expect(await getTrends({initial_tab_id: "trends", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('Translate', () => {
    test.concurrent('Twitter (token 1)', async ({ expect }) => {
        expect(await getTranslate({id: "1623411536243965954", type: 'tweets', target: 'zh-tw', guest_token: guest_token1.token, authorization: 0})).toHaveProperty('data')
    })
    test.concurrent('Twitter (token 2)', async ({ expect }) => {
        expect(await getTranslate({id: "1623411536243965954", type: 'tweets', target: 'zh-tw', guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
})

describe('List', () => {
    //NOT SUPPORTED TOKEN 1
    test.concurrent('@esa/astronauts Info (token 2)', async ({ expect }) => {
        expect(await getListInfo({id: "53645372", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
    test.concurrent('@esa/astronauts Member (token 2)', async ({ expect }) => {
        expect(await getListMember({id: "53645372", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })
    test.concurrent('@esa/astronauts Timeline (token 2)', async ({ expect }) => {
        expect(await getListTimeLine({id: "53645372", guest_token: guest_token2.token, authorization: 1})).toHaveProperty('data')
    })

})
