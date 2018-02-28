// Entry Point for the totoz server

import express = require('express')
import router from './routes'

// Environment variables
const port = +(process.env['PORT'] || 3000)
const hostname = process.env['HOSTNAME'] || '127.0.0.1'

const app = express()

app.set('view engine','pug')

app.use(express.static('static'))
app.use('/', router)

app.listen(port,hostname)