const test = require('ava')
const MonitorServer = require('../../lib/monitoring')

test('addPreControllersMiddlewares does not add domain fix if MONITOR_DOMAIN_FIX_DISABLED is set', (t) => {
  const server = {
    listening: false,
  }
  const app = {
    use: () => {
    },
  }

  process.env.MONITOR_DOMAIN_FIX_DISABLED = true

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  t.is(monitor.domainFix, undefined)
  monitor.addPreControllersMiddlewares(app)
  t.is(monitor.domainFix, undefined)

  process.env.MONITOR_DOMAIN_FIX_DISABLED = undefined
})
