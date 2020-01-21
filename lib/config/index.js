const jaegerPropagation = require('@opencensus/propagation-jaeger')

module.exports.tracing = {
  propagation: new jaegerPropagation.JaegerFormat()
}
