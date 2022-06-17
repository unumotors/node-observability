/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
const test = require('ava')

const Tracing = require('../../lib/tracing')
const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base')
const { Joi } = require('celebrate')
const api = require('@opentelemetry/api')

// Tracing needs to go before the imports (as it does when importing node-observabilty)
const traceExporter = new InMemorySpanExporter()
const tracing = new Tracing({
  enabled: true,
  serviceName: 'unit-test-service',
  traceExporter
})

let resolve
const promise = new Promise(res => resolve = res)
tracing.start().then(resolve)

const express = require('express')
const got = require('got')
const taube = require('@cloud/taube')
const mongoose = require('mongoose')
const http = require('http')
const io = require('socket.io')
const ioClient = require('socket.io-client')

taube.http.init()

const schema = new mongoose.Schema({
  name: String
}, { timestamps: true })

const Model = mongoose.model('Data', schema)

test.before(async() => {
  // initializing tracing takes a few second, we wait for it in this test in order for traces to immediatly available
  await promise
  // Setup mongo
  const randomDbName = Math.random().toString(36).substring(7)
  const mongoConnectionString = process.env['MONGO_CONNECTION_STRING'] || 'mongodb:27017'
  await mongoose.connect(`mongodb://${mongoConnectionString}/test-${randomDbName}`, {
    useNewUrlParser: true
  })
})

test.beforeEach(() => {
  traceExporter.reset()
})

test.serial('Does create traces for Taube Client/Server requests', async t => {
  const server = new taube.Server({})

  server.get('/:id', {
    params: Joi.object().keys({
      id: Joi.string()
    })
  }, (req) => {
    tracing.addRootSpanAttribute('banana.color', 'yellow')
    return req.params
  })

  const client = new taube.Client({
    uri: 'http://localhost'
  })

  const res = await client.get('/unit-test')
  t.is(res.id, 'unit-test')

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()


  const requestHandlerSpan = finishedSpans.find(span => span.name == 'GET /:id')
  t.is(requestHandlerSpan.attributes['http.target'], '/unit-test')
  t.is(requestHandlerSpan.attributes['banana.color'], 'yellow', 'should add custom attributes')

  // also sets resources
  t.is(requestHandlerSpan.resource.attributes['service.name'], 'unit-test-service')
  t.is(requestHandlerSpan.resource.attributes['deployment.environment'], 'test')
})

test.serial('Does create traces for express requests', async t => {
  const PORT = 6554

  const app = express()

  const router = new express.Router()

  router.get('/path', async(req, res) => {
    tracing.addAttribute('banana.color', 'yellow')
    res.send('')
  })

  app.use('/router', router)

  let resolve
  const promise = new Promise(res => resolve = res)
  const server = app.listen(PORT, () => {
    console.log(`Listening for requests on http://localhost:${PORT}`)
    resolve()
  })
  await promise

  await got.get(`http://localhost:${PORT}/router/path`)

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  const requestHandlerSpan = finishedSpans.find(span => span.name == 'GET /router/path')
  t.is(requestHandlerSpan.attributes['http.path'], '/router/path', 'added custom attribute http.path')
  t.is(requestHandlerSpan.attributes['banana.color'], 'yellow', 'should add custom attributes')

  // express is disabled by default
  t.is(requestHandlerSpan.attributes['http.route'], undefined)

  let resolve2
  const promise2 = new Promise(res => resolve2 = res)
  server.close(() => {
    resolve2()
  })
  await promise2
})

test.serial('recordException() does add exception events to traces', async t => {
  const PORT = 6554

  const app = express()

  app.get('/path', async(req, res) => {
    tracing.recordException(new Error('some error'))
    res.send('')
  })

  let resolve
  const promise = new Promise(res => resolve = res)
  const server = app.listen(PORT, () => {
    console.log(`Listening for requests on http://localhost:${PORT}`)
    resolve()
  })
  await promise

  await got.get(`http://localhost:${PORT}/path`)

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  const requestHandlerSpan = finishedSpans.find(span => span.name == 'GET /path')
  t.is(requestHandlerSpan.events[0].attributes['exception.message'], 'some error')
  t.is(requestHandlerSpan.events[0].attributes['exception.type'], 'Error')
  t.true(requestHandlerSpan.events[0].attributes['exception.stacktrace'].includes('Error: some error'))

  let resolve2
  const promise2 = new Promise(res => resolve2 = res)
  server.close(() => {
    resolve2()
  })
  await promise2
})

test.serial('Does create traces for MONGO queries inside express requests', async t => {
  const PORT = 6553

  const app = express()

  app.get('/path', async(req, res) => {
    res.send('')
    await Model.findOneAndUpdate({
      name: 'banana'
    }, {
      name: 'banana'
    }, { upsert: true })
  })

  let resolve
  const promise = new Promise(res => resolve = res)
  const server = app.listen(PORT, () => {
    resolve()
  })
  await promise

  await got.get(`http://localhost:${PORT}/path`)

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  const mongoSpan = finishedSpans.find(span => span.name == 'mongoose.Data.findOneAndUpdate')
  t.truthy(mongoSpan.attributes['net.peer.name'])

  let resolve2
  const promise2 = new Promise(res => resolve2 = res)
  server.close(() => {
    resolve2()
  })
  await promise2
})

