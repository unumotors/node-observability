## Manual tests that can be run manually to verify features that are impossible to unit test

We allow exporting tracing data to a tracing compatible setup.

In order to view/recieve these tracing data we need to run a local setup.

`docker-compose up` in the parent directory

Should be enough to get a working setup.

You can browse the following endpoints

Jeager UI http://localhost:16686

## Test process

After you have a setup using `docker-compose up` run:
* `cd test/helpers`
* `node run-server.js` and go through these manual steps:

1. Get traces. There should only be one trace. No traces for /-/readiness, /-/liveness, /-/ping and /ping
