import express from 'express'
import { ApiLocalAccount, ApiLocalChart, ApiLocalHashtagRank, ApiLocalSearch, ApiLocalStats, ApiLocalStatus, ApiLocalTag, ApiLocalTrends, ApiLocalTweets, ApiLocalUserInfo } from '../CoreFunctions/local/Local.mjs'

const local = express()

//v3api
local.get('/data/accounts/', ApiLocalAccount)
local.get('/data/userinfo/', ApiLocalUserInfo)

//tweets
local.get('/data/tweets/', ApiLocalTweets)
//for rss
local.get(/rss\/(.*).xml$/, ApiLocalTweets)

//charts
local.get('/data/chart/', ApiLocalChart)
local.get('/data/stats/', ApiLocalStats)
local.get('/data/status/', ApiLocalStatus)
local.get('/data/trends/', ApiLocalTrends)

//hashtag and cashtag
local.get(/^\/data\/(hashtag|symbol)(\/|)$/, ApiLocalTag)
//hashtag rank
local.get('/data/hashtag_rank', ApiLocalHashtagRank)

//search
local.get('/data/search/', ApiLocalSearch)

export default local
