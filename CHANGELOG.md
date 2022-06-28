# 2.0.0

### Breaking changes

* Initialize observability before package import
* Remove API support for sentry.beforeSend

### Migrate to v2

* Set environment variables for initializing service. Following is the minimum configuration that is required (see https://gitlab.unueng.com/infrastructure/node-observability#env-settings for all env settings):
```yaml
env:
- name: OBSERVABILITY_SERVICE_NAME
  value: "__SERVICE_NAME__"
- name: SENTRY_DSN
  value: "__PUBLIC_DSN__"
```

* Remove call to initialize observability in service
```js
// Before
const observability = require('@infrastructure/observability').init({
  serviceName: '__SERVICE_NAME__', // DO NOT prefix by env
  sentry: {
    dsn: '__SENTRY_DSN__',
  },
})

// After
const observability = require('@infrastructure/observability')
```

# 1.3.0

* Update packages to latest minor versions

# 1.2.0

* Remove express from tracing by default

# 1.1.0

* Upgrade opentelemtry core libs
* Upgrade @sentry/node to 6.17.9
* Upgrade prom-client to 14.0.1
* Upgrade http-errors to 2.0.0
* Upgrade prom-client to 14.0.1
* Updgrade unleash-client to  3.12.0

## Configuration changes
* requires you to adjust the TRACING_URI from `http://localhost:55681/v1/trace` to `http://localhost:4318/v1/traces` when using collector `0.43.0` https://github.com/open-telemetry/opentelemetry-collector/blob/main/CHANGELOG.md#v0430-beta

* Requires node:14.15
* Supports node:16

# 1.0.2

* Remove AMQP url from publish traces

# 1.0.1

* Add recordException() to tracing, which enables recording exceptions

# 1.0.0

* Replaced Opencensus with OpenTelemtry

# 0.4.0

* Added the GitLab Feature Flags feature

# 0.3.1

* Fix a nodejs bug, where using `addPreControllersMiddlewares` could crash the server under high load

Sentry internally uses the domain feature of nodejs (deprecated). This is used to catch all errors in a context. These domains are kept inside a js map using a weak reference. If the number of requests increases strongly, something is garbage collecting these weak references before the code can add a reference to it. When it then tries to access it, it is referencing an undefined, which then has no .get.

See nodejs core issue https://github.com/nodejs/node/issues/30122

# 0.3.0

* Fix Sentry error handler configuration: it now creates Sentry alerts for HTTP errors >500
* Add `addPreControllersMiddlewares`: function to configure the handlers that have to be set **before** the controllers in an Express app (i.e. Sentry request and tracing handlers)
* Add `addPostControllersMiddlewares`: function to configure the handlers that have to be set **after** the controllers in an Express app (i.e. Sentry error handler)

## Breaking changes
* `observeServer(server, app)` becomes just `observeServer(server)`: it doesn't add any handler to the Express application, hence it just accept `server` as argument

# 0.2.8

* Update dependencies with vulnerabilities

# 0.2.7

* Fix tracing ignore regex to match both `/-/ping` and `/-/ping/`

# 0.2.6

* Add shortcut for getting current root span.  `observability.tracing.currentRootSpan()`
* Add short cut for adding observability.tracing.addRootSpanAttribute('tag', 'some tag content')

# 0.2.5

* Fix issue of observeServer using jaeger header instead of opencencus to retrieve trace id

# 0.2.4

* Using observeServer now parses trace ids in the Jaeger propagation format from requests and adds a "trace_id" tag to Sentry errors
* observeServer now supports multiple servers

# 0.2.3

* Added default attribute "environment" to all traces. Defaults to "development" and is overwritten by APP_ENV

# 0.2.2

* Ignoring multiple monitoring endpoints in tracing to not spam tracing. See README for details.

# 0.2.1

* Fix debug logs being enabled by default

# 0.2.0

* Add mongodb tracing to opencensus. See README for details.
* Bump sentry to 5.7.1 fixes https://npmjs.com/advisories/1184

# 0.1.0

Added opencensus tracing. See README for details.

# 0.0.6

## Improvements
* Only include index.js and lib/ in npm package
* Automatically init (with default values) when `NODE_ENV=test` mode, allow for unit tests to be run with out manually doing hacks
* Do not start and bind internal monitoring server when `NODE_ENV=test`

# 0.0.5

## Improvements
* Better handle `unhandledPromises` by clearing sentry's queue before exit
* Automatically install  Sentry's `errorHandler` in `monitoring.observeServer`

## BREAKING CHANGES:
* If `monitoring.observeServer(server, app)` is called after any other express middleware is added it
throws an exception

# 0.0.4

## BREAKING CHANGES:

* Rename `monitoring.bindServer(server)` -> `monitoring.observeServer(server, app)`
* **Remove tracing support for now!** This means automatic tracing has been removed as well as `tracer` property

## Improvements
* Automatically install Sentry handler to express if you pass it into `monitoring.observeServer(server, app)`
* Better shutdown handling
* Allow `liveness` and `readiness` checks to return promises OR throw an Error to stop


## Changes
* Adds more tests
* Better docs and example

# 0.0.3

## Adds
* Adds ability to put sentry in debug mode via SENTRY_DEBUG env flag
* Adds unhandled promise handler that prints the error and exits the app with status 1
* This is required because sentry installs its own unhandled promise handler which swallows the errors in dev mode. Also on an unhandled promise we * should rather exit. Chances are HIGH the application will be in an unusable state if this happens

## Removes

* NA

## Changes
Adds more tests for metrics and monitoring
