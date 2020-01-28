import Module from './Module.js';
import BasicDisplay from './BasicDisplay.js';

let defaultConfig = {
    nameOnly: false,
    defaultData: {
        currentEvent: {by: 'Example', detail: '42'}
    },
    servce: null
};

class EventDisplay extends BasicDisplay {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
    }
    // generateDisplayBox() {
    //     this.componentLists.display.push({
    //         data: this.coreDataGetter,
    //         template: `
    //             <div class="eventBox outlineBox" ref="displayBox">
    //                 <div v-for="e in ['forestroke', 'backstroke']" :class="e">
    //                     <div style="text-decoration: underline;">{{config.displayTitle}}</div>
    //                     {{currentEvent.by}}
    //                     <template v-if="!config.nameOnly">
    //                         - {{currentEvent.detail}}
    //                     </template>
    //                 </div>
    //             </div>
    //         `
    //     });
    // }
}

export default EventDisplay;