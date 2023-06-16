/*
  Mock express.js Node.js 18.x required
  `nvm use 18`
  Twitter Monitor v3 test
  @BANKA2017 && NEST.MOE
*/
import { describe, expect, it, test, vi } from 'vitest'
import { AlbumSearch } from '../apps/backend/CoreFunctions/album/Album.mjs'
import { MediaProxy } from '../apps/backend/CoreFunctions/media/MediaProxy.mjs'
import { ApiUserInfo } from '../apps/backend/CoreFunctions/online/OnlineUserInfo.mjs'
import { ApiAudioSpace, ApiBroadcast, ApiMedia, ApiPoll, ApiSearch, ApiTweets } from '../apps/backend/CoreFunctions/online/OnlineTweet.mjs'
import { ApiTrends } from '../apps/backend/CoreFunctions/online/OnlineTrends.mjs'
import { ApiListInfo, ApiListMemberList, ApiTypeahead } from '../apps/backend/CoreFunctions/online/OnlineMisc.mjs'
import MockExpress from './mock/express'
import { ApiOfficialTranslate } from '../apps/backend/CoreFunctions/translate/OnlineTranslate.mjs'
import { json, updateGuestToken } from '../apps/backend/share.mjs'

const mock = new MockExpress
global.guest_token2 = mock.guest_token2
mock.setEnv('guest_token2_handle', mock.guest_token2)
mock.setEnv('guest_token2', mock.guest_token2.token)
mock.setEnv('json', json)
mock.setEnv('updateGuestToken', updateGuestToken)

test('Guest token', async () => {
    await global.guest_token2.updateGuestToken(1)
    expect(global.guest_token2.token.success).toBeTruthy
})

describe('UserInfo', async () => {
  test.concurrent('Name', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/userinfo/?name=twitter', {}, '', '')
    mock.res.json((await ApiUserInfo(mock.req, mock.req.env)).data)
    //value
    expect(mock.globalResponseCtx.body.data).toHaveProperty('uid', '783214')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('uid_str', '783214')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('name', 'Twitter')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('created_at', 1171982154)
    //type
    expect(typeof mock.globalResponseCtx.body.data.description).toEqual('string')
    expect(typeof mock.globalResponseCtx.body.data.followers).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.following).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.media_count).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.statuses_count).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.verified).toEqual('number')
  })
  test.concurrent('Uid', async () => {
   mock.init('https://tmapi.nest.moe/online/api/v3/data/userinfo/?uid=783214', {}, '', '')
   mock.res.json((await ApiUserInfo(mock.req, mock.req.env)).data)
    //value
    expect(mock.globalResponseCtx.body.data).toHaveProperty('uid', '783214')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('uid_str', '783214')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('name', 'Twitter')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('created_at', 1171982154)
    //type
    expect(typeof mock.globalResponseCtx.body.data.description).toEqual('string')
    expect(typeof mock.globalResponseCtx.body.data.followers).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.following).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.media_count).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.statuses_count).toEqual('number')
    expect(typeof mock.globalResponseCtx.body.data.verified).toEqual('number')
  })
  test.concurrent('Not exists', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/userinfo/?uid=0', {}, '', '')
    mock.res.json((await ApiUserInfo(mock.req, mock.req.env)).data)
    expect(mock.globalResponseCtx.body.code).toEqual(404)
  })
})

const testTweets = (top_cursor, bottom_cursor, checkCursor = true) => {
    expect(mock.globalResponseCtx.body.data).toHaveProperty('top_tweet_id')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('bottom_tweet_id')
    let {top_tweet_id, bottom_tweet_id} = mock.globalResponseCtx.body.data
    if (top_cursor) {
      expect(top_cursor).not.toEqual(top_tweet_id)
    }
    if (bottom_cursor) {
      expect(bottom_cursor).not.toEqual(bottom_tweet_id)
    }
    if (checkCursor) {
      expect(top_tweet_id?.length).toBeGreaterThanOrEqual(1)
      expect(bottom_tweet_id?.length).toBeGreaterThanOrEqual(1)
    }
    expect(mock.globalResponseCtx.body.data).toHaveProperty('tweets')
    expect(mock.globalResponseCtx.body.data).toHaveProperty('hasmore', true)
    return {top_tweet_id, bottom_tweet_id}
}

