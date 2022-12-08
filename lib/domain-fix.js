const asyncHooks = require('async_hooks')

const strongReferences = new Map()

/**
 * This is a hack to keep strong references to all created domains.
 *
 * Ref: https://unumotors.atlassian.net/wiki/spaces/SW/pages/2992046087/2021-06-07+Scooter+service+outage
 * Ref: https://github.com/nodejs/node/issues/30122
 *
 * Sentry internally uses the domain feature of nodejs (deprecated).
 * This is used to catch all errors in a context. These domains are kept inside a js map using a weak reference.
 * If the number of requests increases strongly, something is garbage collecting these weak
 * references before the code can add a reference to it.
 * When it then tries to access it, it is referencing an undefined, which then has no .get.
 *
 * The relevant code in nodejs https://github.com/nodejs/node/blob/v12.13.0/lib/domain.js#L57 does only keep
 * a weak reference and that seems to cause this issue bug.
 *
 * By creating a completely separate strong reference to all created domains ourselves, we prevent garbage collection to
 * remove the domains.
 */
asyncHooks.createHook({
  init(id) {
    if (process.domain !== null && process.domain !== undefined) {
      strongReferences.set(id, process.domain)
    }
  },
  destroy(asyncId) {
    strongReferences.delete(asyncId)
  },
}).enable()

module.exports = { strongReferences }
