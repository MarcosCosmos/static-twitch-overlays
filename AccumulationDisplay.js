import Module from './Module.js';
import BasicDisplay from './BasicDisplay.js';

let defaultConfig;
{
    defaultConfig = {
        defaultData: {
            currentValue: 0
        }
    };
}

class AccumulationDisplay extends BasicDisplay {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
    }

    // generateDisplayBox() {
    //     //we didn't call super, therefore only the ones defined here will appear; maybe remove this from being it's own method later
    //     this.componentLists.display.push({
    //         data: this.coreDataGetter,
    //         template: `
    //             <div class="outlineBox">
    //                 <div v-for="e in ['forestroke', 'backstroke']" :class="e">
    //                     {{config.displayTitle}}</span>: {{info.currentValue}}
    //                 </div>
    //             </div>
    //         `
    //     });
    // }

    generateControlsBox() {
        super.generateControlsBox();
        let self=this;
        this.componentLists.controls.push({
            data: this.coreDataGetter,
            template: `
                <form action="" onsubmit="return false">
                    <label :for="config.moduleId + 'CurrentOverride'">
                        <span style="color: red;">Warning: this action is cannot be undone</span>
                        <br/>
                        Override the current value to:
                    </label>
                    <input name="currentOverride" :id="config.moduleId + 'CurrentOverride'" type="number" :step="config.step" :min="config.min" v-model="info.currentValue"/>
                </form>
            `,
            watch: {
                'info.currentValue': function() {
                    self.save();
                }
            }
            
        });
    }

    /**
     * Adds 1 the goal progress and updates data and elements accordingly
     */
    async increment() {
        let release = await this.requestInfoLock();
        ++this.info.currentValue;
        ++this.info.totalValue;
        release();
        
        this.save(); //ironically, this probably achieves that tracability mentioned in veux?
    }

    /**
     * Adds the given amount to the goal progress and updates data and elements accordingly
     * @param float amount 
     */
    async add(amount) {
        let release = await this.requestInfoLock();
        this.info.currentValue += amount;
        this.info.totalValue += amount;
        release();
        
        this.save(); //ironically, this probably achieves that tracability mentioned in veux?
    }
};

export default AccumulationDisplay;