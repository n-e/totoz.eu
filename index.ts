// Entry Point for the totoz server

import express = require('express')
import path = require('path')
import router from './routes'

// Misc. functions

// Makes an absolute path from a path relative to the project folder
const absPath = (relPath: string) => path.join(__dirname, relPath)

// Environment variables
const port = +(process.env['PORT'] || 3000)
const hostname = process.env['HOSTNAME'] || '127.0.0.1'

// Setup and run app
const app = express()

app.set('view engine','pug')
app.set('views',absPath('views'))

app.use(express.static(absPath('static')))
app.use('/', router)

app.listen(port,hostname)