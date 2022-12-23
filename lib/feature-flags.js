const unleash = require('unleash-client')
const { getEnvironment } = require('./helpers')

class FeatureFlags {
  constructor() {
    this.disabled = true
  }

  init() {
    const instanceId = process.env.FEATURE_FLAGS_INSTANCE_ID
    const url = process.env.FEATURE_FLAGS_URL

    if (!url || !instanceId) {
      // eslint-disable-next-line max-len
      console.warn('Observability: Feature flags disabled. Pass in FEATURE_FLAGS_INSTANCE_ID and FEATURE_FLAGS_URL to enable.')
      this.disabled = true
      return
    }
    this.disabled = false

    const environment = getEnvironment()
    const unleashOptions = process.env.FEATURE_FLAGS_UNLEASH_OPTIONS
      ? JSON.parse(process.env.FEATURE_FLAGS_UNLEASH_OPTIONS)
      : {}

    const unleashConfig = {
      appName: environment, // HAS to be equal to the environment due to how GitLab uses unleash
      instanceId,
      url,
      /* extra unleash options
        Ref: https://github.com/Unleash/unleash-client-node#advanced-usage
        e.g. { refreshInterval: 30000 }
       */
      ...unleashOptions,
    }

    this.unleash = unleash.initialize(unleashConfig)

    this.unleash.on && this.unleash.on('error', (msg) => {
      console.error('Feature Flag issue:', msg)
    })

    console.log('Observability: Feature flags enabled.')
  }

  isEnabled(feature, context) {
    // If disabled or inititation failed, all features are disabled by default
    if (this.disabled || !this.unleash) {
      return false
    }

    return this.unleash.isEnabled(feature, context)
  }
}

module.exports = { FeatureFlags, unleash }
