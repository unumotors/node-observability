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

module.exports = {
  SpanVerifier
}
