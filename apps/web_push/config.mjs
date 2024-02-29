//--> node.js/deno/bun...
import { existsSync, readFileSync, writeFileSync } from 'fs'
//<--

export default class Config {
    config = {
        twitter: {
            screen_name: '',
            password: '',
            authentication_secret: '',
            retry: 5,
            cookies: {
                auth: '',
                ct0: ''
            }
        },
        auth: '',
        jwk: {},
        autopush: {
            uaid: '',
            channel_id: '',
            remote_settings__monitor_changes: '',
            endpoint: ''
        }
    }
    tweets = []

    //jsRuntime = 'node'
    path = ''
    constructor(path = '.') {
        //this.jsRuntime = 'node'
        this.path = path
    }
    async initData() {
        // precheck
        if (existsSync(this.path + '/config.json')) {
            this.config = JSON.parse(this.readFile(this.path + '/config.json'))
        }
        if (existsSync(this.path + '/tweets.json')) {
            this.tweets = JSON.parse(this.readFile(this.path + '/tweets.json'))
        }
    }
    saveConfig() {
        this.writeFile(this.path + '/config.json', JSON.stringify(this.config, null, 4))
    }
    saveTweets() {
        this.writeFile(this.path + '/tweets.json', JSON.stringify(this.tweets))
    }
    readFile(path = '') {
        return readFileSync(path).toString()
    }
    writeFile(path = '', data = '') {
        try {
            writeFileSync(path, data)
        } catch (e) {
            console.error(e)
        }
    }
}
