// Entry Point for the totoz server

import express = require('express')
import path = require('path')
import morgan = require('morgan')
import router from './routes'

// Misc. functions

// Makes an absolute path from a path relative to the project folder
const absPath = (relPath: string) => path.join(__dirname, relPath)

// Environment variables
//   NOIMAGES : if true, serve a default image for the totozes. Useful for a
//              dev. environment without the full totoz set.
const port = +(process.env['PORT'] || 3000)
const hostname = process.env['HOSTNAME'] || '127.0.0.1'
const noimages = process.env['NOIMAGES'] ? true : false

// Setup and run app
const app = express()

app.set('view engine','pug')
app.set('views',absPath('../views'))

if(noimages) app.get(/\.gif$/,(req,res)=>res.sendFile(absPath('../static/uxam.gif')))
app.use(express.static(absPath('../static')))
if(app.get('env')=='development') app.use(morgan('tiny'))
app.use('/', router)

app.listen(port,hostname)