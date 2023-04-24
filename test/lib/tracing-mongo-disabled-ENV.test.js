/* eslint-disable no-promise-executor-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
process.env.TRACING_MONGO_DISABLED = 'true'

const test = require('ava')

const { InMemorySpanExporter } = require('@opentelemetry/sdk-trace-base')

// Tracing needs to go before the imports (as it does when importing node-observabilty)
// eslint-disable-next-line import/order
const Tracing = require('../../lib/tracing')

const traceExporter = new InMemorySpanExporter()
const tracing = new Tracing({
  enabled: true,
  serviceName: 'test',
  traceExporter,
})

let resolve
const promise = new Promise((res) => { resolve = res })
tracing.start().then(resolve)

// These NEED to stay here, moving them above tracing.start()
// breaks tracing as it needs to be instrumentalized before importing
// these packages
const taube = require('@cloud/taube')
const mongoose = require('mongoose')

taube.http.init()

const schema = new mongoose.Schema({
  name: String,
}, { timestamps: true })

const Model = mongoose.model('Data', schema)

test.before(async() => {
  // initializing tracing takes a few seconds, we wait for it in this test in order for traces to immediately available
  await promise
  // Setup mongo
  const randomDbName = Math.random().toString(36).substring(7)
  const mongoConnectionString = process.env.MONGO_CONNECTION_STRING || 'mongodb:27017'
  await mongoose.connect(`mongodb://${mongoConnectionString}/test-${randomDbName}`, {
    useNewUrlParser: true,
  })
})

test.beforeEach(() => {
  traceExporter.reset()
})

test.serial('TRACING_MONGO_DISABLED disables mongodb tracing', async(t) => {
  await Model.findOneAndUpdate({
    name: 'banana',
  }, {
    name: 'banana',
  }, { upsert: true })

  await new Promise((resolve1) => setTimeout(resolve1, 1000)) // flaky otherwise
  await tracing.sdk._tracerProviderConfig.spanProcessor.forceFlush()

  const finishedSpans = traceExporter.getFinishedSpans()

  const mongoSpan = finishedSpans.find((span) => span.name == 'mongoose.Data.findOneAndUpdate')
  // eslint-disable-next-line max-len
  t.is(mongoSpan, undefined)
})
