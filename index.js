const mqtt = require('mqtt')
const Smartglass = require('xbox-smartglass-core-node');
// const SystemMediaChannel = require('xbox-smartglass-core-node/src/channels/systemmedia');
const SystemMediaChannel = require('./systemmedia');

const ip = "192.168.178.70"

const client = mqtt.connect('mqtt://pi1.fritz.box')
let local = {}

client.on('connect', function () {
  client.subscribe('xbox2mqtt/playback_status/set', function (err) {
    if(err) {
      console.log(err)
    }
  })
  client.subscribe('gpio/mancave/input/blue', function (err) {
    if(err) {
      console.log(err)
    }
  })
})

;(async() => {
  var sgClient =  Smartglass()
  console.log('Connecting to', ip)
  await sgClient.connect(ip)
  console.log('Xbox succesfully connected!');
  sgClient.addManager('system_media', SystemMediaChannel())
  // setInterval(async () => {
  //   try {
  //     const status =  await sgClient.getManager('system_media').getState()
  //     console.log('status:', status)
  //   } catch (e) {
  //     console.error(e)
  //   }
  // }, 500)

  setTimeout(async () => {
    //0xF03
    
    
    // const config = await sgClient.getManager('system_media').getState()
    // console.log('config:', config)
    // const res = await sgClient.getManager('system_media').sendCommand('playpause');
    // console.log('res:', res)
    // setTimeout(() => {
    //   process.exit()
    // }, 1000)

    sgClient.getManager('system_media').events.on('playback_status_change', state => {
      console.log('state:', state)
      local.state = state
      client.publish('xbox2mqtt/playback_status', state.playback_status)
    })

    client.on('message', function (topic, message) {
      const messageString = message.toString('utf8').toLocaleLowerCase()
      if (topic === 'gpio/mancave/input/blue') {
        if (messageString === 'on') {
          if (local.state && local.state.playback_status && local.state.playback_status === 'Playing') {
            sgClient.getManager('system_media').sendCommand('pause');
          } else if (local.state && local.state.playback_status && local.state.playback_status === 'Paused') {
            sgClient.getManager('system_media').sendCommand('play');
          }
        }
      }
      if (topic === 'xbox2mqtt/playback_status/set') {
        if (messageString === 'play') {
          sgClient.getManager('system_media').sendCommand('play');
        } else if (messageString === 'playpause') {
          sgClient.getManager('system_media').sendCommand('playpause');
        } else if (messageString === 'pause') {
          sgClient.getManager('system_media').sendCommand('pause');
        }
        //sgClient.getManager('system_media').sendCommand('playpause');
      }
    })

    await sgClient.getManager('system_media').sendCommand('playpause')
    await new Promise(r => setTimeout(r, 500))
    await sgClient.getManager('system_media').sendCommand('playpause')

  }, 1000)

})()

