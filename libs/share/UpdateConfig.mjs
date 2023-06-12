import { writeFileSync } from 'node:fs'
import { CONFIG_ID } from '../../libs/assets/setting.mjs'
import V2Config from '../model/twitter_monitor/v2_config.js'
import {createHash} from 'crypto'
import { basePath } from './NodeConstant.mjs'

const ConfigFile = async (config, accountList, force = false) => {
    const stringConfig = JSON.stringify(config)
    //save config.json to local path
    writeFileSync(basePath + '/../libs/assets/config.json', stringConfig)

    // get config from database
    let dbMD5 = await V2Config.findOne({
        attributes: ["md5"],
        where: {
            id: CONFIG_ID
        }
    })
    //generate 
    const configMD5 = createHash('md5').update(stringConfig).digest('hex')//md5.hex(stringConfig)
    if (force || dbMD5 === null || dbMD5.md5 !== configMD5) {
        let newAccountInfo = {
            account_info: {},
            projects: new Set(),
            links: config.links,
            hash: configMD5
        }
        const tmpAccountList = accountList.map(account => account[0])//TODO .sort((a, b) => b.organization - a.organization)
        for (const account of tmpAccountList) {
            if (!(!account?.hidden ?? true)) {continue}
            for (const index in account.projects) {
                if (!newAccountInfo.projects.has(account.projects[index][0])) {
                    newAccountInfo.projects.add(account.projects[index][0])
                    newAccountInfo.account_info[account.projects[index][0]] = {}
                }
                if (!newAccountInfo.account_info[account.projects[index][0]][account.projects[index][1]]) {
                    newAccountInfo.account_info[account.projects[index][0]][account.projects[index][1]] = []
                }
                newAccountInfo.account_info[account.projects[index][0]][account.projects[index][1]].push({
                    name: account.name,
                    display_name: account.display_name,
                    organization: account.organization || false,
                    nsfw: account.nsfw || false,
                    projects: account.projects
                })
            }
        }
        newAccountInfo.projects = [...newAccountInfo.projects]
        V2Config.upsert({
            id: CONFIG_ID,
            data_origin: stringConfig,
            data_output: JSON.stringify(newAccountInfo),
            md5: configMD5,
            timestamp: Math.floor((new Date()) / 1000)
        })
    }
}

export {ConfigFile}