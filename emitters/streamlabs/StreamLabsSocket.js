import EventEmitter from '../EventEmitter.js';
import Module from '../../core/Module.js';

const defaultConfig = {
    socketToken: '',
    moduleId: 'streamlabsSocket',
    displayTitle: 'Streamlabs Socket API'
};

const platforms = {
    streamlabs: {
        title: 'Streamlabs',
        events: {
            donation: 'Donation'
        }
    },
    twitch_account: {
        title: 'Twitch',
        events: {
            follow: 'Follow',
            subscription: 'Subscription',
            host: 'Host',
            bits: 'Bits',
            raid: 'Raid'
        }
    },
    youtube_account: {
        title: 'Youtube',
        events: {
            follow: 'Subscription (for notifications, like a Twitch follow)',
            subscription: 'Sponsership (like a Twitch subscription)',
            superchat: 'Superchat'
        }
    },
    mixer_account: {
        title: 'Mixer',
        events: {
            follow: 'Follow',
            subscription: 'Subscription',
            host: 'Host'
        }
    }
};

class StreamLabsSocket extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.socket = null;
    }

    //todo: generate fields

    populateSEFields() {
        super.populateSEFields();
        let self=this;
        //nothing else to do for now.
        Object.assign(this.streamElementsFields, 
            {
                socketToken: {
                    get destination(){return self.config.socketToken;},
                    set destination(v){self.config.socketToken = v;},
                    settings: {
                        type: 'text',
                        label: 'Socket Token'
                    }
                },
                //bit hacky, but it nicely merges the two fields for SE without interfering with the existing codebase, in theory.
                eventToWatch: {
                    get destination() {
                        return JSON.stringify({platform: self.config.eventPlatform, event: self.config.eventType});
                    },
                    set destination(partsText) {
                        let parts = JSON.parse(partsText);
                        self.config.eventPlatform = parts.platform;
                        self.config.eventType = parts.event;
                    },
                    settings: {
                        type: 'dropdown',
                        label: 'Event To Watch',
                        options: (()=>{
                            let result = {};
                            for(const [key, value] of Object.entries(platforms)) {
                                for(const [innerKey, innerValue] of Object.entries(value.events)) {
                                    result[JSON.stringify({platform: key, event: innerKey})] = `${value.title} ${innerValue}`;
                                }
                            }
                            return result;
                        })()
                    }
                }
            }
        );
    }

    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
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

export {StreamLabsSocket as default, platforms};