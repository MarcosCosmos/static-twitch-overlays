import EventEmitter from '../EventEmitter.js';
import Module from '../../core/Module.js';

import TMI from '../../lib/tmi.min.js';

const defaultConfig = {
    displayTitle: 'Twitch Chat API',
    username: '',
    authToken: '',
    channels: '',
    defaultData: {}
};

const userLevels = {
    "everyone":0,
    "subscriber":1,
    "vip":2,
    "moderator":3,
    "broadcaster":4
};

//todo: use builtin SE chatbot (optionally) in SE overlays
class ChatBot extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.client = null;
    }

    populateSEFields() {
        super.populateSEFields();
        let self=this;
        //nothing else to do for now.
        Object.assign(this.streamElementsFields, 
            {
                username: {
                    get destination(){return self.config.username;},
                    set destination(v){self.config.username = v;},
                    settings: {
                        type: 'text',
                        label: 'Bot Username'
                    }
                },
                authToken: {
                    get destination(){return self.config.authToken;},
                    set destination(v){self.config.authToken = v;},
                    settings: {
                        type: 'text',
                        label: 'Bot OAuth Token (Twitch)'
                    }
                },
                channels: {
                    get destination(){return self.config.channels;},
                    set destination(v){self.config.channels = v;},
                    settings: {
                        type: 'text',
                        label: 'Channels (comma seperated)'
                    }
                },
                userLevel: {
                    get destination(){return self.config.userLevel;},
                    set destination(v){self.config.userLevel = v;},
                    settings: {
                        type: 'dropdown',
                        label: 'Minimum User Level (ignore users below this)',
                        options: (()=>{
                            let result = {};
                            for(let each of Object.keys(userLevels)) {
                                result[`${userLevels[each]}`] = each;
                            }
                        })()
                    }
                },
                cooldown: {
                    get destination(){return self.config.cooldown;},
                    set destination(v){self.config.cooldown = v;},
                    settings: {
                        type: 'number',
                        label: 'Cooldown (milliseconds, 1000ms=1s)'
                    }
                },
                commands: {
                    get destination(){return self.config.commandPrefixes;},
                    set destination(v){self.config.commandPrefixes = v;},
                    settings: {
                        type: 'text',
                        label: 'Command(s) to listen for (aliases are comma seperated)'
                    }
                }
            }
        );
    }

    async generateBoxes() {
        await super.generateBoxes();
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
            template: `
                <div>
                    <h4>Authentication Settings</h4>
                    <form action="" onsubmit="return false">
                        <label :for="config.moduleId + 'Username'">
                            Bot Username:
                        </label>
                        <input name="username" :id="config.moduleId + 'Username'" v-model="config.username"/>
                        <br/>
                        <label :for="config.moduleId + 'OAuthToken'">
                            OAuth Token:
                        </label>
                        <input name="authToken" :id="config.moduleId + 'OAuthToken'" v-model="config.authToken"/>
                        <br/>
                        <label :for="config.moduleId + 'Channels'">
                            Channels (comma seperated):
                        </label>
                        <input name="channels" :id="config.moduleId + 'Channels'" v-model="config.channels"/>
                    </form>
                </div>
            `
        });
    }

    levelOf(userState) {
        return userState.badges ? Math.max(...Object.keys(userState.badges).map(each=>userLevels[each] || 0)) : 0;
    }

    async start() {
        this.client = new TMI.Client({
            options: { debug: true },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: this.config.username,
                password: 'oauth:' + this.config.authToken
            },
            channels: this.config.channels.split(',').map(s => '#' + s)
        });
        let self=this;
        this.client.on('message', async (channel, tags, message, isMyMsg) => {
            for(const each of self.listeners) {
                await each({
                    channel,
                    tags,
                    message,
                    self,
                    isMyMsg
                });
            }
        });
        await this.client.connect();
    }

    async stop() {
        if(this.client) {
            let tmp = this.client;
            this.client = null;
            await tmp.disconnect();
        }
    }

    async loadInfo(lock) {
        await super.loadInfo(lock);
        if(this.info.lastMessageTime != null) {
            this.info.lastMessageTime = new Date(Date.parse(this.info.lastMessageTime));
        }
    }
}

ChatBot.userLevels = userLevels;

export default ChatBot;