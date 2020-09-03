var Debug = require('debug')('smartglass:channel_system_media')
const Packer = require('xbox-smartglass-core-node/src/packet/packer');
const ChannelManager = require('xbox-smartglass-core-node/src/channelmanager');
const EventEmitter = require('events')
module.exports = function()
{
    var channel_manager = new ChannelManager('48a9ca24eb6d4e128c43d57469edd3cd', 'SystemMedia')

    return {
        _channel_manager: channel_manager,

        _media_request_id: 1,
        _media_state: {
            title_id: 0,
            playback_status: '?',
            _media_commands_enabled: [],
        },

        _media_commands: {
            stat: 1,
            play: 2,
            pause: 4,
            playpause: 8,
            stop: 16,
            record: 32,
            next_track: 64,
            prev_track: 128,
            fast_forward: 256,
            rewind: 512,
            channel_up: 1024,
            channel_down: 2048,
            back: 4096,
            view: 8192,
            menu: 16384,
            seek: 32786, // Not implemented yet
        },

        

        events: new EventEmitter(),

        load: function(smartglass, manager_id){
            this._channel_manager.open(smartglass, manager_id).then(function(channel){
                Debug('Channel is open.')
            }, function(error){
                Debug('ChannelManager open() Error:', error)
            })

            smartglass.on('_on_media_state', (message, xbox, remote, smartglass) => {
              const {packet_decoded} = message
              const {protected_payload} = packet_decoded
              Debug('Got media message', protected_payload)
              this._media_state.title_id = protected_payload.title_id;
              this._media_state.playback_status = protected_payload.playback_status;
              this._media_state._media_type = protected_payload.media_type
              this._media_state._sound_level = protected_payload.sound_level
              this._media_state._media_commands_enabled = []
              Object.entries(this._media_commands).forEach(([key, val]) => {
                if (protected_payload.enabled_commands & val) {
                  this._media_state._media_commands_enabled.push(key)
                }
              })

              this.events.emit('playback_status_change', this._media_state)

            })
        },

        sendCommand: function(button){
            return new Promise(function(resolve, reject) {
                if(this._channel_manager.getStatus() == true){
                    Debug('Send media command: '+button);

                    var media_command = Packer('message.media_command')
                    var request_id = "0000000000000000"
                    request_id = (request_id+this._media_request_id).slice(-request_id.length);
                    media_command.set('request_id', Buffer.from(request_id, 'hex'));
                    media_command.set('title_id', this._media_state.title_id);
                    media_command.set('command', this._media_commands[button]);
                    this._media_request_id++

                    media_command.setChannel(this._channel_manager.getChannel())
                    this._channel_manager.getConsole().get_requestnum()
                    var message  = media_command.pack(this._channel_manager.getConsole())

                    this._channel_manager.send(message);

                    resolve({
                        status: 'ok_media_send',
                        params: {
                            button: button
                        }
                    })
                } else {
                    reject({
                        status: 'error_channel_disconnected',
                        error: 'Channel not ready: SystemMedia'
                    })
                }
            }.bind(this))
        },

        getState: function(){
            return this._media_state
        }
    }
}
