# Observability

An easy way to add high visibility into your nodejs services.

This will do a bunch of things for you that will help ease the deployment of your application into our platform:

* Sentry error handling of unhandled promise rejections and express errors
* Monitoring server for liveness and readiness checks
* Prometheus metrics exporter
* Gitlab feature flags
* OpenTelemetry tracing for all [default instrumentations](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node), Mongoose, RabbitMQ (amqplib) and socket.io

See Table of Contents
* [Usage](#usage)
* [Configuration](#configuration)
* [Features](#features)
* -> [HealthChecks](#healthChecks)
* -> [Sentry](#sentry)
* -> [UnhandledPromises](#UnhandledPromises)
* -> [Tracing](#tracing)
* -> [Metrics](#metrics)

## Usage

  npm install --save @unu/observability

In the first line of your `index.js` include the following. This is because our tracing library auto instruments all other requires

Minimum configuration to get going:
```js
// Needs to be the first thing included in your application
import observability from '@unu/observability'
```

```yaml
env:
# Globally configured service name
# DO NOT prefix by env
# ENV is auto configured via APP_ENV
- name: OBSERVABILITY_SERVICE_NAME
  value: david-observability-run-server
- name: SENTRY_DSN
  value: "__PUBLIC_DSN__"
- name: FEATURE_FLAGS_URL
  value: "__VALUE__"
- name: FEATURE_FLAGS_INSTANCE_ID
  value: "__VALUE__"
```

## Configuration

Currently, there are limited configuration options provided, This is intentional in an attempt to standardize between projects.

The limited options that are provided can either only configured via standard ENV variables only

### Env settings

Required

| Name                         | Description                                                                                                                                                       |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `APP_ENV`                    | Current runtime environment. Supported values are `development`, `test`, `production`                                                                             |
| `NODE_ENV`                   | This is injected as "build" time so into the docker image, Supported values are `development`, `test`, `production`. ONLY for runtime configuration see `APP_ENV` |
| `OBSERVABILITY_SERVICE_NAME` | Name of the current service.                                                                                                                                      |
| `SENTRY_DSN`                 | DSN of Sentry                                                                                                                                                     |


Optional

| Name                                         | Default                             | Description                                                                              |
|----------------------------------------------|-------------------------------------|------------------------------------------------------------------------------------------|
| `MONITORING_PORT`                            | 9090                                | Set monitoring server to custom value                                                    |
| `SENTRY_DEBUG`                               | false                               | Can put sentry in debug mode                                                             |
| `TRACING_EXPRESS_ENABLED`                    | false                               | If tracing is enabled for Express requests                                               |
| `TRACING_URI`                                | http://otel-collector:4318/v1/trace | Otel Collector to send traces to                                                         |
| `TRACING_CAPTURE_MONGO_QUERIES_ENABLED`      | false                               | If set mongo queries will be included in traces. Should not be enabled in production yet |
| `MONITOR_DOMAIN_FIX_DISABLED`                | undefined                           | If set, the domain fix will not be applied                                               |
| `UNHANDLED_REJECTION_EXIT_ON_ERROR_DISABLED` | false                               | If set, disables exit with an error on unhandled promises.                               |
| `FEATURE_FLAGS_INSTANCE_ID`                  | undefined                           | Sets the Feature Flags instance id.                                                      |
| `FEATURE_FLAGS_URL`                          | undefined                           | Sets the Feature Flags url.                                                              |

## Features

List of features we automatically install and configure.

### Health Checks

Provides a custom server listens on port `:9090` that exposes `/-/liveness` and `/-/readiness` endpoints.

### Bind to an existing (express/http) web server

Adds monitoring features to an existing web server (express + http):

- This automatically adds the correct liveness/readiness checks
- Installs shutdown handlers and Sentry error handlers
- Adds middleware that adds a `trace_id` tag to Sentry errors containing the current root trace id

Can be called multiple times with different servers.

```js
var server = http.createServer(app)
observability.monitoring.observeServer(server)

observability.monitoring.addPreControllersMiddlewares(app)

// Setup all the controllers here ...
app.get('/foo',  (req, res) => res.sendStatus(200).end()))
app.get('/bar',  (req, res) => res.sendStatus(200).end()))

observability.monitoring.addPostControllersMiddlewares(app)

// Setup other error handlers here ...
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.code || 500
  const errorMessage = err.message
  res.status(statusCode)
  return res.json({ error: err })
}
```

This also adds a fix to the domain weak reference issue (see lib/domain-fix.js for details). This can be disabled manually using the `MONITOR_DOMAIN_FIX_DISABLED` env variable.

### Adding a custom health check

To add a custom check use the following. You should throw an error you want the checks to report unhealthy

```js
observability.monitoring.addLivenessCheck(() => {
  if (notConnected) {
    throw new Error('Server not running')
  }
})

observability.monitoring.addReadinessCheck(() => {
  if (notConnected) {
    throw new Error('Server not running')
  }
})
```

### Sentry

Configures Sentry error handling. This just catches unhandled exceptions it does not install it into any webserver such as express.

**Important:** this requires that a Sentry DSN is configured in **production**: we don't want to support services without at least exception handling.

Adding to express
```js
// Calling with the http and express server will automatically add Sentry request handlers
// observeServer must be come before any other middleware in the app
observability.monitoring.observeServer(server)
observability.monitoring.addPreControllersMiddlewares(app)

// Setup all the controllers here ...
app.get('/foo',  (req, res) => res.sendStatus(200).end()))
app.get('/bar',  (req, res) => res.sendStatus(200).end()))

// Calling with Express server will add Sentry error handler
observability.monitoring.addPostControllersMiddlewares(app)

// Setup other error handlers here ...
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.code || 500
  const errorMessage = err.message
  res.status(statusCode)
  return res.json({ error: err })
}
```

Recording a custom exception

```js
try {
  errorFunction()
} catch (error) {
  observability.Sentry.captureException(error)
}
```

Sentry is enabled by default in any `NODE_ENV` that isn't development.

### UnhandledPromises

We install a custom UnhandledPromises listener that prints the error message and exits with an error code of 1.

This is useful because in development there is no `Sentry` and sentry installs a custom listener that swallows the errors.

Its better to exit cleanly than potentially land up in a state where nothing is working as expected.

This behavior can be disabled if needed by enabling the `UNHANDLED_REJECTION_EXIT_ON_ERROR_DISABLED` env variable.


### Metrics

The custom monitoring server listens on port `:9090` that exposes `/-/metrics` and exposes prometheus metrics

[See wiki](https://unumotors.atlassian.net/wiki/spaces/SW/pages/713424921/k8s+Add+prometheus+monitoring+to+your+app)
[See prom-client](https://github.com/siimon/prom-client) for full docs on how to add/configure/use.

`observability.metrics` is just an instance of `prom-client` so any thing you could do with the official library you can do here.

```js
import observability from '@unu/observability'
// returns metricsClient is an instance of prom-client.client
const connectedGauge = new observability.metrics.Gauge({ name: 'unu_bot_slack_connected', help: 'If unu-bot is connected to slack' })
connectedGauge.set(0)
```

### Tracing

Supports exporting trace data to opentelemetry compatible server.

You activate tracing per env via `TRACING_ENABLED=true` env flag.

You can add an attribute to the current root span using `addAttribute`. You can also access the `currentSpan` directly.

```js
// Add an attribute
observability.tracing.addAttribute('tag', 'some tag content')
// Direct access to the span
const span = observability.tracing.currentSpan()
span && span.addAttribute('tag', 'tag content')
```

Tracing ignores paths starting with the following regex:

* All paths starting with /-/: /^\/-\/(.*)/
* All paths equal to /ping: /^\/ping/
* All paths related to feature falgs: /^\/api\/v4\/feature_flags\/unleash*/

All traces have a default attribute "environment". Defaults to "development" and is overwritten by APP_ENV.

To test locally, you can follow the steps described [here](./test/helpers/README.md)


#### Express tracing

Express traces are disabled by default. To enable them, set the `TRACING_EXPRESS_ENABLED` variable.

### Feature flags

A wrapper around [GitLab Feature Flags](https://docs.gitlab.com/ee/operations/feature_flags.html) is provided.

Feature flags are scoped per repository and needed to be [configured in Gitlab](https://docs.gitlab.com/ee/operations/feature_flags.html). After the configuration, an `instanceId` and an `url` are provided by GitLab.

In order to configure feature flags, set the `FEATURE_FLAGS_INSTANCE_ID` and `FEATURE_FLAGS_URL` env variables.

```yml
env:
# Random id generated by Gitlab
- name: FEATURE_FLAGS_INSTANCE_ID
  value: '__INSTANCE_ID__'
# URL of Gitlab Feature flags
- name: FEATURE_FLAGS_URL
  value: '__URL__'
# Raw options for the unleash client. Can be any of
# https://github.com/Unleash/unleash-client-node#advanced-usage
- name: FEATURE_FLAGS_UNLEASH_OPTIONS
  value: '{"option1":"option1","option2":"option2"}'
```

Internally, this feature uses the `unleash-client` library. An optional `unleashOptions` can be passed in. It will overwrite all generated options. All valid values can be found [here](https://github.com/Unleash/unleash-client-node#advanced-usage).

In order to check if a Feature Flag is enabled, use the helper function `isEnabled`:

```js
const { featureFlags } = observability

if (featureFlags.isEnabled('queue_based_processing', { userId: scooterId })) {
  // this would only get called if feature flag is enabled
}
```

The `isEnabled(feature, context)` function has two arguments:
- `feature`: The name/string of the feature as named in GitLab
- `context`: An optional context that can be used to roll out to a subset of users (see [here](https://github.com/Unleash/unleash-client-node#unleash-context))

If Feature Flags are not configured in `node-observability` (i.e. `featureFlags` not passed in `config`), all Feature Flags are disabled by default and this function returns `false`.

It may take a few seconds until node-observability did pull the data from Gitlab. Until that point, all feature flags will default to `false`. Your code needs to take that into account. Additionally, if there are any issues with the connection to Gitlab, it will default to `false` for all features. This is the desired behavior and is done to prevent a hard dependency on Gitlab.

**Try to always pass in a context if possible. Always document the Feature Flag in the README.md of the project. Stick to the above naming convention (lowercase, separation by `_`)**

### Running unit tests

Running unit tests requires a running mongodb instance without auth and a rabbitmq instance:

Run:

- `docker-compose up`
- `MONGO_CONNECTION_STRING='localhost:27017' npm run test-verbose`

### Running manual tests

Follow the steps in `test/helpers/README.md` to manually test any changes
