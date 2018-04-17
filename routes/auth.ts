import express = require('express')
import { PassportStatic } from 'passport';

function get_router(passport: PassportStatic) {
    const router = express.Router()

    router.post('/login', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash:true,
    }))
    router.get('/login',(req,res) => {
        res.render('login', {message: req.flash('error')})
    })

    router.use('/', (req,res,next) => {res.locals.user = req.user; next()})

    router.get('/logout', function(req, res){
        req.logout();
        res.redirect('/');
      });
      
      return router
    }

export default get_router