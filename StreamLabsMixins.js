const defaultConfig =  {
};

const defaultConfigTimer =  {
    extensionAmount: 0
};

//todo: figure out how much of these mixins to merge into the main settings for the purpose uniformity with se-settings?

function generateBoxes() {
}

function generateGoalBoxes() {
    (generateBoxes.bind(this))();
    let targetSettingsBox = this.service.componentLists.settings[this.service.componentLists.settings.length-1];
    targetSettingsBox.watch = targetSettingsBox.watch || {};
    targetSettingsBox.watch['config.eventType'] = function(newValue) {
        switch(newValue) {
            case 'donation':
            case 'superchat':
                this.config.step =
                    this.config.min = .01;
                break;
            default:
                this.config.step =
                    this.config.min = 1;
        }
        this.config.goal = Math.max(this.config.goal, this.config.min);;
    }
}

function generateStreamEventBoxes() {
    (generateBoxes.bind(this))();
    let targetSettingsBox = this.service.componentLists.settings[this.service.componentLists.settings.length-1];
    targetSettingsBox.watch = targetSettingsBox.watch || {};
    targetSettingsBox.watch['config.eventType'] = function(newValue) {
        switch(newValue) {
            case 'donation':
            case 'superchat':
            case 'bits':
                this.config.nameOnly = false;
                break;
            default:
                this.config.nameOnly = true;
        }
        this.config.goal = Math.max(this.config.goal, this.config.min);;
    }
}


function generateTimerBoxes() {
    (generateBoxes.bind(this))();
    function hoursIn(ms) {                    
        let denominator = 1000*60*60;
        let result = ms/denominator;
        return result > 0 ? Math.floor(result) : Math.ceil(result);
    }
    function minutesIn(ms) {
        let denominator = 1000*60;
        let result = (ms % (60*denominator))/denominator;
        return result > 0 ? Math.floor(result) : Math.ceil(result);
    }
    function secondsIn(ms) {
        let denominator = 1000;
        let result = Math.round((ms % (60*denominator))/denominator);
        return result > 0 ? Math.min(result, 59) : Math.max(result, -59);
    }

    let self=this;
    this.componentLists.settings.push({
        data(){
            return {
                core: self.coreDataGetter(),
                hours: hoursIn(self.config.extensionAmount),
                minutes: minutesIn(self.config.extensionAmount),
                seconds: secondsIn(self.config.extensionAmount)
            }
        },
        template: `
            <form action="" onsubmit="return false">
                <div>
                    <label :for="core.config.prefix + 'dummyHours'">
                        Amount of time to add (hours:minutes:seconds):
                    </label>
                    <div>
                        <input name="dummyHours" type="number" step="1" v-model="dummyHours" :id="core.config.prefix + 'addedHours'"/>
                        :
                        <input name="dummyMinutes" type="number" step="1" v-model="dummyMinutes"/>
                        :
                        <input name="dummySeconds" type="number" step="1" v-model="dummySeconds"/>
                    </div>
                    <br/>
                    <span class="alert alert-primary">This is the amount of time added each time a user follows, or per dollar donated (or equivilant whole unit in your currency), or per 100 bits - whichever the timer is configured for</span>
                </div>
            </form>
        `,
        computed: {
            timerMode: {
                get() {
                    return self.info.timerMode;
                },
                set(newValue) {
                    self.setMode(newValue);
                }
            },
            dummyHours: {
                get() {
                    return this.hours;
                },
                set(newValue) {
                    let result = parseInt(newValue,10);
                    if(!isNaN(result)) {
                        this.updateAmount(result, this.minutes, this.seconds);
                    }
                }
            },
            dummyMinutes: {
                get() {
                    return this.minutes;
                },
                set(newValue) {
                    let result = parseInt(newValue,10);
                    if(!isNaN(result)) {
                        this.updateAmount(this.hours, result, this.seconds);
                    }
                }
            },
            dummySeconds: {
                get() {
                    return this.seconds;
                },
                set(newValue) {
                    let result = parseInt(newValue,10);
                    if(!isNaN(result)) {
                        this.updateAmount(this.hours, this.minutes, result);
                    }
                }
            }
        },
        watch: {
            'core.config.extensionAmount': function() {
                this.updateParts();
            }
        },
        methods: {
            updateAmount(hours, minutes, seconds) {
                self.config.extensionAmount = self.computeMs(hours, minutes, seconds);
            },
            updateParts() {
                this.hours = hoursIn(self.config.extensionAmount);
                this.minutes = minutesIn(self.config.extensionAmount);
                this.seconds = secondsIn(self.config.extensionAmount);
            }
        }
    });
}

