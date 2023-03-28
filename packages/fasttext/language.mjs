import { fileURLToPath } from 'url'
import { dirname } from 'path'
import * as fasttext from 'fasttext'
const { FastText, _initFastTextModule } = fasttext

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

await _initFastTextModule()
let ft = new FastText();

const url = __dirname + '/lid.176.ftz'
const model = await ft.loadModel(url)


class LanguageIdentification {
    #model
    constructor() {
        this.#model = model
    }
    GetLanguage = (text = '', count = 5) => {
        return this.getVector(this.#model.predict(text, count, 0.0))
    }
    getVector = (predictions, limit) => {
        let tmpPredictions = []
        limit = limit || Infinity
    
        for (let i=0; i<predictions.size() && i<limit; i++){
            let prediction = predictions.get(i)
            prediction[1] = prediction[1].replace('__label__', '')
            tmpPredictions.push(prediction)
        }
        return tmpPredictions
    }
}

export {model, LanguageIdentification}