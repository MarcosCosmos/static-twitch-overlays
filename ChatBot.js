import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

import TMI from './lib/tmi.min.js';

const defaultConfig = {
    displayTitle: 'Twitch Chat API',
    username: '',
    authToken: '',
    channels: '',
    userLevel: 0,
};

const userLevels = {
    "subscriber":1,
    "vip":2,
    "moderator":3,
    "broadcaster":4
};

class ChatBox extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.client = null;
    }

    generateSensitiveSettingsBox() {
        super.generateSensitiveSettingsBox();
        this.componentLists.settings.push({
            data: this.coreDataGetter,
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
        this.client.on('message', (channel, tags, message, self) => {
            if(self) return;
            if(!self && this.levelOf(tags) >= this.config.userLevel && !this.info.eventsSeen.has(tags.id)) {
                this.info.eventsSeen.add(tags.id);
                for(const each of this.listeners) {
                    each({
                        channel,
                        tags,
                        message,
                        self
                    })
                }
                this.save();
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
}

ChatBox.userLevels = userLevels;

export default ChatBox;