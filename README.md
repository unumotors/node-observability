# Observability package
A easy to adding high visiblity into your nodejs services here at unu. This will do a bunch of things for you that will help ease the deployment of your application into our platform.

See Table of Contents
* [Usage](#usage)
* [Configuration](#configuration)
* [Features](#features)
* -> [HealthChecks](#healthChecks)
* -> [Sentry](#sentry)
* -> [UnhandledPromise](#unhandledPromise)

## Usage

  npm install --save @david/observability

In the first line of your `index.js` include the following.

```js
// Needs to be the first thing included in your application
const Observability = require('@david/observability')
const config = {
  health
}
Observability.init()
```


## Configuration
Currently there are limited configuration options provided, This in intentional in an attempt standardise this across our projects.

The limited options that are provided can either be configured via standard ENV variables or via code. (full docs to follow)

## Features
List of features we automatically install and configure.

### Health Checks
Provides a custom server listens on port :9090 that exposes `/-/liveness` and `/-/readiness` endpoints.

### Sentry
Configures sentry error handling. This just catches unhandled exceptions it does not install it into any webserver such as express.

**important** this requires that a sentry DSN is configured in **production** we don't want to support services with out at least exception handling.

Adding to express
```js
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler())
```

### Metrics
Provides a custom server listens on port :9090 that exposes `/-/metrics` and exposes prometheus metrics

[See wiki](https://unumotors.atlassian.net/wiki/spaces/SW/pages/713424921/k8s+Add+prometheus+monitoring+to+your+app)
[See prom-client](https://github.com/siimon/prom-client)

Full promethues metrics docs to follow.

```js
const { Gauge } = require('prom-client')
const connectedGauge = new Gauge({ name: 'unu_bot_slack_connected', help: 'If unu-bot is connected to slack' })
monitoring.slack.connectedGauge.set(1)
```

### UnhandledPromise
Catches unhandled promises sends them to sentry and then exits the application with exit code of 1.

Generally if its unhandled its better to reset the application into a "clean" state than carry on with unintended side effects.
