import md5 from 'js-md5'
import path2array from "./Core.apiPath.mjs"
//import { readFileSync } from 'node:fs'
//import { basePath } from "../share/Constant.mjs"

import graphqlQueryIdList from '../../libs/assets/graphql/graphqlQueryIdList.js'
import featuresValueList from '../../libs/assets/graphql/featuresValueList.js'
import axiosFetch from "axios-helper"

//const graphqlQueryIdList = JSON.parse(readFileSync(basePath + "/../libs/assets/graphqlQueryIdList.json").toString())
//const featuresValueList = JSON.parse(readFileSync(basePath + "/../libs/assets/featuresValueList.json").toString())

const generateCsrfToken = () => md5.hex('' + new Date())

const TW_AUTHORIZATION = "Bearer AAAAAAAAAAAAAAAAAAAAAPYXBAAAAAAACLXUNDekMxqa8h%2F40K4moUkGsoc%3DTYfbDKbT3jJPCEVnMYqilB28NHfOPqkca3qaAxGfsyKCs0wRbw"//old token

const TW_AUTHORIZATION2 = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"//new token

//for tweetdeck, but useless until login
const TWEETDECK_AUTHORIZATION = "Bearer AAAAAAAAAAAAAAAAAAAAAF7aAAAAAAAASCiRjWvh7R5wxaKkFp7MM%2BhYBqM%3DbQ0JPmjU9F6ZoMhDfI4uTNAaQuTDm2uO9x3WFVr2xBZ2nhjdP0"//tweetdeck
const TWEETDECK_AUTHORIZATION2 = "Bearer AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF"//new tweetdeck

const Authorization = [TW_AUTHORIZATION, TW_AUTHORIZATION2]
const ct0 = generateCsrfToken()

const axios = axiosFetch({
  headers: {
  authorization: TW_AUTHORIZATION,
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
}})

const getGraphqlFeatures = (queryName) => {
  if (graphqlQueryIdList[queryName]) {
    return Object.fromEntries(new Map(graphqlQueryIdList[queryName].metadata.featureSwitches.map(feature => [feature, featuresValueList[feature] || false])))
  } else {
    return {}
  }
}

const generateUrl = (user = '', isGraphql = false) => {
  if (isGraphql) {
    let graphqlVariables = {withSuperFollowsUserFields: true, withSafetyModeUserFields: true}
    if (!isNaN(user)) {
      graphqlVariables["userId"] = user
      return "https://api.twitter.com/graphql/" + graphqlQueryIdList.UserByRestId.queryId + "/UserByRestId?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('UserByRestId'))})).toString()
    } else {
      graphqlVariables["screen_name"] = user
      return "https://api.twitter.com/graphql/" + graphqlQueryIdList.UserByScreenName.queryId + "/UserByScreenName?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('UserByScreenName'))})).toString()
    }
  } else {
    return "https://api.twitter.com/1.1/users/show.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&" + ((!isNaN(user)) ? "user_id=" : "screen_name=") + user
  }
}

const coreFetch = async (url = '', guest_token = {}, cookie = [], authorization = 0, headers = {}) => {
  if (!url) {
    throw "tmv3: Invalid url"
  }
  if (!guest_token.success) {
    guest_token = await getToken()
  }

  return await new Promise((resolve, reject) => {
    axios.get(url, {
      headers: {
        ...headers,
        authorization: Authorization[authorization],
        'x-guest-token': guest_token.token,
        'x-csrf-token': ct0,
        cookie: 'ct0=' + ct0 + ';gt=' + guest_token.token + ';' + [...guest_token.cookies, ...cookie].join(';'),
      }
    }).then(response => {
      if (!response.data) {
        reject({code: -1000, message: 'empty data'})
      }
      resolve(response)
    }).catch(e => {
      if (!e.response) {
        reject({code: -1000, message: e.code})
      } else if (e.response?.status === 429) {
        reject({code: 429, message: e.response.data})
      } else {
        reject({code: e.response.data?.errors?.[0].code??-1000, message: e.response.data?.errors?.[0].message??e.message})
      }
    }).catch(e => {
      reject(e)
    })
  })
}

