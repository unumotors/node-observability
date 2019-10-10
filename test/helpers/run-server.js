// Allow globally setting the Datadog service name
// but still allow overiding in env's
// No way to easily pass functions/config to init
// As this needs to be the first lin
const observability = require('../../index').init({
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // to figure out default configs
  // debug: true,
  // logLevel: 5,
  tracing: {
    enabled: true,
    host: 'localhost'
    // port: 55678
  },
  // This is the default
  // unhandledRejection: {
  //   exitOnError: true
  // },
  // do not reference an env variable
  // we need to use the same sentry dsn across envs
  sentry: {
    // dsn: 'https://na@sentry.com/adf'
  }
})

// https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-exporter-object

// This verifies unhandled promises print error messages
// and exit
// async function moo (){
//   const foo = require("foo/vbar")
// }
// moo()

let failCheck = false
// Liveness check based on if connected to slack or not
// Delay check.
observability.monitoring.addLivenessCheck(async() => {
  if (failCheck) {
    console.log('failed')
    throw new Error('foo')
  }
})

observability.monitoring.addOnSignalHook(async() => {
  console.log('Shutting down')
})

// // Slack
const connectedGauge = new observability.metrics.Gauge({ name: 'connected', help: 'If server is up' })
connectedGauge.set(0)

const http = require('http')
const express = require('express')

const app = express()
const server = http.createServer(app)

// Adds shutdown handlers, liveness checks, and sentry to express
// observeServer must be come before any other middleware in the app
observability.monitoring.observeServer(server, app)

app.get('/test', (req, res) => {
  const data = JSON.stringify({
    todo: 'Buy the milk'
  })

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  }

  const aa = http.request(options, (resp) => {
    let data = ''
    console.log(`statusCode: ${resp.statusCode}`)
    console.log(resp)

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk
    })

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      res.send(data)
    })
  })

  aa.on('error', (error) => {
    res.send(error)
  })

  aa.write(data)
  aa.end()
})

app.get('/', (req, res) => {
  const data = JSON.stringify({
    todo: 'Buy the milk'
  })

  const options = {
    hostname: 'requestbin.net',
    port: 80,
    path: '/r/1o2raj21',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  const aa = http.request(options, (resp) => {
    let data = ''
    //console.log(`statusCode: ${resp.statusCode}`)
    //console.log(resp)

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk
    })

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      res.send(data)
    })
  })

  aa.on('error', (error) => {
    res.send(error)
  })

  aa.write(data)
  aa.end()
})

const { tracer } = observability.tracing

function main() {
  // 4. Create a span. A span must be closed.
  // For any of the web frameworks for which we provide built-in plugins (http,
  // grpc, mongodb etc), a root span is automatically started whenever an
  // incoming request is received (in other words, all middleware already runs
  // within a root span).
  tracer.startRootSpan({ name: 'main' }, rootSpan => {
    for (let i = 0; i < 10; i++) {
      doWork()
    }

    // Be sure to call rootSpan.end().
    rootSpan.end()
  })
}

function doWork() {
  // 5. Start another span. In this example, the main method already started a
  // span, so that'll be the parent span, and this will be a child span.
  const span = tracer.startChildSpan({ name: 'doWork' })

  console.log('doing busy work')
  // for (let i = 0; i <= 40000000; i++) {} // short delay

  // 6. Annotate our span to capture metadata about our operation
  span.addAnnotation('invoking doWork')
  //for (let i = 0; i <= 20000000; i++) {} // short delay

  span.end()
}

main()

setTimeout(function() {
  console.log('starting to listen')
  server.listen(3000)
  connectedGauge.set(1)
}, 1000)
