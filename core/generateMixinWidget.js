import StreamlabsMixins from '../emitters/streamlabs/StreamLabsMixins.js';
import StreamlabsSocket from '../emitters/streamlabs/StreamLabsSocket.js';
import TiltifyMixins from '../emitters/tiltify/TiltifyMixins.js';
import TiltifyScanner from '../emitters/tiltify/TiltifyScanner.js';
import BasicGoal from '../widgets/BasicGoal.js';
import Counter from '../widgets/Counter.js';
import StreamEvent from '../widgets/StreamEvent.js';
import ChatBot from '../emitters/chatbot/ChatBot.js';
import ChatBotMixins from '../emitters/chatbot/ChatBotMixins.js';
import BasicAlert from '../widgets/BasicAlert.js';
import Logger from '../emitters/log/Logger.js';
import Module from '../core/Module.js';
import Timer from '../widgets/Timer.js';
import KofiViaSSEScanner from '../emitters/sse/KofiViaSSEScanner.js';
import KofiViaSSEScannerMixins from '../emitters/sse/KofiViaSSEScannerMixins.js';


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
    // ,
    // alert: {
    //     title: 'Alert',
    //     base: BasicAlert
    // }
};

let serviceTypes = {
    streamlabs: {
        title: 'Streamlabs',
        constructor: StreamlabsSocket,
        mixin: StreamlabsMixins,
    },
    tiltify: {
        title: 'Tiltify',
        constructor: TiltifyScanner,
        mixin: TiltifyMixins
    },
    chatBot: {
        title: 'Twitch Chat Command',
        constructor: ChatBot,
        mixin: ChatBotMixins
    },
    kofiViaSSE: {
        title: 'Kofi (Via SSE)',
        constructor: KofiViaSSEScanner,
        mixin: KofiViaSSEScannerMixins
    }
};


function generateMixinWidget(widgetType, serviceType) {
    const widgetTypeInfo = widgetTypes[widgetType];
    const serviceTypeInfo = serviceTypes[serviceType];
    // const eachServiceTypeInfo = serviceTypes[serviceType];
    let mixins = serviceTypeInfo.mixin[widgetType];
    class MixinWidget extends widgetTypeInfo.constructor {
        constructor(config={}, service) {
            super(Module.mixin(mixins.defaultConfig, config));
            this.service = service;
            (mixins.generateListener.bind(this)());
        }
        async generateBoxes() {
            await super.generateBoxes();
            await (mixins.generateBoxes.bind(this))();
        }
        generateSEFields() {
            super.generateSEFields();
            (mixins.generateSEFields.bind(this))();
        }
    }
    
    return MixinWidget;
}

export {widgetTypes, serviceTypes, generateMixinWidget};
