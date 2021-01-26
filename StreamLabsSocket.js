import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

const defaultConfig = {
    socketToken: '',
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
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

    generateBoxes() {
        super.generateBoxes();
        let self=this;
        this.componentLists.settings.push({
            template: `
                <div>
                    <h3>Misc Settings</h3>
                    <form action="" onsubmit="return false">
                        <div>
                            <h4>Platform:</h4>
                            <div v-for="(platform, platformId) of platforms">
                                <input type="radio" name="eventPlatform" v-model="config.eventPlatform" :value="platformId" :id="'slEventPlatform_' + platformId"/>
                                <label :for="'slEventPlatform_' + platformId">{{platform.title}}</label>
                            </div>
                        </div>
                        <div>
                            <h4>Event Type</h4>
                            <div v-for="(eventTitle, eventId) of selectedPlatform.events">
                                <input type="radio" name="eventType" v-model="config.eventType" :value="eventId" :id="'slEvent_' + eventId"/>
                                <label :for="'slEvent_' + eventId">{{eventTitle}}</label>
                            </div>
                        </div>
                    </form>
                </div>
            `,
            data: function(){return {
                config: self.config,
                info: self.info,
                platforms: platforms
            }},
            computed: {
                selectedPlatform() {
                    return platforms[this.config.eventPlatform];
                }
            },
            watch: {
                selectedPlatform(newValue) {
                    let newOptions = Object.keys(newValue.events);
                    if(newOptions.indexOf(this.config.eventType) === -1){
                        this.config.eventType = newOptions[0];
                    }
                },
            }
        });
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
            // let lock = await this.requestDataLock();
            // if(!this.info.eventsSeen.has(eventData.message._id)) { 
            //     this.info.eventsSeen.add(eventData.message._id);
            //     await this.save(lock);
            //     for(const eachListener of this.listeners) {
            //         try {
            //             eachListener({
            //                 type: 'streamlabs',
            //                 details: eventData
            //             });
            //         } catch (err) {
            //             console.error(err);
            //         }
            //     }
            // }
            for(const eachListener of this.listeners) {
                try {
                    await eachListener({
                        type: 'streamlabs',
                        details: eventData
                    });
                } catch (err) {
                    console.error(err);
                }
            }
        };

        //Perform Action on event
        this.socket.on('event', async (eventData) => {
            if(eventData.type != 'alertPlaying') {
                try {
                    for(let each of eventData.message) {
                        await handleOneEvent({type: eventData.type, for: eventData.for, message: each});
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