// ANONYMOUS
const getToken = async (authorizationMode = 0) => {
  let tmpResponse = {
    success: false,
    token: '',
    code: -1000,
    cookies: {},
    rate_limit: {
      UserByRestId: 470,//500
      UserByScreenName: 470,//500
      UserTweets: 470,//500
      TweetDetail: 470,//500//poll also use this
      AudioSpaceById: 470,//500
      BroadCast: 185,//187
      Search: 245,//250
      Recommendation: 55,//60,
      Translation: 185,//187
      Trending: 19990,//20000
    },
    expire: (Date.now() + 870000)//15 min
  }
  return await (new Promise((resolve, reject) => {
    //2000 per 30 min i guess
    axios.post("https://api.twitter.com/1.1/guest/activate.json", '', {
      headers: {
        authorization: Authorization[authorizationMode],
        'x-csrf-token': ct0,
        cookie: 'ct0=' + ct0,
      }
    }).then(response => {
      if (response.status === 200 && response.data.guest_token) {
        tmpResponse.code = 200
        tmpResponse.token = response.data.guest_token
        tmpResponse.success = true
        tmpResponse.cookies = (response.headers instanceof Map ? ([...response.headers].filter(header => header[0] === 'set-cookie').map(header => header[1]) ?? []) : (response.headers?.['set-cookie'] ?? [])).map(cookie => cookie.split(';')[0])
      }
      resolve(tmpResponse)
    }).catch(e => {
      tmpResponse.token = e.message
      reject(tmpResponse)
    })
  }))
}

const getUserInfo = async (user = '', guest_token = {}, graphqlMode = true) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(user)) {
    //TODO while user length larger then 500 (max value for one guest token)
    //if (user.length > 500)
    return await Promise.allSettled(user.map(userId => getUserInfo(userId, guest_token, graphqlMode)))
  } else {
    return await (new Promise((resolve, reject) => {
      coreFetch(generateUrl(user, graphqlMode), guest_token).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    }))
  }
}

//account owned nft avatar or had blue verified
const getVerifiedAvatars = async (uid = [], guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (!(uid instanceof Array)) {
    uid = [uid]
  }

  const graphqlVariables = {
    userIds: uid
  }
  //https://api.twitter.com/graphql/AkfLpq1RURPtDOcd56qyCg/UsersVerifiedAvatars?variables=%7B%22userIds%22%3A%5B%222392179773%22%2C%22815928932759285760%22%5D%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue%7D
  return await (new Promise((resolve, reject) => {
    coreFetch(`https://api.twitter.com/graphql/${graphqlQueryIdList.UsersVerifiedAvatars.queryId}/UsersVerifiedAvatars?` + (new URLSearchParams({
      variables: JSON.stringify(graphqlVariables),
      features: JSON.stringify(getGraphqlFeatures('UsersVerifiedAvatars'))
    }).toString()), guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  }))
}

//max is 37-38
const getRecommendations = async (user = '', guest_token = {}, count = 40) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(user)) {
    //TODO while user length larger then 500 (max value for one guest token)
    //if (user.length > 500)
    return await Promise.allSettled(user.map(userId => getRecommendations(userId, guest_token, count)))
  } else {
    return await (new Promise((resolve, reject) => {
      coreFetch(`https://api.twitter.com/1.1/users/recommendations.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&skip_status=1&&pc=true&display_location=profile_accounts_sidebar&limit=${count}&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CreplyvotingDownvotePerspective%2CvoiceInfo%2CbirdwatchPivot%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe&` + ((!isNaN(user)) ? "user_id=" : "screen_name=") + user, guest_token).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    }))
  }
}

