import EventHandler from '../EventHandler.js';

import Module from '../../core/Module.js';

import {platforms} from '../../emitters/streamlabs/StreamLabsSocket.js';

const defaultConfig =  {
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
};

const defaultConfigAccum = Module.mixin(defaultConfig,{
    eventValue: 1
});

const defaultConfigTimer = Module.mixin(defaultConfig,{
    extensionAmount: 0
});

class GeneralHandler extends EventHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfig, config), widget, service);
    }
    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            template: `
                <div>
                    <h3>Misc Settings</h3>
                    <form action="" onsubmit="return false">
                        <div>
                            <h4>Platform:</h4>
                            <div v-for="(platform, platformId) of platforms">
                                <input type="radio" name="eventPlatform" v-model="core.config.eventPlatform" value="{{platformId}}" :id="'slEventPlatform_' + platformId"/>
                                <label :for="'slEventPlatform_' + platformId">{{platform.title}}</label>
                            </div>
                        </div>
                        <div>
                            <h4>Event Type</h4>
                            <div v-for="(eventTitle, eventId) of selectedPlatform.events">
                                <input type="radio" name="eventType" v-model="core.config.eventType" value="{{eventId}}" :id="'slEvent_' + eventId"/>
                                <label :for="'slEvent_' + eventId">{{eventTitle}}</label>
                            </div>
                        </div>
                    </form>
                </div>
            `,
            data: function(){return {
                core: coreData,
                platforms: platforms
            }},
            computed: {
                selectedPlatform() {
                    return platforms[this.core.config.eventPlatform];
                }
            },
            watch: {
                selectedPlatform(newValue) {
                    let newOptions = Object.keys(newValue.events);
                    if(newOptions.indexOf(this.core.config.eventType) === -1){
                        this.core.config.eventType = newOptions[0];
                    }
                },
            }
        });
    }

    async onAcceptedEvent(event) {

    }

    async onEvent(event) {
        let isCorrectType;
        isCorrectType = event.details.type === this.config.eventType;
        if(event.details.for === this.config.eventPlatform && isCorrectType) {
            await this.onAcceptedEvent(event);
        }
    }
}

class AccumulationHandler extends GeneralHandler {
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
                        <label for="'slAccumValue_'+core.config.moduleId">Event Value (per event or monetary unit)</label>
                        <input type="number" name="eventValue" v-model="core.config.eventValue" :id="'slAccumValue_'+core.config.moduleId"/>
                        </div>
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
    async onAcceptedEvent(event) {
        let amount = event.details.message.amount;
        switch(event.details.type) {
            case 'superchat':
                //superchats are measured in micros of a unit, so divide by 1000000 before continuing
                amount /= 1000000;
            case 'donation':
            case 'bits':
                {
                this.widget.add(amount*this.config.eventValue);
                this.widget.requestSave(); //don't await the next save event before continuing
                }
                break;
            case 'follow':
            case 'subscription':
            case 'host':
            case 'raid':
                {
                this.widget.add(this.config.eventValue);
                this.widget.requestSave(); //don't await the next save event before continuing
                }
                break;
            default:
                return; //lock wasn't grabbed

        }    
    }
}

class TimerHandler extends GeneralHandler {
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
    async onAcceptedEvent(event) {
        let amount = event.details.message.amount;
        switch(event.details.type) {
            case 'superchat':
                //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                amount /= 10000;
            case 'bits':
                amount /= 100
            case 'donation':
                {
                this.widget.add(amount*this.config.extensionAmount);
                this.widget.updateCurrentGap();
                this.widget.requestSave(); //don't await the next save event before continuing
                }
                break;
            case 'follow':
            case 'subscription':
            // case 'resub':
            case 'host':
            case 'raid':
                {
                this.widget.add(this.config.extensionAmount);
                this.widget.updateCurrentGap();
                this.widget.requestSave(); //don't await the next save event before continuing
                }
                break;
            default:
                return; //lock wasn't grabbed

        }
    }
}

class StreamEventHandler extends GeneralHandler {
    async onAcceptedEvent(event) {
        switch(event.details.type) {
            case 'superchat':
                //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                this.widget.info.currentEvent = {
                    by: event.details.message.name,
                    detail: event.details.message.displayString,
                    raw: event.details
                };
                break;
            case 'donation':
                this.widget.info.currentEvent = {
                    by: event.details.name,
                    detail: event.details.message.formattedAmount,
                    raw: event.details
                };
                break;
            case 'bits':
                this.widget.info.currentEvent = {
                    by: event.details.name,
                    detail: event.details.message.amount,
                    raw: event.details
                }
                break;
            case 'follow':
            case 'subscription':
            // case 'resub':
            case 'host':
            case 'raid':
                this.widget.info.currentEvent = {
                    by: event.details.message.name,
                    raw: event.details
                };
                break;
            default:
                return;

        }
        this.widget.requestSave(); //don't await the next save event before continuing
    }
}

export default {
    goal: AccumulationHandler,
    counter: AccumulationHandler,
    streamEvent: StreamEventHandler,
    timer: TimerHandler
}

// //todo: figure out how much of these mixins to merge into the main settings for the purpose uniformity with se-settings?

// async function generateBoxes() {
// }

// async function generateGoalBoxes() {
//     await (generateBoxes.bind(this))();
//     let targetSettingsBox = this.services['streamlabs'].componentLists.settings[this.service.componentLists.settings.length-1];
//     targetSettingsBox.watch = targetSettingsBox.watch || {};
//     targetSettingsBox.watch['config.eventType'] = function(newValue) {
//         switch(newValue) {
//             case 'donation':
//             case 'superchat':
//                 this.config.step =
//                     this.config.min = .01;
//                 break;
//             default:
//                 this.config.step =
//                     this.config.min = 1;
//         }
//         this.config.goal = Math.max(this.config.goal, this.config.min);;
//     }
// }

// async function generateStreamEventBoxes() {
//     await (generateBoxes.bind(this))();
//     let targetSettingsBox = this.services['streamlabs'].componentLists.settings[this.service.componentLists.settings.length-1];
//     targetSettingsBox.watch = targetSettingsBox.watch || {};
//     targetSettingsBox.watch['config.eventType'] = function(newValue) {
//         switch(newValue) {
//             case 'donation':
//             case 'superchat':
//             case 'bits':
//                 this.config.nameOnly = false;
//                 break;
//             default:
//                 this.config.nameOnly = true;
//         }
//         this.config.goal = Math.max(this.config.goal, this.config.min);
//     }
// }

// async function generateTimerBoxes() {
//     var box = generateTimerExtensionSettingBox(this, () => self.config.mixins.streamlabs.extensionAmount, val => self.config.mixins.streamlabs.extensionAmount = val, 'core.config.mixins.streamlabs.extensionAmount');
//     box.template = `
//         <div>
//         ${box.template}
//         <span class="alert alert-primary">This is the amount of time added each time a user follows, or per dollar donated (or equivilant whole unit in your currency), or per 100 bits - whichever the timer is configured for</span>
//         </div>
//     `;
    
//     this.componentLists.settings.push(box);
// }

// function generateSEFields() {
// }

// function generateSEFieldsTimer() {
//     Object.assign(this.streamElementsFields, 
//         {
//             extensionAmount: {
//                 destination: self.config.mixins.tiltify.extensionAmount,
//                 settings: {
//                     type: 'number',
//                     step: 1,
//                     label: 'Time to add per event/dollar/100-bits donated (seconds))'
//                 }
//             }
//         }
//     );
// // }

// function alertListener() {
//     console.log('WARNING: NOT YET IMPLEMENTED');
// }
