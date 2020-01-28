import Module from './Module.js';
import AccumulationDisplay from './AccumulationDisplay.js';


 
let defaultConfig;
{
    defaultConfig = {
        goal: 1,
        // settingsTitle: exampleTitle,
        step: 'any',
        min: 0,
        useModulo: false, //indicates whether or not to roll over to 0 when a goal is reached,
        logger: null, //optional Logger instance (only used if present)
        service: null,
        defaultData: {
            totalValue: 0,
            goalsReached: 0
        }
    };
}

/**
 * Note this basic/base goal doesn't include an updating mechanism in and of itself other than manually through settings, and should be extended with subclasses that interact with other modules (such a streamlabs socket.io module) to listen for updates
 */
export default class BasicGoal extends AccumulationDisplay {
    constructor(config=defaultConfig) {
        if(config.logger) {
            config.logger.moduleId = `${config.moduleId}_log`;
            config.logger.displayTitle = `${config.displayTitle} Log`;
        }
        super(Module.mixin(defaultConfig, config));
        
    }

    // generateDisplayBox() {
    //     this.componentLists.display.push({
    //         data: this.coreDataGetter,
    //         template: `
    //             <div class="goalBox outlineBox" :style="{backgroundSize: markerPoint + 'px, 1px', backgroundPosition: '0,' + markerPoint + 'px'}" ref="displayBox">
    //                 <div v-for="e in ['forestroke', 'backstroke']" :class="e">
    //                     {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
    //                 </div>
    //             </div>
    //         `,
    //         computed: {
    //             markerPoint() {
    //                 if(this.$refs.displayBox){
    //                     let width = this.$refs.displayBox.offsetWidth;
    //                     let currentProportion = this.info.currentValue / this.config.goal;
    //                     let result = Math.floor(currentProportion*width);
    //                     return result;
    //                 } else {
    //                     return 0;
    //                 }
    //             }
    //         },
    //     });
    // }

    generateSettingsBox() {
        super.generateSettingsBox();
        this.componentLists.settings.push({
            data: this.coreDataGetter,
            template: `
                <form action="" onsubmit="return false">
                    <label :for="config.moduleId + 'GoalSetting'">
                        Goal Amount:
                    </label>
                    <input name="goal" :id="config.moduleId + 'GoalSetting'" type="number" :step="config.step" :min="config.min" v-model="config.goal"/>
                    <br>
                    <input name="useModulo" :id="config.moduleId + 'UseModulo'" type="checkbox" v-model="config.useModulo"/>
                    <label :for="config.moduleId + 'UseModulo'">
                        Reset when reached? (note: preserves any excess beyond the goal):
                    </label>
                </form>
            `
        });
    }

    generateControlsBox() {
        super.generateControlsBox();
        let self=this;
        this.componentLists.controls.push({
            data: this.coreDataGetter,
            template: `
                <form action="" onsubmit="return false">
                    <label for="${this.moduleId}TotalOverride">
                        <span style="color: red;">Warning: this action is cannot be undone</span>
                        <br/>
                        Override the total value to:
                    </label>
                    <input name="totalOverride" id="${this.moduleId}TotalOverride" type="number" :step="config.step" :min="config.min" v-model="info.totalValue"/>
                </form>
            `,
            watch: {
                'info.totalValue': function() {
                    self.save();
                },
                'info.currentValue': function(value) {
                    let oldTimesReached = this.info.goalsReached;
                    self.checkGoalReached();
                    if(value != this.info.currentValue || oldTimesReached != this.info.goalsReached) {
                        self.save();
                    }
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
        this.checkGoalReached();
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
        this.checkGoalReached();
        release();
        
        this.save(); //ironically, this probably achieves that tracability mentioned in veux?
    }

    checkGoalReached() {
        let nextValue;
        let newTimesReached;
        let totalTimesReached = this.info.goalsReached;
        if(this.config.useModulo) {
            nextValue = this.config.goal == 0 ? this.info.currentValue : this.info.currentValue % this.config.goal;
            newTimesReached = this.config.goal == 0 ? 0 : Math.floor(this.info.currentValue / this.config.goal);
            totalTimesReached += newTimesReached;
        } else {
            //if not using the modulo, then keep track of all the count past the goal, and only track the first time the goal is reached
            nextValue = this.info.currentValue;
            let tmpTimesReached = this.config.goal == 0 ? 0 : (this.info.currentValue > this.config.goal ? 1 : 0);
            newTimesReached = totalTimesReached = Math.max(0, tmpTimesReached - this.info.goalsReached);
        }

        //update the data stored both in localStorage and local variables
        if(nextValue != this.info.currentValue || newTimesReached) {
            this.info.currentValue = nextValue;
            this.info.goalsReached = totalTimesReached;
        }
        if(this.config.logger && newTimesReached != 0) {
            //log events and update the stored values accordingly.
            for(let i=0; i <newTimesReached; ++i) {
                this.config.logger.log({
                    name: this.config.displayTitle + ' Goal Reached',
                    time: new Date(Date.now())
                });
            }
        }
    }
}