function generateSEFields() {
}

function generateSEFieldsTimer() {
    Object.assign(this.streamElementsFields, 
        {
            extensionAmount: {
                destination: this.config.extensionAmount,
                settings: {
                    type: 'number',
                    step: 1,
                    label: 'Time to add per event/dollar/100-bits donated (seconds))'
                }
            }
        }
    );
}

function accumulationListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = event.details.type === this.service.config.eventType;
            if(event.details.for === this.service.config.eventPlatform && isCorrectType) {
                let amount = event.details.message.amount;
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continuing
                        amount /= 1000000;
                    case 'donation':
                    case 'bits':
                        {
                        this.add(amount);
                        this.requestSave(); //don't await the next save event before continuing
                        }
                        break;
                    case 'follow':
                    case 'subscription':
                    case 'host':
                    case 'raid':
                        {
                        this.increment();
                        this.requestSave(); //don't await the next save event before continuing
                        }
                        break;
                    default:
                        return; //lock wasn't grabbed

                }                
            }
        }
    );
}

function streamEventListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = event.details.type === this.service.config.eventType;
            if(event.details.for === this.service.config.eventPlatform && isCorrectType) {
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                        this.info.currentEvent = {
                            by: event.details.message.name,
                            detail: event.details.message.displayString,
                            raw: event.details
                        };
                        break;
                    case 'donation':
                        this.info.currentEvent = {
                            by: event.details.name,
                            detail: event.details.message.formattedAmount,
                            raw: event.details
                        };
                        break;
                    case 'bits':
                        this.info.currentEvent = {
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
                        this.info.currentEvent = {
                            by: event.details.message.name,
                            raw: event.details
                        };
                        break;
                    default:
                        return;

                }
                this.requestSave(); //don't await the next save event before continuing
            }
        }
    );
}

function timerListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = event.details.type === this.service.config.eventType;
            if(event.details.for === this.service.config.eventPlatform && isCorrectType) {
                let amount = event.details.message.amount;
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                        amount /= 10000;
                    case 'bits':
                        amount /= 100
                    case 'donation':
                        {
                        this.add(amount*this.config.extensionAmount);
                        this.updateCurrentGap();
                        this.requestSave(); //don't await the next save event before continuing
                        }
                        break;
                    case 'follow':
                    case 'subscription':
                    // case 'resub':
                    case 'host':
                    case 'raid':
                        {
                        this.add(this.config.extensionAmount);
                        this.updateCurrentGap();
                        this.requestSave(); //don't await the next save event before continuing
                        }
                        break;
                    default:
                        return; //lock wasn't grabbed

                }
            }
        }
    );
}

function alertListener() {
    console.log('WARNING: NOT YET IMPLEMENTED');
}

let mixins = {
    goal: {
        defaultConfig,
        generateBoxes: generateGoalBoxes,
        generateSEFields,
        generateListener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateBoxes,
        generateSEFields,
        generateListener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateBoxes: generateStreamEventBoxes,
        generateSEFields,
        generateListener: streamEventListener
    },
    timer: {
        defaultConfig: defaultConfigTimer,
        generateBoxes: generateTimerBoxes,
        generateSEFields: generateSEFieldsTimer,
        generateListener: timerListener
    }
}

export default mixins;