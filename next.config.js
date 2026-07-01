const path = require('path')

module.exports = {
  output: 'export',
  outputFileTracingRoot: __dirname,
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      fabric$: path.resolve(
        __dirname,
        'renderer/shared/vendor/fabric-compat.js'
      ),
    }

    return config
  },
}
