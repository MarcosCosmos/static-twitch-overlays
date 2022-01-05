import Module from '../core/Module.js';
import Counter from './Counter.js';
import Logger from '../emitters/log/Logger.js';


 
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
        this.logger = new Logger(this.config.moduleId);
    }

    populateSEFields() {
        super.populateSEFields();
        let self=this;
        Object.assign(this.streamElementsFields, 
            {
                goal: {
                    get destination(){return self.config.goal;},
                    set destination(v){self.config.goal = v;},
                    settings: {
                        type: 'number',
                        label: 'Goal Amount'
                    }
                },
                useModulo: {
                    get destination(){return self.config.useModulo;},
                    set destination(v){self.config.useModulo = v;},
                    settings: {
                        type: 'checkbox',
                        label: 'Looping? (goes to 0 at goal)'
                    }
                }
                //not including step or min(?); these are inferred from other settings at the mixin stage largely; may pass them in as concrete defaults in the generated html/js fragments
            }
        );
    }

    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
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
            data: () => coreData,
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
                    self.requestSave();
                },
                'info.currentValue': function(value) {
                    let oldTimesReached = this.info.goalsReached;
                    self.checkGoalReached();
                    if(value != this.info.currentValue || oldTimesReached != this.info.goalsReached) {
                        self.requestSave();
                    }
                }
            }
        });

        let loggerData = await this.logger.coreDataPromise;

        this.componentLists.controls.push({
            data() {return {
                widget: coreData,
                logger: loggerData
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
        super.increment();
        this.checkGoalReached();
    }

    /**
     * Adds the given amount to the goal progress and updates data and elements accordingly
     * @param float amount 
     */
    add(amount) {
        super.add(amount);
        this.checkGoalReached();
    }

    /**
     * Sets the goal progress to the given amount and updates data and elements accordingly
     * @param float amount 
     */
    set(amount) {
        super.set(amount);
        this.checkGoalReached();
    }

    checkGoalReached() {
        let nextValue;
        let newTimesReached;
        let totalTimesReached = this.info.goalsReached;
        if(this.config.useModulo) {
            nextValue = this.config.goal === 0 ? this.info.currentValue : this.info.currentValue % this.config.goal;
            newTimesReached = this.config.goal === 0 ? 0 : Math.floor(this.info.currentValue / this.config.goal);
            totalTimesReached += newTimesReached;
        } else {
            //if not using the modulo, then keep track of all the count past the goal, and only track the first time the goal is reached
            nextValue = this.info.currentValue;
            let tmpTimesReached = this.config.goal === 0 ? 0 : (this.info.currentValue > this.config.goal ? 1 : 0);
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

    async eraseData() {
        await super.eraseData();
        await this.logger.eraseData();
    }

}