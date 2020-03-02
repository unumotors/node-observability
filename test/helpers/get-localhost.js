const got = require('got')

async function getEndpoint() {
  const res = await got.get('http://localhost:3001/success')
  console.log(res.statusCode)
}

getEndpoint()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
