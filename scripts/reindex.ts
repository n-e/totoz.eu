import {all_totozes_slow,index_2gram} from '../model/totoz'
import redis = require('redis')

const client = redis.createClient()

all_totozes_slow(client,(err,totozes) => {
    totozes.forEach((t,i) => {
        index_2gram(client,t,err=>{})
    })
})