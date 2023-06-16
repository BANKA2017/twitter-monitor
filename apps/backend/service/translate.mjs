import express from 'express'
import { ApiLocalTranslate, ApiPredict } from '../CoreFunctions/translate/Translate.mjs'
import { ApiOfficialTranslate, ApiTranslate } from '../CoreFunctions/translate/OnlineTranslate.mjs'

const translate = express()

//translate
translate.get('/local/', ApiLocalTranslate)
translate.post('/online/', async (req, res) => {
    req.postBody = new Map(Object.entries(req.body))
    const _res = await ApiTranslate(req, req.env)
    res.json(_res.data)
})
translate.get('/predict/', ApiPredict)
//translate.get('/', async (req, res) => {
//    const _res = await ApiOfficialTranslate(req, req.env)
//    res.json(_res.data)
//})
export default translate
