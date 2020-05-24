import Module from './Module.js';
import Counter from './Counter.js';
import Logger from './Logger.js';


 
let defaultConfig;
{
    defaultConfig = {
        goal: 1,
        // settingsTitle: exampleTitle,
        step: 'any',
        min: 0,
        useModulo: false, //indicates whether or not to roll over to 0 when a goal is reached,
        defaultData: {
            totalValue: 0,
            goalsReached: 0
        }
    };
}

/**
 * Note this basic/base goal doesn't include an updating mechanism in and of itself other than manually through settings, and should be extended with subclasses that interact with other modules (such a streamlabs socket.io module) to listen for updates
 */
export default class BasicGoal extends Counter {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
        this.logger = new Logger({moduleId: `${this.config.moduleId}_log`});
    }

    generateBoxes() {
        super.generateBoxes();
        let self=this;
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
                'info.currentValue': async function(value) {
                    let oldTimesReached = this.info.goalsReached;
                    self.checkGoalReached();
                    if(value != this.info.currentValue || oldTimesReached != this.info.goalsReached) {
                        self.save();
                    }
                }
            }
        });
        this.componentLists.controls.push({
            data() {return {
                widget: self.coreDataGetter(),
                logger: self.logger.coreDataGetter()
            }},
            computed: {
                eventsToShow() {
                    return this.logger.info.events.slice(0, 100);
                }
            },
            template: `
                <div class="displayBox logBox" ref="displayBox">
                    <h1>{{widget.config.displayTitle}} Log</h1>
                    <div class="eventListCon">
                        <ul class="eventList">
                            <li v-for="each in eventsToShow">
                                <strong>Type: </strong><span class="eventName">{{each.name}}</span>
                                <br/>
                                <strong>Time: </strong><span class="eventTime">{{each.time.toLocaleString()}}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            `
        });
    }

    // generateSettingsBox() {
    //     super.generateSettingsBox();
        
    // }

    // generateControlsBox() {
    //     super.generateControlsBox();
        
    // }

    /**
     * Adds 1 the goal progress and updates data and elements accordingly
     */
    increment() {
        ++this.info.currentValue;
        ++this.info.totalValue;
        this.checkGoalReached();
        this.save(); //ironically, this probably achieves that tracability mentioned in veux?
    }

    /**
     * Adds the given amount to the goal progress and updates data and elements accordingly
     * @param float amount 
     */
    add(amount) {
        this.info.currentValue += amount;
        this.info.totalValue += amount;
        this.checkGoalReached();
        this.save(); //ironically, this probably achieves that tracability mentioned in veux?
    }

    /**
     * Sets the goal progress to the given amount and updates data and elements accordingly
     * @param float amount 
     */
    set(amount) {
        this.info.totalValue += this.info.currentValue-amount;
        this.info.currentValue = amount;
        this.checkGoalReached();
        this.save();
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
        if(newTimesReached != 0) {
            //log events and update the stored values accordingly.
            for(let i=0; i <newTimesReached; ++i) {
                this.logger.log({
                    name: `Goal (${this.config.displayTitle}) Reached!`,
                    time: new Date(Date.now())
                });
            }
        }
    }

    eraseData() {
        super.eraseData();
        this.logger.eraseData();
    }

}