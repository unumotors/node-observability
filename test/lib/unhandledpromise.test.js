const test = require('ava')
const val = require('../../lib/unhandledpromise')

test('return type of unhandledpromise is empty', t => {
  t.deepEqual(val, {})
})

// we should be testing this but its hard to verify that the global handler fires
// because ava catches the promise too
// test('Catches unabled promises', async t => {
//   t.plan(1)
//   async function moo (){
//     const foo = require("foo/vbar")
//   }
//   await moo()
// })
