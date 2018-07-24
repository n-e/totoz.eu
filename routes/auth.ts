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
        // req.logout is not instant because of the postgres session
        // store but it doesn't provide a callback so we
        // save the session again to work around that
        if (req.session)
            req.session.save(cb => res.redirect('/'))
        else
            res.redirect('/')
      });
      
      return router
    }

export default get_router