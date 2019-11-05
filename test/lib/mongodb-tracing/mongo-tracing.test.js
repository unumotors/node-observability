/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
/**
 * Copyright 2018, OpenCensus Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED = true
// Commit: https://github.com/census-instrumentation/opencensus-node/commit/79d10bc3ddb8502959e23f046c04a154d444114e

const core_1 = require('@opencensus/core')
const assert = require('assert')
const mongodb = require('mongodb')
const _1 = require('../../../lib/mongodb-tracing')
const test = require('ava')

/** Collects ended root spans to allow for later analysis. */
const SpanVerifier = (function() {
  function SpanVerifier() {
    this.endedSpans = []
  }
  SpanVerifier.prototype.onStartSpan = function() { }
  SpanVerifier.prototype.onEndSpan = function(span) {
    this.endedSpans.push(span)
  }
  return SpanVerifier
}())
/**
 * Access the mongodb collection.
 * @param url The mongodb URL to access.
 * @param dbName The mongodb database name.
 * @param collectionName The mongodb collection name.
 */
function accessCollection(url, dbName, collectionName) {
  return new Promise(function(resolve, reject) {
    mongodb.MongoClient.connect(url, function connectedClient(err, client) {
      if (err) {
        reject(err)
        return
      }
      var db = client.db(dbName)
      var collection = db.collection(collectionName)
      resolve({ client, collection })
    })
  })
}
/**
 * Asserts root spans attributes.
 * @param rootSpanVerifier An instance of rootSpanVerifier to analyse RootSpan
 * instances from.
 * @param expectedName The expected name of the first root span.
 * @param expectedKind The expected kind of the first root span.
 */
function assertSpan(rootSpanVerifier, expectedName, expectedKind, t) {
  t.is(rootSpanVerifier.endedSpans.length, 2)
  t.is(rootSpanVerifier.endedSpans[1].spans.length, 1)
  t.is(rootSpanVerifier.endedSpans[1].spans[0].name, expectedName)
  t.is(typeof rootSpanVerifier.endedSpans[1].spans[0].attributes, 'object')
  t.is(typeof rootSpanVerifier.endedSpans[1].spans[0].attributes.cmd, 'string')
  t.notThrows(() => {
    JSON.parse(rootSpanVerifier.endedSpans[1].spans[0].attributes.cmd)
  })
  t.is(rootSpanVerifier.endedSpans[1].spans[0].kind, expectedKind)
}

var URL = 'mongodb://localhost:27017'
var DB_NAME = 'opencensus-tests'
var COLLECTION_NAME = 'test'
var VERSION = process.versions.node
var tracer = new core_1.CoreTracer()
var rootSpanVerifier = new SpanVerifier()
var client
var collection

test.serial.before(async() => {
  tracer.start({ samplingRate: 1 })
  tracer.registerSpanEventListener(rootSpanVerifier)
  _1.plugin.enable(mongodb, tracer, VERSION, {}, '')
  try {
    const result = await accessCollection(URL, DB_NAME, COLLECTION_NAME)
    client = result.client
    collection = result.collection
  } catch (error) {
    console.log('Skipping test-mongodb. Could not connect. Run MongoDB to test')
    throw error
  }
})

test.serial.beforeEach.cb((t) => {
  rootSpanVerifier.endedSpans = []
  // Non traced insertion of basic data to perform tests
  var insertData = [{ a: 1 }, { a: 2 }, { a: 3 }]
  collection.insertMany(insertData, function() {
    t.end()
  })
})

test.serial.afterEach.cb((t) => {
  collection.deleteOne({}, t.end)
})

test.serial.after(() => {
  if (client) {
    client.close()
  }
})
/** Should intercept query */
test.serial.cb('Instrumenting query operations should create a child span for insert', (t) => {
  var insertData = [{ a: 1 }, { a: 2 }, { a: 3 }]
  tracer.startRootSpan({ name: 'insertRootSpan' }, function(rootSpan) {
    collection.insertMany(insertData, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query.insert`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})

test.serial.cb('Instrumenting query operations should create a child span for update', (t) => {
  tracer.startRootSpan({ name: 'updateRootSpan' }, function(rootSpan) {
    collection.updateOne({ a: 2 }, { $set: { b: 1 } }, function(err,) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query.update`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})

test.serial.cb('Instrumenting query operations should create a child span for remove', (t) => {
  tracer.startRootSpan({ name: 'removeRootSpan' }, function(rootSpan) {
    collection.deleteOne({ a: 3 }, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.query.remove`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})


/** Should intercept cursor */
test.serial.cb('Instrumenting cursor operations should create a child span for find', (t) => {
  tracer.startRootSpan({ name: 'findRootSpan' }, function(rootSpan) {
    collection.find({}).toArray(function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.${COLLECTION_NAME}.cursor`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})

/** Should intercept command */
test.serial.cb('Instrumenting cursor operations should create a child span for create index', (t) => {
  tracer.startRootSpan({ name: 'indexRootSpan' }, function(rootSpan) {
    collection.createIndex({ a: 1 }, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.$cmd.createIndexes`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})


// There is some kind of bug with the $cmd.count queries, skipping
test.serial.cb.skip('Instrumenting cursor operations should create a child span for count', (t) => {
  tracer.startRootSpan({ name: 'countRootSpan' }, function(rootSpan) {
    collection.count({ a: 1 }, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      rootSpan.end()
      assert.ifError(err)
      assertSpan(rootSpanVerifier, `${DB_NAME}.$cmd.count`, core_1.SpanKind.SERVER, t)
      t.end()
    })
  })
})


test.serial.cb('Removing Instrumentation should not create a child span for query', function(t) {
  _1.plugin.applyUnpatch()
  var insertData = [{ a: 1 }, { a: 2 }, { a: 3 }]
  tracer.startRootSpan({ name: 'insertRootSpan' }, function(rootSpan) {
    collection.insertMany(insertData, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 0)
      rootSpan.end()
      assert.ifError(err)
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      assert.strictEqual(rootSpanVerifier.endedSpans[0].spans.length, 0)
      t.end()
    })
  })
})

test.serial.cb('Removing Instrumentation should not create a child span for cursor', (t) => {
  _1.plugin.applyUnpatch()
  tracer.startRootSpan({ name: 'findRootSpan' }, function(rootSpan) {
    collection.find({}).toArray(function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 0)
      rootSpan.end()
      assert.ifError(err)
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      assert.strictEqual(rootSpanVerifier.endedSpans[0].spans.length, 0)
      t.end()
    })
  })
})

test.serial.cb('Removing Instrumentation should not create a child span for command', (t) => {
  _1.plugin.applyUnpatch()
  tracer.startRootSpan({ name: 'indexRootSpan' }, function(rootSpan) {
    collection.createIndex({ a: 1 }, function(err) {
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 0)
      rootSpan.end()
      assert.ifError(err)
      assert.strictEqual(rootSpanVerifier.endedSpans.length, 1)
      assert.strictEqual(rootSpanVerifier.endedSpans[0].spans.length, 0)
      t.end()
    })
  })
})
