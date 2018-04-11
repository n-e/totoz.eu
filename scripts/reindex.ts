import {index_ngram, all_totozes_slow, totoz_tags, index_byuser} from '../model/totoz'
import redis = require('redis')

/*
    Create the indices in the redis database
    Note: this only needs to be run once when creating the database
    See model/SCHEMA.md for details on the indices
*/

// CAUTION : if we change the index, the post-index search filters might need to be adjusted
async function index() {
    const totozes = await all_totozes_slow()
    for (let t of totozes) {
        await index_ngram(t,t)

        const tags = await totoz_tags(t)
        for (let tt of tags)
            await index_ngram(tt,t)
        
        await index_byuser(t)
    }
}

index()
    .then(()=>console.log('finished'))
    .catch((reason)=>console.log(reason))