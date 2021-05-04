import os from "os"
import { CODE } from "../constants/index"
const Pool = require("pg").Pool;

const createPool = (host, database, user, password, port = process.env.POOL_PORT) => (
    new Pool({
        user: user,
        host: host,
        database: database,
        password: password,
        port: port,
        connectionTimeoutMillis: 3000
    })
);

const pool = createPool(
    process.env.POOL_HOST,
    process.env.POOL_DB_NAME,
    process.env.POOL_USR,
    process.env.POOL_USR
)


var hcInfor = {
    cpus: null,
    rams: {
        total: null,
        free: null,
        unit: "bytes"
    },
    dbConnection: true,
}
const getInfoHC = async (req, res) => {
    let cpu = os.cpus()
    hcInfor.cpus = os.cpus()
    hcInfor.rams = {
        total: os.totalmem(),
        free: os.freemem(),
        unit: "bytes"
    }
    let checked = await checkConnection()
    hcInfor.dbConnection = checked
    res.json({
        code: CODE.SUCCESS,
        data: hcInfor
    })
}
export default {
    getInfoHC
}

const checkConnection = async () => {
    return new Promise(function (resolve, reject) {
        pool.connect((err, client, release) => {
            if (err) {
                resolve(false)
                return
            }
            client.query('SELECT NOW()', (err, result) => {
                release()
                if (err) {
                    resolve(false)
                    return
                }
                resolve(true)
                return
            })
        })
    })
}