test.serial('Does create traces for Taube Queue/worker', async t => {
  const { Queue, Worker } = taube.QueueWorkerExponentialRetries

  const queue = new Queue('example-queue-1', {
    brokerUri: 'amqp://guest:guest@localhost'
  })

  const worker = new Worker('example-queue-1', {
    worker: {
      prefetch: 1 // How many messages are consumed/fetched at once
    },
    brokerUri: 'amqp://guest:guest@localhost',
    errorHandler: ({
      error
    }) =>
      t.fail(error)
  })

  let resolve
  const promise = new Promise(res => resolve = res)
  worker.consume(async(data) => {
    tracing.addRootSpanAttribute('banana.color', 'yellow')
    resolve(data)
  })

  await queue.enqueue({ some: 'data' })
  const data = await promise

  t.deepEqual(data, { some: 'data' })

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  // Publish
  const publishSpan = finishedSpans.find(span => span.name == '<default> -> example-queue-1 send')
  t.is(
    publishSpan.attributes['messaging.url'], undefined,
    'should be removed by custom consumeHook() in AmqplibInstrumentation() configuration'
  )
  // Recieve
  const requestHandlerSpan = finishedSpans.find(span => span.name == 'example-queue-1 process')
  t.is(requestHandlerSpan.attributes['messaging.rabbitmq.routing_key'], 'example-queue-1')
  t.is(
    requestHandlerSpan.attributes['messaging.url'], undefined,
    'should be removed by custom consumeHook() in AmqplibInstrumentation() configuration'
  )
  t.is(requestHandlerSpan.attributes['banana.color'], 'yellow', 'should add custom attributes to trace')
})

test.serial('Does create traces for mongoose queries', async t => {
  await Model.findOneAndUpdate({
    name: 'banana'
  }, {
    name: 'banana'
  }, { upsert: true })

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  const mongoSpan = finishedSpans.find(span => span.name == 'mongoose.Data.findOneAndUpdate')
  t.truthy(mongoSpan.attributes['net.peer.name'])
  // eslint-disable-next-line max-len
  t.is(mongoSpan.attributes['db.statement'], '', 'should be empty if env variable is not passed')
})

test.serial('currentTraceId() returns value if available', async t => {
  let resolve
  const promise = new Promise(res => resolve = res)
  // fake an active span
  const span = tracing.tracer.startSpan('currentTraceId() test')
  api.context.with(api.trace.setSpan(api.context.active(), span), () => {
    const res = tracing.currentTraceId()
    resolve(res)
  })
  const data = await promise
  t.is(data.length, 32)

  span.end()
})

test.serial('currentRootSpan() returns value if available', async t => {
  t.plan(2)
  let resolve
  const promise = new Promise(res => resolve = res)
  // fake an active span
  const span = tracing.tracer.startSpan('currentTraceId() test')
  api.context.with(api.trace.setSpan(api.context.active(), span), () => {
    const res = tracing.currentRootSpan()
    const res2 = tracing.currentSpan()
    t.deepEqual(res, res2)
    resolve(res)
  })
  const data = await promise
  t.is(data.constructor.name, 'Span')

  span.end()
})

test.serial('Does create traces for socket.io requests', async t => {
  const PORT = 4041

  const app = express()
  const server = http.createServer(app)
  const ioServer = io(server)

  // wait for server to be listening
  let resolve
  const promise = new Promise(res => resolve = res)
  server.listen(PORT, function() {
    resolve()
  })
  await promise

  /**
   * The order of events/traces we are looking for:
   *
   * 1. Client connect to server => connection event
   * 2. Server emits "v1/snapshot" => emit event
   * 3. Client receives and emits "v1/snapshot" => receive event
   */
  ioServer.on('connection', function(socket) {
    socket.on('v1/snapshot', (data, acknowledge) => {
      acknowledge(data)
    })
    socket.emit('v1/snapshot', { banana: 'yellow' })
  })

  const client = ioClient.connect(`http://localhost:${PORT}`, { transports: ['websocket'] })

  let resolve2
  const promise2 = new Promise(res => resolve2 = res)
  client.on('v1/snapshot', (data) => {
    t.deepEqual(data, { banana: 'yellow' })
    client.emit('v1/snapshot', { channel: 'v1/snapshot' }, (ack) => {
      resolve2(ack)
    })
  })
  const res = await promise2
  t.deepEqual(res, { channel: 'v1/snapshot' })

  await new Promise(resolve => setTimeout(resolve, 1000)) // flaky otherwise
  // Make the internal batch processor send the traces immediately (and not wait for 5 seconds)
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  // received a connection
  const connectSpan = finishedSpans.find(span => span.name == 'connection receive')
  t.is(connectSpan.attributes['messaging.operation'], 'receive')
  t.is(connectSpan.attributes['messaging.socket.io.event_name'], 'connection')

  // Emitted the v1/snapshot
  const serverEmitSpan = finishedSpans.find(span =>
    span.attributes['messaging.destination_kind'] == 'topic' &&
    span.attributes['messaging.socket.io.event_name'] == 'v1/snapshot')
  t.is(serverEmitSpan.attributes['messaging.destination'], '/')

  // Receive v1/snapshot in server
  const receiveSpan = finishedSpans.find(span => span.name == 'v1/snapshot receive')
  t.is(receiveSpan.attributes['messaging.socket.io.event_name'], 'v1/snapshot')
})
