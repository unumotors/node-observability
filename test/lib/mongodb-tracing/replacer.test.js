const test = require('ava')
const replacer = require('../../../lib/mongodb-tracing/replacer')

test('replacer does work as expected', t => {
  const test = {
    password: 'password1',
    user: 'user2',
    sub: {
      password: 'password2',
      user: 'user2'
    }
  }
  const maskedCmd = JSON.parse(JSON.stringify(test, replacer))
  t.is(maskedCmd.password, '[redacted]')
  t.is(maskedCmd.user, test.user)
  // Works recursively
  t.is(maskedCmd.sub.user, test.sub.user)
  t.is(maskedCmd.sub.password, '[redacted]')
})
