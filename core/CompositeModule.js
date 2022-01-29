import StreamlabsSocket from '../emitters/streamlabs/StreamLabsSocket.js';
import TiltifyScanner from '../emitters/tiltify/TiltifyScanner.js';
import TiltifyHandlers from '../handlers/tiltify/TiltifyHandlers.js';
import BasicGoal from '../widgets/BasicGoal.js';
import Counter from '../widgets/Counter.js';
import StreamEvent from '../widgets/StreamEvent.js';
import ChatBot from '../emitters/chatbot/ChatBot.js';
import ChatBotHandlers from '../handlers/chatbot/ChatBotHandlers.js';
import BasicAlert from '../widgets/BasicAlert.js';
import Logger from '../emitters/log/Logger.js';
import Module from './Module.js';
import Timer from '../widgets/Timer.js';
import KofiViaSSEScanner from '../emitters/sse/KofiViaSSEScanner.js';
import KofiViaSSEScannerHandlers from '../handlers/sse/KofiViaSSEScannerHandlers.js';
import StreamLabsHandlers from '../handlers/streamlabs/StreamLabsHandlers.js';

let widgetTypes = {
    goal: {
        title: 'Goal',
        constructor: BasicGoal
    },
    counter: {
        title: 'Counter',
        constructor: Counter
    },
    streamEvent: {
        title: 'Stream Event (e.g. follow, donation)',
        constructor: StreamEvent
    },
    timer: {
        title: 'Timer',
        constructor: Timer
    }
};

let serviceTypes = {
    streamlabs: {
        title: 'Streamlabs',
        constructor: StreamlabsSocket
    },
    tiltify: {
        title: 'Tiltify',
        constructor: TiltifyScanner
    },
    chatBot: {
        title: 'Twitch Chat Command',
        constructor: ChatBot
    },
    kofiViaSSE: {
        title: 'Kofi (Via SSE)',
        constructor: KofiViaSSEScanner
    }
};

let handlerTypes = {
    streamlabs: StreamLabsHandlers,
    tiltify: TiltifyHandlers,
    chatBot: ChatBotHandlers,
    kofiViaSSE: KofiViaSSEScannerHandlers
}

class CompositeModule extends Module {
    /**
     * Note: on construction, for the purposes of actual live usage/data scoping, widgets, services, and handlers are given module ids qualified by the encompassing composite module id, so that users need only change that one id to scope the data.
     */
    constructor(config={widget: {moduleTypeName: 'goal'}, services: [], handlers: []}) {
        super(config);
        this.widget = new widgetTypes[config.widget.moduleTypeName].constructor(Module.mixin(config.widget, {moduleId: `${config.moduleId}_widget_${config.widget.moduleId}`}));
        this.services = {};
        for(let eachServiceConfig of config.services) {
            let serviceTypeInfo = serviceTypes[eachServiceConfig.moduleTypeName];
            let eachService = new serviceTypeInfo.constructor(Module.mixin(eachServiceConfig, {moduleId: `${config.moduleId}_service_${eachServiceConfig.moduleId}`}));
            this.services[eachServiceConfig.moduleId] = eachService;
        }

        this.handlers = {};

        for(let eachHandlerConfig of config.handlers) {
            let eachTargetService = this.services[eachHandlerConfig.serviceId];
            let handlerType = handlerTypes[eachTargetService.config.moduleTypeName][this.widget.config.moduleTypeName];
            let eachHandler = new handlerType(Module.mixin(eachHandlerConfig, {moduleId: `${config.moduleId}_handler_${eachHandlerConfig.moduleId}`}), this.widget, eachTargetService);
            this.handlers[eachHandlerConfig.moduleId] = eachHandler;
            eachTargetService.addListener(event => eachHandler.onEvent(event));
        }
    }

    // async generateBoxes() {
    //     await super.generateBoxes();
    //     await this.widget.generateBoxes();

    //     for(let eachServiceKey of Object.keys(this.services)) {
    //         let eachService = this.services[eachServiceKey];
    //         await eachService.generateBoxes();
    //     }

    //     for(let eachHandlerKey of Object.keys(this.handlers)) {
    //         let eachHandler = this.handlers[eachHandlerKey];
    //         await eachHandler.generateBoxes();
    //     }
    // }

    async finalizeBoxes() {
        await super.finalizeBoxes();
        await this.widget.finalizeBoxes();

        for(let eachServiceKey of Object.keys(this.services)) {
            let eachService = this.services[eachServiceKey];
            await eachService.finalizeBoxes();
        }

        for(let eachHandlerKey of Object.keys(this.handlers)) {
            let eachHandler = this.handlers[eachHandlerKey];
            await eachHandler.finalizeBoxes();
        }
    }
    
    start() {
        this.widget.start();
        for(let each of Object.values(this.services)) {
            each.start();
        }
    }

    stop() {
        this.widget.stop();
        for(let each of Object.values(this.services)) {
            each.stop();
        }
    }
}

export {CompositeModule as default, widgetTypes, serviceTypes, handlerTypes};
