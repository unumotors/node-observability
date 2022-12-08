const unleash = require('unleash-client')
const { getEnvironment } = require('./helpers')

class FeatureFlags {
  constructor() {
    this.disabled = true
    this.config = {}
  }

  init(config) {
    this.config = config
    // Run in disabled mode by default and
    // allow full disable of feature flags by default
    this.disabled = !!process.env.FEATURE_FLAGS_DISABLED
      || this.config === undefined
    if (this.disabled) return

    const instanceId = process.env.FEATURE_FLAGS_INSTANCE_ID || config.instanceId
    if (!instanceId) {
      throw new Error('GitLab Feature Flag initiation failed. You need to pass in "featureFlags.instanceId"')
    }
    const url = process.env.FEATURE_FLAGS_URL || config.url
    if (!url) {
      throw new Error('GitLab Feature Flag initiation failed. You need to pass in "featureFlags.url"')
    }

    const environment = getEnvironment(config)
    const unleashOptions = process.env.FEATURE_FLAGS_UNLEASH_OPTIONS
      ? JSON.parse(process.env.FEATURE_FLAGS_UNLEASH_OPTIONS)
      : config.unleashOptions

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