describe('Tweets', async () => {
  test.concurrent('Tweet', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=all', {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=all&refresh=1&tweet_id=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id)
  })
  test.concurrent('With replies', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=include_reply', {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=include_reply&refresh=1&tweet_id=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id)
  })
  test.concurrent('Status', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/tweets/?is_status=1&load_conversation=0&tweet_id=1652034062788206595', {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '', false)
    mock.init(`https://tmapi.nest.moe/online/api/v3/data/tweets/?is_status=1&load_conversation=0&tweet_id=1652034062788206595&refresh=0&cursor=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id, false)
  })
  test.concurrent('List', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/tweets/?list_id=53645372&count=20', {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/online/api/v3/data/tweets/?list_id=53645372&count=20&tweet_id=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await ApiTweets(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id)
  })
})

describe('Search', async () => {
  test.concurrent('Legacy mode', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/search/?q=Twitter', {}, '', '')
    mock.res.json((await ApiSearch(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/online/api/v3/data/search/?q=Twitter&tweet_id=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await ApiSearch(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id)
  })
  test.todo('Advanced mode')
})
describe('Album search', async () => {
  test.concurrent('List', async () => {
    mock.init('https://tmapi.nest.moe/album/data/list/?name=&platform=ns', {}, '', '')
    mock.res.json((await AlbumSearch(mock.req, mock.req.env)).data)
    const {top_tweet_id, bottom_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/album/data/list/?name=&platform=ns&tweet_id=${encodeURIComponent(bottom_tweet_id)}`, {}, '', '')
    mock.res.json((await AlbumSearch(mock.req, mock.req.env)).data)
    testTweets(top_tweet_id, bottom_tweet_id)
  })
  test.concurrent('Photo', async () => {
    mock.init('https://tmapi.nest.moe/album/data/list/?name=&platform=ns', {}, '', '')
    mock.res.json((await AlbumSearch(mock.req, mock.req.env)).data)
    const {top_tweet_id} = testTweets('', '')
    mock.init(`https://tmapi.nest.moe/album/data/list/?photos=1&tweet_id=${encodeURIComponent(top_tweet_id)}`, {}, '', '')
    mock.res.json((await AlbumSearch(mock.req, mock.req.env)).data)
    testTweets('', '')
  })
})

