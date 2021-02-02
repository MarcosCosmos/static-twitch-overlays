import StreamlabsMixins from './StreamLabsMixins.js';
import StreamlabsSocket from './StreamLabsSocket.js';
import TiltifyMixins from './TiltifyMixins.js';
import TiltifyScanner from './TiltifyScanner.js';
import BasicGoal from './BasicGoal.js';
import Counter from './Counter.js';
import StreamEvent from './StreamEvent.js';
import ChatBot from './ChatBot.js';
import ChatBotMixins from './ChatBotMixins.js';
import BasicAlert from './BasicAlert.js';
import Logger from './Logger.js';
import Module from './Module.js';
import Timer from './Timer.js';


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
        generateBoxes() {
            super.generateBoxes();
            (mixins.generateBoxes.bind(this))();
        }
        generateSEFields() {
            super.generateSEFields();
            (mixins.generateSEFields.bind(this))();
        }
    }
    
    return MixinWidget;
}

export {widgetTypes, serviceTypes, generateMixinWidget};
