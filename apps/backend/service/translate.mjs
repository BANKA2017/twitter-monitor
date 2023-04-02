import express from 'express'
import { ApiLocalTranslate, ApiOfficialTranslate, ApiPredict, ApiTranslate } from '../CoreFunctions/translate/Translate.mjs'

const translate = express()

//translate
translate.get('/local/', ApiLocalTranslate)
translate.post('/online/', ApiTranslate)
translate.get('/predict/', ApiPredict)
translate.get('/', ApiOfficialTranslate)
export default translate