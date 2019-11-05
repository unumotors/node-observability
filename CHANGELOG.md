# 0.2

Add mongodb tracing to opencensus. See README for details.

# 0.1

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

## BREAKING CHNAGES:
* If `monitoring.observeServer(server, app)` is called after any other express middleware is added it
throws an exception

# 0.0.4

## BREAKING CHNAGES:

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
