import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

const defaultConfig = {
    socketToken: '',
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
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

        var self=this;

        //Perform Action on event
        this.socket.on('event', async (eventData) => {
            if(eventData.type != 'alertPlaying') {
                try {
                    for(let each of eventData.message) {
                        let eachModified = {type: eventData.type, for: eventData.for, message: each};
                        for(const eachListener of self.listeners) {
                            try {
                                //possibly don't need to await each listener anymore since they control their own data lock? however, having the await here allowed the listener to dictate that.
                                await eachListener({
                                    type: 'streamlabs',
                                    details: eachModified
                                });
                            } catch (err) {
                                console.error(err);
                            }
                        }
                    }
                } catch(e) {
                    console.error(e);
                }
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