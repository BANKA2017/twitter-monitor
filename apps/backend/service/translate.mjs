import express from 'express'
import { ApiLocalTranslate, ApiPredict } from '../CoreFunctions/translate/Translate.mjs'
import { ApiOfficialTranslate, ApiTranslate } from '../CoreFunctions/translate/OnlineTranslate.mjs'

const translate = express()

//translate
translate.get('/local/', ApiLocalTranslate)
translate.post('/online/', ApiTranslate)
translate.get('/predict/', ApiPredict)
translate.get('/', ApiOfficialTranslate)
export default translate