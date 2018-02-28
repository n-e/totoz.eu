// All the routes for the totoz.eu server

import express = require('express')

const routes = express.Router()

routes.get('/',(req, res, next) => {
    res.render('index')
})

export default routes