describe('Broadcast', async () => {
  test.concurrent('Info', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/broadcast/?id=1jMKgLaeYoAGL', {}, '', '')
    mock.res.json((await ApiBroadcast(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    expect(data.id).toEqual('1jMKgLaeYoAGL')
    if (data.state === 'running' || (data.state === 'ended' && data.is_available_for_replay)) {
      expect(data.playback).toMatch(/^https:\/\/[^\.]+\.video\.pscp\.tv\/.+?\.m3u8$/gm)
    }
  })
})
describe('Audiospace', async () => {
  test.concurrent('Info', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/audiospace/?id=1djGXldPqNyGZ', {}, '', '')
    mock.res.json((await ApiAudioSpace(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    expect(data.id).toEqual('1djGXldPqNyGZ')
    if (data.state === 'running' || (data.state === 'ended' && data.is_available_for_replay)) {
      console.log(data.playback)
      expect(data.playback).toMatch(/^https:\/\/[^\.]+\.video\.pscp\.tv\/.+?\.m3u8$/gm)
    }
  })
})

describe('Trends (might not supported in some region)', async () => {
  test.concurrent('Trends', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/trends', {}, '', '')
    mock.res.json((await ApiTrends(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    for (const tmpTrend of data) {
      expect(tmpTrend.name?.length).toBeGreaterThanOrEqual(1)
      expect(tmpTrend.domainContext?.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('Typeahead', async () => {
  test.concurrent('Typeahead', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/typeahead/?text=twitter', {}, '', '')
    mock.res.json((await ApiTypeahead(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    //users
    for (const user of data.users) {
      expect(user.name).toMatch(/(?:T|t)witter/gm)
      expect(user.name.length).toBeGreaterThanOrEqual(1)
    }
    //topic
    for (const topic of data.topics) {
      expect(topic.topic.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('List', async () => {
  test.concurrent('Info', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/listinfo/?list_id=53645372', {}, '', '')
    mock.res.json((await ApiListInfo(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    expect(data.user_info.uid_str).toEqual('21436960')
    expect(data.id).toEqual('53645372')
    expect(data.name).toEqual('Astronauts')
    expect(data.description).toEqual('ESA astronauts on Twitter')
    expect(data.created_at).toEqual(1314780355)
    expect(data.banner.url).toMatch(/^https:\/\/pbs\.twimg\.com/gm)
  })
  test.concurrent('Member', async () => {
    mock.init('https://tmapi.nest.moe/online/api/v3/data/listmember/?list_id=53645372&count=20', {}, '', '')
    mock.res.json((await ApiListMemberList(mock.req, mock.req.env)).data)
    const {data} = mock.globalResponseCtx.body
    //users
    expect(data.users.length).toBeGreaterThanOrEqual(18)
    for (const user of data.users) {
      expect(BigInt(user.uid_str)).toBeGreaterThanOrEqual(BigInt(1))
      expect(user.name.length).toBeGreaterThanOrEqual(1)
    }
    //cursor
    expect(data.cursor.top?.length).toBeGreaterThanOrEqual(1)
    expect(data.cursor.bottom?.length).toBeGreaterThanOrEqual(1)
  })
})

//MediaProxy //TODO

//ApiUserInfo
//https://tmapi.nest.moe/online/api/v3/data/userinfo/?name=twitter
//https://tmapi.nest.moe/online/api/v3/data/userinfo/?uid=783214

//ApiTweets
//https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=all
//https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=all&refresh=1&tweet_id=HCaAgIDgkq6w%2BS0AAA%3D%3D
//https://tmapi.nest.moe/online/api/v3/data/tweets/?name=twitter&count=20&uid=783214&display=include_reply
//https://tmapi.nest.moe/online/api/v3/data/tweets/?is_status=1&load_conversation=0&tweet_id=1652034062788206595
//https://tmapi.nest.moe/online/api/v3/data/tweets/?is_status=1&load_conversation=0&tweet_id=1652034062788206595&refresh=0&cursor=WwAAAPALHBmWnICxwaebmu0tnICxiZOUmu0tgICwwY0SAGCMgLHt6ZoSAPAkwL6B5aOa7S2ggLG1qZ2a7S2EgLGVgqKa7S2QgLH5gJ-a7S2OgLGN8Zea7S0lAhIVBAAA
//https://tmapi.nest.moe/online/api/v3/data/tweets/?list_id=53645372&count=20
//https://tmapi.nest.moe/online/api/v3/data/tweets/?list_id=53645372&count=20&refresh=0&tweet_id=DAABCgABFvljgE3__6wKAAIW5S1pmdZgAAgAAwAAAAIAAA

//AlbumSearch
//https://tmapi.nest.moe/album/data/list/?name=&platform=ns
//https://tmapi.nest.moe/album/data/list/?photos=1&tweet_id=1655461182214668289

//ApiSearch //https://tmapi.nest.moe/online/api/v3/data/search/?q=%22Mafia%22 
//https://tmapi.nest.moe/online/api/v3/data/search/?q=%22Mafia%22&refresh=0&tweet_id=1655460019754893314
//https://tmapi.nest.moe/online/api/v3/data/search/?q=%22Mafia%22&refresh=1&tweet_id=1655460360256888832
//ApiPoll //TODO
//ApiAudioSpace //TODO

//ApiBroadcast
//https://tmapi.nest.moe/online/api/v3/data/broadcast/?id=1jMKgLaeYoAGL
//ApiMedia//? used?

//ApiTrends //https://tmapi.nest.moe/online/api/v3/data/trends
//ApiTypeahead //https://tmapi.nest.moe/online/api/v3/data/typeahead/?text=twitter
//ApiListInfo //https://tmapi.nest.moe/online/api/v3/data/listinfo/?list_id=53645372
//ApiListMemberList //https://tmapi.nest.moe/online/api/v3/data/listmember/?list_id=53645372&count=20
//ApiTranslate -> https://github.com/BANKA2017/translator-utils/blob/master/tests
//ApiOfficialTranslate // -> TODO useless now
