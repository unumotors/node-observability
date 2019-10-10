## Manual tests that can be run manually to verify features that are impossible to unit test

We allow exporting tracing data to a tracing compatible setup.

In order to view/recieve these tracing data we need to run a local setup.

`docker-compose up`

Should be enough to get a working setup.

You can browse the following endpoints

Zipkin UI http://localhost:19411/zipkin/
Jeager UI http://localhost:16686

The oc-agent doesn't have a UI but the jeager and zipkin endpoints are accessable on

OC receiver http://localhost:55678
Zipkin http://localhost:9411
Jeager http://localhost:14268
