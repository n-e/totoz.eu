import {index_ngram, all_totozes_slow, totoz_tags} from '../model/totoz'
import redis = require('redis')

// CAUTION : if we change the index, the post-index search filters might need to be adjusted
async function index() {
    const totozes = await all_totozes_slow()
    for (let t of totozes) {
        await index_ngram(t,t)

        const tags = await totoz_tags(t)
        for (let tt of tags)
            await index_ngram(tt,t)
    }
}

index()
    .then(()=>console.log('finished'))
    .catch((reason)=>console.log(reason))