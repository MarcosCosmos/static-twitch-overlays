import CompositeModule from "../../core/CompositeModule.js";
import Module from "../../core/Module.js";
import ChatBot from "../../emitters/chatbot/ChatBot.js";
import { GeneralHandler as GeneralChatMessageHandler } from "../../handlers/chatbot/ChatBotHandlers.js";
import Timer from "../../widgets/Timer.js";

const defaultConfig = {
    moduleId: '!continuebot',
    displayTitle: '!continue cooldown',
    theme: 'default',
    username: '',
    authToken: '',
    channels: '',
    userLevel: 3,
    cooldown: 10000,
    commandPrefixes: '!continue',
    commandToSay: '!continue',
    boxToShow: 'display',
    defaultData: {
        lastMessageTime: new Date(0)
    }
};

class ContinueHandler extends GeneralChatMessageHandler {
    async onAcceptedEvent(event) {
        this.widget.add(this.config.cooldown);
        this.widget.unpause();
        if(!event.isMyMsg && !(event.tags.username === this.service.config.username)) {
            this.service.client.say(event.channel, this.config.commandToSay);
        }
    }
}
/**
 * Similar to a composite module, except that it doesn't rely on normal registered types to decide on the widget, service, or handler, since they are fixed and customised for ContinueBot.
 */
class ContinueBot extends Module {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.widget = new Timer({moduleId: `${this.config.moduleId}_timer`, theme: this.config.theme, displayTitle: this.config.displayTitle});
        this.services = {
            'the_only': new ChatBot({
                username: this.config.username,
                authToken: this.config.authToken,
                channels: this.config.channels
            })
        };
        this.handlers = {
                'the_only': new ContinueHandler({
                userLevel: this.config.userLevel,
                cooldown: this.config.cooldown,
                commandPrefixes: this.config.commandPrefixes,
                commandToSay: this.config.commandToSay
            }, this.widget, this.services.the_only)
        };
        this.services.the_only.addListener(event => this.handlers.the_only.onEvent(event));
    }
}
ContinueBot.prototype.finalizeBoxes = CompositeModule.prototype.finalizeBoxes;
ContinueBot.prototype.start = CompositeModule.prototype.start;
ContinueBot.prototype.stop = CompositeModule.prototype.stop;
export {ContinueBot as default, defaultConfig};