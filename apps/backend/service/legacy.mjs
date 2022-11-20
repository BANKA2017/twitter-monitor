import express from 'express'
import { ApiLegacyData, ApiLegacyInfo, ApiLegacySearch, ApiLegacyTag, ApiLegacyTranslate, ApiLegacyTweets } from '../CoreFunctions/legacy/Legacy.mjs'

const legacy = express()

//v1api
legacy.get('/info/', ApiLegacyInfo)
legacy.get('/tweets/', ApiLegacyTweets)
legacy.get('/data/', ApiLegacyData)
legacy.get('/tag/', ApiLegacyTag)
legacy.get('/search/', ApiLegacySearch)
legacy.get('/translate/',ApiLegacyTranslate)

export default legacy