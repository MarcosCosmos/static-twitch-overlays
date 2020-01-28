import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

const defaultConfig = {
    socketToken: '',
    moduleId: 'streamlabsSocket',
    displayTitle: 'Streamlabs Socket API'
};

class StreamLabsSocket extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.socket = null;
    }

    generateSensitiveSettingsBox() {
        super.generateSensitiveSettingsBox();
        this.componentLists.settings.push({
            data: this.coreDataGetter,
            template: `
                <div>
                    <h4>Authentication Settings</h4>
                    <form action="" onsubmit="return false">
                        <label :for="config.moduleId + 'socketToken'">
                            Socket Token:
                        </label>
                        <input name="socketToken" :id="config.moduleId + 'socketToken'" v-model="config.socketToken"/>
                    </form>
                </div>
            `
        });
    }

    start() {
        //Connect to socket
        this.socket = io(`https://sockets.streamlabs.com?token=${this.config.socketToken}`, {transports: ['websocket']});

        this.socket.on('error', (err) => console.err(err));

        let handleOneEvent = eventData => {
            if(!this.info.eventsSeen.has(eventData.message._id)) { 
                this.info.eventsSeen.add(eventData.message._id);
                for(const eachListener of this.listeners) {
                    try {
                        eachListener({
                            type: 'streamlabs',
                            details: eventData
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        };

        //Perform Action on event
        this.socket.on('event', (eventData) => {
            for(let each of eventData.message) {
                handleOneEvent({type: eventData.type, for: eventData.for, message: each});
            }
            
        });

        this.socket.open();
    }

    stop() {
        if(this.socket) {
            this.socket.close();
            this.socket = null;
        }   
    }
}

export default StreamLabsSocket;