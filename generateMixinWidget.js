import StreamlabsMixins from './StreamLabsMixins.js';
import StreamlabsSocket from './StreamLabsSocket.js';
import TiltifyMixins from './TiltifyMixins.js';
import TiltifyScanner from './TiltifyScanner.js';
import BasicGoal from './BasicGoal.js';
import EventDisplay from './EventDisplay.js';
import BasicAlert from './BasicAlert.js';
import Logger from './Logger.js';;
import Module from './Module.js';


let widgetTypes = {
    goal: {
        title: 'Goal',
        constructor: BasicGoal,
        listener: 'accumulationListener'
    },
    eventDisplay: {
        title: "Event Display",
        constructor: EventDisplay,
        listener: 'displayListener'
    }
    // alert: {
    //     title: 'Alert',
    //     base: BasicAlert,
    //     listener: 'alertListener'
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
    }
};


function generateMixinWidget(widgetType, serviceType) {
    const widgetTypeInfo = widgetTypes[widgetType];
    const serviceTypeInfo = serviceTypes[serviceType];
    // const eachServiceTypeInfo = serviceTypes[serviceType];
    class MixinWidget extends widgetTypeInfo.constructor {
        constructor(config={}, service) {
            super(Module.mixin(serviceTypeInfo.mixin.defaultConfig, config));
            this.service = service;
            (serviceTypeInfo.mixin[widgetTypeInfo.listener].bind(this))();
        }
        generateSettingsBox() {
            super.generateSettingsBox();
            (serviceTypeInfo.mixin.generateSettingsBox.bind(this))();
        }
    }
    
    return MixinWidget;
}

export {widgetTypes, serviceTypes, generateMixinWidget};
