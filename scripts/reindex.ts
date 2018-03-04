import {index_2gram, all_totozes_slow} from '../model/totoz'
import redis = require('redis')


async function index() {
    const totozes = await all_totozes_slow()
    for(let t of totozes)
        await index_2gram(t)
}

index()
    .then(()=>console.log('finished'))
    .catch((reason)=>console.log(reason))