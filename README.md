# Observability

A easy way to add high visibility into your nodejs services here at unu. This will do a bunch of things for you that will help ease the deployment of your application into our platform. It might seem like some upfront work to configure but this will save many hours later on in debugging.

See Table of Contents
* [Usage](#usage)
* [Configuration](#configuration)
* [Features](#features)
* -> [HealthChecks](#healthChecks)
* -> [Sentry](#sentry)
* -> [UnhandledPromises](#UnhandledPromises)
* -> [Datadog](#datadog)

## Usage

  npm install --save @david/observability

In the first line of your `index.js` include the following. This is because our tracing library auto instruments all other requires

Minimum configuration to get going.
```js
// Needs to be the first thing included in your application
const observability = require('@david/observability').init({
  // Globally configured service name
  // DO NOT prefix by env
  // ENV is auto configured via APP_ENV
  serviceName: 'david-observability-run-server',
  sentry: {
    dsn: 'https://$HASH@sentry.io/$PROJECT_ID'
  }
})
```


## Configuration
Currently there are limited configuration options provided, This in intentional in an attempt standardize this across our projects.

The limited options that are provided can either be configured via standard ENV variables or via code. (full docs to follow)

Full configuration options
```js
const config = {
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // This forces the libarry to wait for the http server to be listening
  // Also enables shutdown handlers
  monitoring: {
    externalHttp: true
  },
  // PUBLIC sentry DSN to include
  // Hard code in code we split by env inside the library
  sentry: {
    dsn: 'https://$HASH@sentry.io/$PROJECT_ID'
  }
  // Optional config use at own risk
  environment: process.env.CUSTOM_VALUE,

}
```

### Env settings

Required
|Name       |Default                              | Description |
|-----------|-------------------------------------|-------------|
|`APP_ENV`  | `config.environment`                |             |
|           |                                     |             |

Optional

|Name                       |Default              | Description |
|---------------------------|---------------------|-------------|
|`DD_TRACE_AGENT_HOSTNAME`  | `datadog`           |                               |
|`DD_SERVICE_NAME`          | `config.serviceName`|                                 |
|`MONITORING_PORT`          | 9090                |Set monitoring server to custom value|
|`SENTRY_DEBUG`             | false               |Can put sentry in debug mode|
|`SENTRY_DSN`               | `config.sentry.dsn` |                             |



## Features
List of features we automatically install and configure.

### Health Checks
Provides a custom server listens on port `:9090` that exposes `/-/liveness` and `/-/readiness` endpoints.

### Bind to an existing web server
express / http

This automatically adds the correct liveness/readiness checks but also installs shutdown handlers

Remember to set `monitoring.external=true` in your config so the healchecks know to wait

```js
var server = http.createServer(app)
observability.bindHttpServer(server)
```

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
Configures sentry error handling. This just catches unhandled exceptions it does not install it into any webserver such as express.

**important** this requires that a sentry DSN is configured in **production** we don't want to support services with out at least exception handling.

Adding to express
```js
// The request handler must be the first middleware on the app
app.use(observability.Sentry.Handlers.requestHandler())
```

Recording a custom exception
```js
try {
  errorFunction()
} catch (error) {
  observability.Sentry.captureException(error)
}
```

Enabled by default in any `NODE_ENV` that isn't development.

### UnhandledPromises

We install a custom UnhandledPromises listener that prints the error message and exits with an error code of 1.

This is useful because in development there is no `Sentry` and sentry installs a custom listener that swallows the errors.

Its better to exit cleanly than potentially land up in a state where nothing is working as expected.


### Metrics
The custom monitoring server listens on port `:9090` that exposes `/-/metrics` and exposes prometheus metrics

[See wiki](https://unumotors.atlassian.net/wiki/spaces/SW/pages/713424921/k8s+Add+prometheus+monitoring+to+your+app)
[See prom-client](https://github.com/siimon/prom-client) for full docs on how to add/configure/use.

`observability.metrics` is just an instance of `prom-client` so any thing you could do with the official library you can do here.

```js
const observability = require('@david/observability').init({})
// returns metricsClient is an instance of prom-client.client
const connectedGauge = new observability.metrics.Gauge({ name: 'unu_bot_slack_connected', help: 'If unu-bot is connected to slack' })
connectedGauge.set(0)
```
