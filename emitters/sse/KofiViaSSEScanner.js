import SSEScanner, { defaultConfig as baseConfig } from './SSEScanner.js';

import Module from '../../core/Module.js';

const defaultConfig = Module.mixin(baseConfig, {
    displayTitle: 'Kofi via SSE',
});

class KofiViaSSEScanner extends SSEScanner {
    // async generateBoxes() {
    //     await super.generateBoxes();
    //     let self=this;
    //     // this.componentLists.settings.push({
    //     //     template: `
    //     //         <form action="" onsubmit="return false">
    //     //             <div>
    //     //                 <h4>Event Type</h4>
    //     //                 <div v-for="(eventName) of events">
    //     //                     <input type="radio" name="eventType" v-model="config.eventType" :value="eventName" :id="config.moduleId + 'kofiSSE_' + eventName"/>
    //     //                     <label :for="config.moduleId + 'kofiSSE_' + eventName">{{eventName}}</label>
    //     //                 </div>
    //     //             </div>
    //     //         </form>
    //     //     `,
    //     //     data: function(){return {
    //     //         config: self.config,
    //     //         info: self.info,
    //     //         events: [
    //     //             'Donation', 'Subscription', 'Commission', 'Shop Order', 'all'
    //     //         ]
    //     //     }}
    //     // });
    // }
}

export {KofiViaSSEScanner as default, defaultConfig};