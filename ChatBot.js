import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

import TMI from './lib/tmi.min.js';

const defaultConfig = {
    displayTitle: 'Twitch Chat API',
    username: '',
    authToken: '',
    channels: '',
    userLevel: 0,
    cooldown: 1000,
    defaultData: {
        lastMessageTime: new Date(0)
    }
};

const userLevels = {
    "subscriber":1,
    "vip":2,
    "moderator":3,
    "broadcaster":4
};

class ChatBot extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.client = null;
    }

    generateBoxes() {
        super.generateBoxes();
        this.componentLists.settings.push({
            data: this.coreDataGetter,
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
                            Minimum User Level (ignore commands below this):
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
            if(self.levelOf(tags) >= self.config.userLevel && !self.info.eventsSeen.has(tags.id)) {
                if(now - self.info.lastMessageTime < self.config.cooldown) {
                    return;
                } else {
                    self.info.lastMessageTime = now;
                }
                self.info.eventsSeen.add(tags.id);
                for(const each of self.listeners) {
                    await each({
                        channel,
                        tags,
                        message,
                        self
                    });
                }
                self.save();
            }
        });
        this.client.connect();
    }

    async stop() {
        if(this.client) {
            let tmp = this.client;
            this.client = null;
            await tmp.disconnect();
        }   
    }

    loadInfo() {
        super.loadInfo();
        if(this.info.lastMessageTime != null) {
            this.info.lastMessageTime = new Date(Date.parse(this.info.lastMessageTime));
        }
    }
}

ChatBot.userLevels = userLevels;

export default ChatBot;