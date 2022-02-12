import Module from "../../core/Module.js";
import EventHandler from "../EventHandler.js";
const defaultConfig = {
    eventType: 'all',
    countedObject: 'event'
};
const defaultConfigAccum = Module.mixin(defaultConfig, {
    eventValue: 1
});
const defaultConfigTimer = Module.mixin(defaultConfig, {
    extensionAmount: 0
});


class GeneralHandler extends EventHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfigAccum, config), widget, service);
    }
    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            template: `
                <form action="" onsubmit="return false">
                    <div>
                        <h4>Event Type</h4>
                        <div v-for="(eventName, index) of events">
                            <input type="radio" name="eventType" v-model="core.config.eventType" :value="eventName" :id="core.config.moduleId + 'seWidgetEventHandler_' + index"/>
                            <label :for="core.config.moduleId + 'seWidgetEventHandler_' + index">{{eventName}}</label>
                        </div>
                    </div>
                </form>
            `,
            data: function(){return {
                core: coreData,
                events: [
                    'follower-latest',
                    'subscriber-latest',
                    'host-latest',
                    'cheer-latest',
                    'tip-latest',
                    'raid-latest',
                    'all'
                    // message - New chat message received
                    // delete-message - Chat message removed
                    // delete-messages - Chat messages by userId removed
                    // event:skip - User clicked "skip alert" button in activity feed
                    // bot:counter - Update of bot counter
                    // kvstore:update - Update of SE_API store value.
                    // widget-button - User clicked custom field button in widget properties
                    // 'Donation', 'Subscription', 'Commission', 'Shop Order', 'all'
                ]
            }}
        });

        this.componentLists.settings.push({
            template: `
                <div>
                    <form action="" onsubmit="return false">
                        <h4>Counting</h4>
                        <input type="radio" name="countedObject" v-model="core.config.countedObject" value="event" :id="core.config.moduleId + 'seWidgetEventHandler_countByEvent'"/>
                        <label :for="core.config.moduleId + 'seWidgetEventHandler_countByEvent'">Event Occurence</label>
                        <br/>
                        <input type="radio" name="countedObject" v-model="core.config.countedObject" value="amount" :id="core.config.moduleId + 'seWidgetEventHandler_countByAmount'"/>
                        <label :for="core.config.moduleId + 'seWidgetEventHandler_countByAmount'">Event Value</label>
                    </form>
                </div>
            `,
            data: function(){return {
                core: coreData
            }}
        });
    }

    async onAcceptedEvent(event) {

    }

    async onEvent(event) {
        let isCorrectType = this.config.eventType === 'all' || this.config.eventType === event.listener;
        if(isCorrectType) {
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
                        <label for="'seWidgetEventHandlerAccumValue_'+core.config.moduleId">Event Value (per event or monetary unit)</label>
                        <input type="number" name="eventValue" v-model="core.config.eventValue" :id="'seWidgetEventHandlerAccumValue_'+core.config.moduleId"/>
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
        //skip the bulk event for any kind of accumulation
        if(!event.event.bulkGifted) {
            switch(this.config.countedObject) {
                case 'event':
                    this.widget.add(this.config.eventValue);
                    this.widget.requestSave(); //don't await the next save event before continuing
                    break;
                case 'amount':
                    let amount = event.event.amount;
                    switch(event.listener) {
                        case 'follower-latest':
                        case 'host-latest':
                        case 'raid-latest':
                            amount = 1;
                            break;
                        case 'subscriber-latest':
                            switch(event.event.tier) {
                                case '1000':
                                    amount = 1;
                                    break;
                                case '2000':
                                    amount = 2;
                                    break;
                                case '3000':
                                    amount = 5;
                                    break;
                            }
                        case 'cheer-latest':
                        case 'tip-latest':
                            //these stay as default;
                            break;
                    }
                    this.widget.add(amount*this.config.eventValue);
                    this.widget.requestSave();
                    break;
            }    
        }
    }
}