const getMediaTimeline = async (uid = [], guest_token = {}, count = 20, graphqlMode = true) => {
  count = (count || -1) > 0 ? count : 20
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(uid)) {
    return await Promise.allSettled(uid.map(singleUid => getMediaTimeline(singleUid, guest_token, count, graphqlMode)))
  }
  //if (graphqlMode) {
  let graphqlVariables = {
    userId: uid,
    count,
    includePromotedContent: false,
    withSuperFollowsUserFields: true,
    withDownvotePerspective: false,
    withReactionsMetadata: false,
    withReactionsPerspective: false,
    withSuperFollowsTweetFields: true,
    withClientEventToken: false,
    withBirdwatchNotes: false,
    withVoice: true,
    withV2Timeline: true
  }

  //TODO check exist of cursor
  //if (cursor) {
  //  graphqlVariables["cursor"] = cursor
  //}

  return await new Promise((resolve, reject) => {
    coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.UserMedia.queryId + "/UserMedia?" + (new URLSearchParams({
      variables: JSON.stringify(graphqlVariables),
      features: JSON.stringify(getGraphqlFeatures('UserMedia'))
    }).toString()), guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
  //} else {
    //
  //}
}

const getTweets = async (queryString = '', cursor = '', guest_token = {}, count = false, online = false, graphqlMode = true, searchMode = false, withReply = false) => {
  count = count ? count : (cursor ? 499 : (online ? 40 : (graphqlMode ? 499 : 999)))
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(queryString)) {
    return await Promise.allSettled(queryString.map(queryStringItem => getTweets(queryStringItem, cursor, guest_token, count, online, graphqlMode, searchMode)))
  }
  //实际上即使写了999网页api返回800-900条记录, 客户端返回约400-450条记录
  //如果是搜索就不需要写太多，反正上限为20
  //网页版使用的
  //https://api.twitter.com/2/timeline/conversation/:uid.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=20&ext=mediaStats%2CcameraMoment
  if (graphqlMode) {
    let graphqlVariables = {
      userId: queryString,
      count,
      withTweetQuoteCount: true,
      withQuickPromoteEligibilityTweetFields: true,
      withSuperFollowsUserFields: true,
      withSuperFollowsTweetFields: true,
      withDownvotePerspective: false,
      withReactionsMetadata: false,
      includePromotedContent: true,
      withReactionsPerspective: false,
      withUserResults: false,
      withVoice: true,
      withNonLegacyCard: true,
      withV2Timeline: true,
    }

    if (cursor) {
        graphqlVariables["cursor"] = cursor
    }

    return await new Promise((resolve, reject) => {
      coreFetch("https://api.twitter.com/graphql/" + (withReply ? graphqlQueryIdList.UserTweetsAndReplies.queryId + "/UserTweetsAndReplies?" : graphqlQueryIdList.UserTweets.queryId + "/UserTweets?") + (new URLSearchParams({
        variables: JSON.stringify(graphqlVariables),
        features: JSON.stringify(getGraphqlFeatures(withReply ? 'UserTweetsAndReplies' : 'UserTweets'))
      }).toString()), guest_token).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    })
  } else if (searchMode) {
    //TODO Graphql for search
    //https://api.twitter.com/2/search/adaptive.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&q=from%3Abang_dream_info&tweet_search_mode=live&count=20&query_source=recent_search_click&pc=1&spelling_corrections=1&include_ext_edit_control=true&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2CbirdwatchPivot%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe
    let tmpQueryObject = {
      include_profile_interstitial_type: 1,
      include_blocking: 1,
      include_blocked_by: 1,
      include_followed_by: 1,
      include_want_retweets: 1,
      include_mute_edge: 1,
      include_can_dm: 1,
      include_can_media_tag: 1,
      include_ext_has_nft_avatar: 1,
      include_ext_is_blue_verified: 1,
      include_ext_verified_type: 1,
      skip_status: 1,
      cards_platform: 'Web-12',
      include_cards: 1,
      include_ext_alt_text: true,
      include_ext_limited_action_results: false,
      include_quote_count: true,
      include_reply_count: 1,
      tweet_mode: 'extended',
      include_ext_views: true,
      include_entities: true,
      include_user_entities: true,
      include_ext_media_color: true,
      include_ext_media_availability: true,
      include_ext_sensitive_media_warning: true,
      include_ext_trusted_friends_metadata: true,
      send_error_codes: true,
      simple_quoted_tweet: true,
      q: queryString.trim(),
      tweet_search_mode: 'live',
      query_source: 'typed_query',
      count,
      requestContext: 'launch',
      pc: 1,
      spelling_corrections: 1,
      include_ext_edit_control: true,
      ext: 'mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,enrichments,superFollowMetadata,unmentionInfo,editControl,vibe'
    }
    let graphqlVariables = {
      rawQuery: queryString.trim(),
      count,
      product: "Latest",
      withDownvotePerspective: false,
      withReactionsMetadata: false,
      withReactionsPerspective: false
    }
    if (cursor) {
      graphqlVariables['cursor'] = cursor
    }
    return await new Promise((resolve, reject) => {
      coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.SearchTimeline.queryId + "/SearchTimeline?" + (new URLSearchParams({
        variables: JSON.stringify(graphqlVariables),
        features: JSON.stringify(getGraphqlFeatures('SearchTimeline'))
      }).toString()), guest_token, [], 0).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })

      //coreFetch("https://twitter.com/i/api/2/search/adaptive.json?" + (new URLSearchParams//(tmpQueryObject)).toString(), guest_token).then(response => {
      //  resolve(response)
      //}).catch(e => {
      //  reject(e)
      //})
    })
  } else {
    // no use because http 429 loop
    return await new Promise((resolve, reject) => {
      coreFetch(`https://api.twitter.com/2/timeline/profile/${queryString}.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&ext=mediaStats%2CcameraMoment&count=` + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ''), guest_token).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    })
  }
}

