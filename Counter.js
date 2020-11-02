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

class Counter extends BasicDisplay {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
    }

    generateBoxes() {
        super.generateBoxes();
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
                'info.currentValue': async function() {
                    self.save(await self.requestDataLock());
                }
            }
            
        });
    }

    /**
     * Adds 1 the counter and updates data and elements accordingly
     */
    // async increment() {
    //     this.withLock(()=>this._increment());
    // }

    increment() {
        ++this.info.currentValue;
        ++this.info.totalValue;
    }

    /**
     * Adds the given amount to the counter and updates data and elements accordingly
     * @param float amount 
     */
    // async add(amount) {
    //     this.withLock(()=>this._add(amount));
    // }

    add(amount) {
        this.info.currentValue += amount;
        this.info.totalValue += amount;
    }

    /**
     * Sets the counter amount to the given amount and updates data and elements accordingly
     * @param float amount 
     */
    // async set(amount) {
    //     this.withLock(()=>this._set(amount));
    // }

    set(amount) {
        this.info.totalValue += this.info.currentValue-amount;
        this.info.currentValue = amount;
    }
};

export default Counter;