import bodyParser from 'body-parser'
import express from 'express'
import { Server } from 'http'
import routes from './routes'
const cors = require('cors')
const winston = require('winston')
const expressWinston = require('express-winston')

// import hpp from 'hpp'
// import xXssProtection from 'x-xss-protection'
require('dotenv').config()
const app = express()
const port = process.env.PORT || '5000'
app.use(cors())
app.options('*', cors())  // enable pre-flight
// Add extra config to solve CROS prob.
// TODO: check if its safe!!!
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(bodyParser.json())

export const server = Server(app)

const infoLogger = expressWinston.logger({
  transports: [new winston.transports.File({ filename: 'combined.log' })],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  expressFormat: true
})


const errorLogger = expressWinston.errorLogger({
  transports: [new winston.transports.File({ filename: 'combined.log' })],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  expressFormat: true
})

app.use(infoLogger)
app.use('/', routes)
app.use(errorLogger)


/* ----------  Errors Handeler ---------- */
app.use((err, req, res, next) => {
  next(err)
})

process.on('unhandledRejection', error => {
  // Will print 'unhandledRejection err is not defined'
  console.log('unhandledRejection', error)
})
server.listen(port)

exports.app = app
exports.server = server
