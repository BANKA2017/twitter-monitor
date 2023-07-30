import Sequelize from 'sequelize'
import { ACTIVE_SERVICE, SQL_CONFIG } from '../../libs/assets/setting.mjs'
import { Log } from './Core.function.mjs'
// import { TGPush } from './Core.push.mjs'

let dbHandle = {}
for (const service of SQL_CONFIG) {
    if (ACTIVE_SERVICE.includes(service.service)) {
        if (service.dbtype === 'sqlite') {
            dbHandle[service.service] = new Sequelize({
                dialect: 'sqlite',
                storage: service.path,
                transactionType: 'IMMEDIATE',
                logging: false, //console.log,
                define: {
                    timestamps: false
                }
            })
            //dbHandle[service.service].query('PRAGMA journal_mode=WAL;')
        } else {
            dbHandle[service.service] = new Sequelize(service.dbname, service.username, service.password, {
                host: 'localhost',
                dialect: service.dbtype,
                logging: false, //console.log,
                define: {
                    timestamps: false
                }
            })
        }
    }
}

// testing
try {
    for (const service in dbHandle) {
        await dbHandle[service].authenticate()
        Log(false, 'log', `tmv3: Connection has been established successfully. (${service})`)
    }
} catch (error) {
    Log(false, 'error', 'tmv3: Unable to connect to the database:', error)
    //await TGPush("tmv3: Unable to connect to the database #Database")
    process.exit(0)
}

export default dbHandle