const getConversation = async (tweet_id = '', guest_token = {}, graphqlMode = true, authorization = 0) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(tweet_id)) {
    return await Promise.allSettled(tweet_id.map(tweetId => getConversation(tweetId, guest_token, graphqlMode, authorization)))
  }
  if (graphqlMode) {
    const graphqlVariables = {
      focalTweetId: tweet_id,
      with_rux_injections: false,
      includePromotedContent: true,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withSuperFollowsUserFields: true,
      withDownvotePerspective: false,
      withReactionsMetadata: false,
      withReactionsPerspective: false,
      withSuperFollowsTweetFields: true,
      withVoice: true,
      withV2Timeline: true
    }
    
    return await new Promise((resolve, reject) => {
      coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.TweetDetail.queryId + "/TweetDetail?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('TweetDetail'))})).toString(), guest_token, [], authorization).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    })
  } else {
    return await new Promise((resolve, reject) => {
      coreFetch("https://api.twitter.com/2/timeline/conversation/" + tweet_id + ".json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_composer_source=true&include_ext_alt_text=true&include_reply_count=1&tweet_mode=extended&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&send_error_codes=true&simple_quoted_tweets=true&count=1&ext=mediaStats%2CcameraMoment", guest_token).then(response => {
        resolve(response)
      }).catch(e => {
        reject(e)
      })
    })
  }
}

const getEditHistory = async (tweet_id = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(tweet_id)) {
    return await Promise.allSettled(tweet_id.map(tweetId => getEditHistory(tweetId, guest_token, graphqlMode)))
  }
  const graphqlVariables = {
    tweetId: tweet_id,
    withSuperFollowsUserFields: true,
    withDownvotePerspective: false,
    withReactionsMetadata: false,
    withReactionsPerspective: false,
    withSuperFollowsTweetFields: true,
    withQuickPromoteEligibilityTweetFields: true
  }
  
  return await new Promise((resolve, reject) => {
    coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.TweetEditHistory.queryId + "/TweetEditHistory?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('TweetEditHistory'))})).toString(), guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getAudioSpace = async (id = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(id)) {
    return await Promise.allSettled(id.map(justId => getAudioSpace(justId, guest_token)))
  }
  const graphqlVariables = {
    id,
    isMetatagsQuery: true,
    withSuperFollowsUserFields: true,
    withDownvotePerspective: false,
    withReactionsMetadata: false,
    withReactionsPerspective: false,
    withSuperFollowsTweetFields: true,
    withReplays: true
  }

  return await new Promise((resolve, reject) => {
    coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.AudioSpaceById.queryId + "/AudioSpaceById?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('AudioSpaceById'))})).toString(), guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getBroadcast = async (id = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(id)) {
    return await Promise.allSettled(id.map(justId => getBroadcast(justId, guest_token)))
  }
  return await new Promise((resolve, reject) => {
    coreFetch(`https://api.twitter.com/1.1/broadcasts/show.json?ids=${id}&include_events=true`, guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getLiveVideoStream = async (media_key = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  if (Array.isArray(media_key)) {
    return await Promise.allSettled(id.map(justId => getLiveVideoStream(justId, guest_token)))
  }
  return await new Promise((resolve, reject) => {
    coreFetch(`https://api.twitter.com/1.1/live_video_stream/status/${media_key}?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com`, guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getTypeahead = async (text = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  return await new Promise((resolve, reject) => {
    coreFetch(`https://api.twitter.com/1.1/search/typeahead.json?include_ext_is_blue_verified=1&q=${text}&src=search_box&result_type=events%2Cusers%2Ctopics`, guest_token).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getArticle = async (id = '', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }

  const graphqlVariables = {
    twitterArticleId: id,
    withSuperFollowsUserFields: true,
    withDownvotePerspective: false,
    withReactionsMetadata: false,
    withReactionsPerspective: false,
    withSuperFollowsTweetFields: true
  }

  return await new Promise((resolve, reject) => {
    coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList.TwitterArticleByRestId.queryId + "/TwitterArticleByRestId?" + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures('TwitterArticleByRestId'))})).toString(), guest_token, [], 1).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

//https://github.com/FixTweet/FixTweet/blob/main/src/helpers/translate.ts
const getTranslate = async (id = '0', type = 'tweets', target = 'en', guest_token = {}) => {
  if (!guest_token.success) {
    guest_token = await getToken()
  }
  return await new Promise((resolve, reject) => {
    const url = (type === 'profile') ? `https://twitter.com/i/api/1.1/strato/column/None/profileUserId=${id},destinationLanguage=None,translationSource=Some(Google)/translation/service/translateProfile` : `https://twitter.com/i/api/1.1/strato/column/None/tweetId=${id},destinationLanguage=None,translationSource=Some(Google),feature=None,timeout=None,onlyCached=None/translation/service/translateTweet`

    coreFetch(url, guest_token, [], 0, {'x-twitter-client-language': target}).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

//const getMmoment = async () => {
//  
//}

// ANONYMOUS AND COOKIE REQUIRED
const getTrends = async (initial_tab_id = 'trending', count = 20, guest_token = {}, cookie = []) => {
  if (!guest_token.success) {
    guest_token = await getToken(1)
  }
  return await new Promise((resolve, reject) => {
    coreFetch(initial_tab_id === 'trends' ? `https://api.twitter.com/2/guide.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_ext_views=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&count=${count}&candidate_source=trends&include_page_configuration=false&entity_tokens=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe` : `https://api.twitter.com/2/guide.json?include_profile_interstitial_type=1&include_blocking=1&include_blocked_by=1&include_followed_by=1&include_want_retweets=1&include_mute_edge=1&include_can_dm=1&include_can_media_tag=1&include_ext_has_nft_avatar=1&include_ext_is_blue_verified=1&include_ext_verified_type=1&skip_status=1&cards_platform=Web-12&include_cards=1&include_ext_alt_text=true&include_ext_limited_action_results=false&include_quote_count=true&include_reply_count=1&tweet_mode=extended&include_ext_collab_control=true&include_ext_views=true&include_entities=true&include_user_entities=true&include_ext_media_color=true&include_ext_media_availability=true&include_ext_sensitive_media_warning=true&include_ext_trusted_friends_metadata=true&send_error_codes=true&simple_quoted_tweet=true&count=${count}&include_page_configuration=true&initial_tab_id=${initial_tab_id}&entity_tokens=false&ext=mediaStats%2ChighlightedLabel%2ChasNftAvatar%2CvoiceInfo%2Cenrichments%2CsuperFollowMetadata%2CunmentionInfo%2CeditControl%2Ccollab_control%2Cvibe${cookie.length ? '%2CbirdwatchPivot' : ''}`, guest_token, cookie, 1).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}


// COOKIE REQUIRED
const getFollowingOrFollowers = async (uid = '0', guest_token = {}, count = false, type = 'Followers', cookie) => {
  if (!guest_token.success) {
    guest_token = await getToken(1)
  }
  count = count || 20
  const graphqlVariables = {
    userId: uid,
    count: count,
    includePromotedContent: false,
    withSuperFollowsUserFields: true,
    withDownvotePerspective: false,
    withReactionsMetadata: false,
    withReactionsPerspective: false,
    withSuperFollowsTweetFields: true,
    __fs_interactive_text: false,
    __fs_responsive_web_uc_gql_enabled: false,
    __fs_dont_mention_me_view_api_enabled: false
  }

  return await new Promise((resolve, reject) => {
    coreFetch("https://api.twitter.com/graphql/" + graphqlQueryIdList[type]["queryId"] + `/${type}?` + (new URLSearchParams({variables: JSON.stringify(graphqlVariables), features: JSON.stringify(getGraphqlFeatures(type))}).toString()), guest_token, cookie).then(response => {
      resolve(response)
    }).catch(e => {
      reject(e)
    })
  })
}

const getPollResult = async (tweet_id = '', guest_token = {}) => {
  if (!tweet_id) {
    return {code: 403, message: 'Invalid tweet id', data: []}
  }
  let tmpTweet = await getConversation(tweet_id, guest_token, true)
  
  tmpTweet = path2array("tweets_contents", tmpTweet.data)
  if (!tmpTweet) {
    return {code: 404, message: "No tweets", data: []}
  }
  
  const tweetItem = path2array("tweet_content", tmpTweet.filter(tmpTweetItem => tmpTweetItem.entryId === "tweet-" + tweet_id)[0]??[])
  const cardInfo = path2array("tweet_card_path", tweetItem)
  if (cardInfo && String(path2array("tweet_card_name", cardInfo)).startsWith('poll')) {
    const data = []
    const tmpPollKV = Object.fromEntries(cardInfo.binding_values.map(binding_value => [binding_value.key, binding_value.value]))
    for(let x = 1; x <= 4; x++) {
      if (!tmpPollKV["choice" + x + "_count"]) {
        break
      }
      data.push(tmpPollKV["choice" + x + "_count"].string_value)
    }
    return {code: 200, message: "Success", data}
  } else {
    return {code: 403, message: "Invalid card type", data: []}
  }
}

const getImage = async (path = '', headers = {}) => {
  if (path === '') {
    return ''
  }
  return axios.get(path, {
    responseType: (typeof process === 'undefined' || (process?.browser ?? false)) ? 'arrayBuffer' : 'arraybuffer',
    headers
    //timeout: 10000
  })
}

export {getToken, coreFetch, getUserInfo, getVerifiedAvatars, getRecommendations, getMediaTimeline, getTweets, getConversation, getEditHistory, getPollResult, getAudioSpace, getBroadcast, getLiveVideoStream, getTypeahead, getArticle, getTranslate, getTrends, getFollowingOrFollowers, getImage, Authorization}