const {discover} = require('./SmartGlass')

discover().then(devices => {
  console.log('devices:', devices)
})