class TimerHandler extends GeneralHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfigTimer, config), widget, service);
    }

    async generateBoxes() {
        await super.generateBoxes();

        let coreData = await this.coreDataPromise;
        var box = generateTimerExtensionSettingBox(this, () => self.config.extensionAmount, val => self.config.extensionAmount = val, 'core.config.extensionAmount');
        box.template = `
            <div>
            ${box.template}
            <span class="alert alert-primary">This is the amount of time added each time a user donates/subscribes/etc - depending on settings used.</span>
            </div>
        `;
        
        this.componentLists.settings.push(box);
    }

    /**
     * Action that takes place when an event occurs; Maybe include configurable filters etc
     */
     async onAcceptedEvent(event) {
        //skip the bulk event for any kind of accumulation
        if(!event.event.bulkGifted) {
            switch(this.config.countedObject) {
                case 'event':
                    this.widget.add(this.config.eventValue);
                    this.widget.requestSave(); //don't await the next save event before continuing
                    break;
                case 'amount':
                    let amount = event.event.amount;
                    switch(event.listener) {
                        case 'follower-latest':
                        case 'host-latest':
                        case 'raid-latest':
                            amount = 1;
                            break;
                        case 'subscriber-latest':
                            switch(event.event.tier) {
                                case '1000':
                                    amount = 1;
                                    break;
                                case '2000':
                                    amount = 2;
                                    break;
                                case '3000':
                                    amount = 5;
                                    break;
                            }
                        case 'cheer-latest':
                        case 'tip-latest':
                            //these stay as default;
                            break;
                    }
                    this.widget.add(amount*this.config.extensionAmount);
                    this.widget.requestSave();
                    break;
            }    
        }
    }
}


class StreamEventHandler extends GeneralHandler {
    async onAcceptedEvent(event) {
        this.widget.info.currentEvent = {
            by: event.details.from_name,
            details: `${event.details.amount}`,
            raw: event.details
        };
        this.widget.requestSave(); //don't await the next save event before continuing
    }
}

let mixins = {
    goal: AccumulationHandler,
    counter: AccumulationHandler,
    streamEvent: StreamEventHandler,
    timer: TimerHandler
}

export default mixins;



// async function generateBoxes() {
// }

// async function generateAccumulationBoxes() {
//     await generateBoxes.bind(this);
    // let self=this;
    // this.componentLists.settings.push({
    //     template: `
    //         <form action="" onsubmit="return false">
    //             <div>
    //                 <h4>Counting</h4>
    //                 <div>
    //                     <input type="radio" name="countedObject" v-model="config.countedObject" value="event" :id="config.moduleId + 'seWidgetEventHandler_countByEvent'"/>
    //                     <label :for="config.moduleId + 'seWidgetEventHandler_countByEvent'">Event Occurence</label>
    //                 </div>
    //                 <div>
    //                     <input type="radio" name="countedObject" v-model="config.countedObject" value="amount" :id="config.moduleId + 'seWidgetEventHandler_countByAmounted'"/>
    //                     <label :for="config.moduleId + 'seWidgetEventHandler_countByAmount'">Donated Amount</label>
    //                 </div>
    //             </div>
    //         </form>
    //     `,
    //     data: function(){return {
    //         config: self.config,
    //         info: self.info
    //     }}
    // });
// }


// async function generateTimerBoxes() {
    
// }

// function accumulationListener() {
//     this.service.addListener(
//         (event, service) => {
//             let isCorrectType = service.eventType == 'all' || service.eventType === this.config.eventType;
//             if(isCorrectType) {
//                 switch(this.config.countedObject) {
//                     case 'event':
//                         this.increment();
//                         this.requestSave(); //don't await the next save event before continuing
//                         break;
//                     case 'amount':
//                         this.add(event.details.amount);
//                         this.requestSave();
//                         break;
//                 }                
//             }
//         }
//     );
// }

// function timerListener() {
//     return (event,service) => {
//         let isCorrectType = service.eventType == 'all' || service.eventType === this.config.eventType;
//         if(isCorrectType) {
//             switch(this.config.countedObject) {
//                 case 'event':
//                     this.add(this.config.extensionAmount);
//                     this.requestSave(); //don't await the next save event before continuing
//                     break;
//                 case 'amount':
//                     this.add(event.details.amount*this.config.extensionAmount);
//                     this.requestSave();
//                     break;
//             }                
//         }
//     };
// }

// function alertListener() {
//     console.log('WARNING: NOT YET IMPLEMENTED');
// }