const fabricModule = require('../../../node_modules/fabric/dist/fabric.min.js')

module.exports = {
  fabric: fabricModule.fabric || fabricModule.default || fabricModule,
}
