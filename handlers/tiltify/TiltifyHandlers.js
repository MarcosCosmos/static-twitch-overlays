import generateTimerExtensionSettingBox from "../utility/generateTimerExtensionSettingBox.js";
import EventHandler from '../EventHandler.js';

import Module from '../../core/Module.js';

const defaultConfig = {};

const defaultConfigAccum = {
    eventValue: 1
};

const defaultConfigTimer = {
    extensionAmount: 0
};

class AccumulationHandler extends EventHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfigAccum, config), widget, service);
    }

    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            template: `
                <div>
                    <form action="" onsubmit="return false">
                        <label for="'tiltifyAccumValue_'+core.config.moduleId">Event Value (per event or monetary unit)</label>
                        <input type="number" name="eventValue" v-model="core.config.eventValue" :value="core.config.eventValue" :id="'tiltifyAccumValue_'+core.config.moduleId"/>
                    </form>
                </div>
            `,
            data: function(){return {
                core: coreData
            }}
        });
    }

    /**
     * Action that takes place when an event occurs; Maybe include configurable filters etc
     */
    async onEvent(event) {
        switch(event.type) {
            case 'donation':
                this.widget.add(event.details.amount*this.config.eventValue);
                this.widget.requestSave(); //don't await the next save event before continuing
                break;
        }
    }
}


class TimerHandler extends EventHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfigTimer, config), widget, service);
    }

    async generateBoxes() {
        await super.generateBoxes();
        var box = generateTimerExtensionSettingBox(this, () => self.config.extensionAmount, val => self.config.extensionAmount = val, 'core.config.extensionAmount');
        box.template = `
            <div>
            ${box.template}
            <span class="alert alert-primary">This is the amount of time added each time a user follows, or per dollar donated (or equivilant whole unit in your currency), or per 100 bits - whichever the timer is configured for</span>
            </div>
        `;
        
        this.componentLists.settings.push(box);
    }

    /**
     * Action that takes place when an event occurs; Maybe include configurable filters etc
     */
    async onEvent(event) {
        switch(event.type) {
            case 'donation':
                this.widget.add(event.details.amount*this.config.extensionAmount);
                this.widget.updateCurrentGap();
                this.widget.requestSave(); //don't await the next save event before continuing
                break;
        }
    }
}

class StreamEventHandler extends AccumulationHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfig, config), widget, service);
    }

    async onEvent(event) {
        this.widget.info.currentEvent = {
            by: event.details.name,
            detail: event.details.message.formattedAmount,
            raw: event.details
        };
        this.widget.requestSave(); //don't await the next save event before continuing
    }
}

export default {
    goal: AccumulationHandler,
    counter: AccumulationHandler,
    streamEvent: StreamEventHandler,
    timer: TimerHandler
};

// function generateSEFields() {
// }

// function generateSEFieldsTimer() {
//     let self=this;
//     Object.assign(this.streamElementsFields, 
//         {
//             extensionAmount: {
//                 get destination(){return self.config.mixins.tiltify.extensionAmount;},
//                 set destination(v){self.config.mixins.tiltify.extensionAmount = v;},
//                 settings: {
//                     type: 'number',
//                     step: 1,
//                     label: 'Time to add per event/dollar/100-bits donated (seconds))'
//                 }
//             }
//         }
//     );
// }
// function alertListener() {
//     console.log('WARNING: NOT YET IMPLEMENTED');
// }