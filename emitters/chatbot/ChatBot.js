import EventEmitter from '../EventEmitter.js';
import Module from '../../core/Module.js';

import TMI from '../../lib/tmi.min.js';

const defaultConfig = {
    displayTitle: 'Twitch Chat API',
    username: '',
    authToken: '',
    channels: '',
    userLevel: 0,
    cooldown: 1000,
    commandPrefixes: '',
    defaultData: {
        lastMessageTime: new Date(0)
    }
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
                    <h4>Misc Settings</h4>
                    <form action="" onsubmit="return false">
                        <label :for="config.moduleId + 'commandPrefixes'">
                            Command(s) to listen for (aliases are comma seperated):
                        </label>
                        <input name="commandPrefixes" :id="config.moduleId + 'commandPrefixes'" v-model="config.commandPrefixes"/>
                    </form>
                </div>
            `,
        });
        this.componentLists.settings.push({
            data: () => coreData,
            computed: {
                _cooldown: {
                    get() {
                        return this.config.cooldown/1000;
                    },
                    set(val) {
                        this.config.cooldown = 1000*val;
                    }
                }
            },
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
                        <label :for="config.moduleId + 'Cooldown'">
                            Cooldown (seconds):
                        </label>
                        <input name="cooldown" :id="config.moduleId + 'Cooldown'" v-model="_cooldown"/>
                        <br/>
                        <label :for="config.moduleId + 'UserLevel'">
                            Minimum User Level (ignore users below this):
                        </label>
                        <select name="userLevel" :id="config.moduleId + 'userLevel'" v-model="config.userLevel">
                            <option value="4">Broadcaster</option>
                            <option value="3">Moderator</option>
                            <option value="2">VIP</option>
                            <option value="1">Subscriber</option>
                            <option value="0">Everyone</option>
                        </select>
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
            let now = new Date(Date.now());
            if(isMyMsg) return;
            if(self.levelOf(tags) >= self.config.userLevel ) {
                if(now - self.info.lastMessageTime < self.config.cooldown) {
                    return;
                } else {
                    self.info.lastMessageTime = now;
                }
                for(const each of self.listeners) {
                    await each({
                        channel,
                        tags,
                        message,
                        self
                    });
                }
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