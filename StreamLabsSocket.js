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

    generateBoxes() {
        super.generateBoxes();
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

    async start() {
        //Connect to socket
        this.socket = io(`https://sockets.streamlabs.com?token=${this.config.socketToken}`, {transports: ['websocket']});

        this.socket.on('error', (err) => console.err(err));

        let handleOneEvent = async eventData => {
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
                await this.save();
            }
        };

        //Perform Action on event
        this.socket.on('event', async (eventData) => {
            for(let each of eventData.message) {
                await handleOneEvent({type: eventData.type, for: eventData.for, message: each});
            }
            
        });

        await this.socket.open();
    }

    async stop() {
        if(this.socket) {
            await this.socket.close();
            this.socket = null;
        }   
    }
}

export default StreamLabsSocket;