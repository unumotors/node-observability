const got = require('got')

async function getEndpoints() {
  console.log('get-ing endpoints that should not end up in tracing')
  await got.get('http://localhost:3000/ping')
  await got.get('http://localhost:3000/-/readiness')
  await got.get('http://localhost:3000/-/liveness')
  await got.get('http://localhost:3000/-/ping')
}

getEndpoints()
