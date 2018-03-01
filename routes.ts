// All the routes for the totoz.eu server

import express = require('express')
import redis = require('redis')

const routes = express.Router()
const client = redis.createClient()

routes.get('/',(req, res, next) => {
    client.zrange('totozes',0,499,(err,replies) => {
        res.render('index', {totozes: replies})
    })

})

export default routes