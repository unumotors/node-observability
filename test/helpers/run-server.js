const { init, monitoring } = require('../../index')

init({
  // This allows us to wait for the http server
  monitoring: {
    externalHttp: true
  },
  sentry: {
    // dsn: 'https://foo.com'
  }
})


const http = require('http')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.send('ok')
})

const server = http.createServer(app)
monitoring.bindHttpServer(server)


setTimeout(function() {
  console.log('starting to listen')
  server.listen(3000)
}, 3000)
