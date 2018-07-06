import {highlightTerms} from './utils'
import assert = require('assert')
const test = require('test')

const tests = [
    [['',[],'plop'],''],
    [['',['x'],'plop'],''],
    [['',['x','y'],'plop'],''],
    [['',['x','yy'],'plop'],''],
    [['x',['x','yy'],'plop'],'<span class="plop">x</span>'],
    [['xxx',['x','xx'],'plop'],'<span class="plop">x</span><span class="plop">x</span><span class="plop">x</span>'],
]

const test_fns = tests.map(t => ({
    name: `test: highlightTerms(${JSON.stringify(t[0])}) == ${JSON.stringify(t[1])}`,
    fn:() => assert.equal(highlightTerms.apply(undefined,t[0]),t[1])}))
const testObj:{[idx:string]:()=>void} = {}
test_fns.forEach(t => testObj[t.name] = t.fn)
test.run(testObj)