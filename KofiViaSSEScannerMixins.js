const defaultConfig = {
    eventType: 'Subscription',
    countedObject: 'event'
};

const defaultConfigTimer =  {
    eventType: 'Subscription',
    extensionAmount: 0
};


function generateBoxes() {
    let self=this;
    this.componentLists.settings.push({
        template: `
            <form action="" onsubmit="return false">
                <div>
                    <h4>Event Type</h4>
                    <div v-for="(eventName) of events">
                        <input type="radio" name="eventType" v-model="config.eventType" :value="eventName" :id="config.moduleId + 'kofiSSE_' + eventName"/>
                        <label :for="config.moduleId + 'kofiSSE_' + eventName">{{eventName}}</label>
                    </div>
                </div>
            </form>
        `,
        data: function(){return {
            config: self.config,
            info: self.info,
            events: [
                'Donation', 'Subscription', 'Commission', 'Shop Order', 'all'
            ]
        }}
    });
}

function generateAccumulationBoxes() {
    let self=this;
    (generateBoxes.bind(this))();
    this.componentLists.settings.push({
        template: `
            <form action="" onsubmit="return false">
                <div>
                    <h4>Counting</h4>
                    <div>
                        <input type="radio" name="countedObject" v-model="config.countedObject" value="event" :id="config.moduleId + 'kofiSSE_countByEvent'"/>
                        <label :for="config.moduleId + 'kofiSSE_countByEvent'">Event Occurence</label>
                    </div>
                    <div>
                        <input type="radio" name="countedObject" v-model="config.countedObject" value="amount" :id="config.moduleId + 'kofiSSE_countByAmounted'"/>
                        <label :for="config.moduleId + 'kofiSSE_countByAmount'">Donated Amount</label>
                    </div>
                </div>
            </form>
        `,
        data: function(){return {
            config: self.config,
            info: self.info
        }}
    });
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

function accumulationListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = this.config.eventType == 'all' || event.details.type === this.config.eventType;
            if(isCorrectType) {
                switch(this.config.countedObject) {
                    case 'event':
                        this.increment();
                        this.requestSave(); //don't await the next save event before continuing
                        break;
                    case 'amount':
                        this.add(event.details.amount);
                        this.requestSave();
                        break;
                }                
            }
        }
    );
}

function streamEventListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = this.config.eventType == 'all' || event.details.type === this.config.eventType;
            if(isCorrectType) {
                this.info.currentEvent = {
                    by: event.details.from_name,
                    details: `${event.details.amount}`,
                    raw: event.details
                }
            }
        }
    );
}

function timerListener() {
    this.service.addListener(
        event => {
            let isCorrectType;
            isCorrectType = this.config.eventType == 'all' || event.details.type === this.config.eventType;
            if(isCorrectType) {
                switch(this.config.countedObject) {
                    case 'event':
                        this.add(this.config.extensionAmount);
                        this.requestSave(); //don't await the next save event before continuing
                        break;
                    case 'amount':
                        this.add(event.details.amount*this.config.extensionAmount);
                        this.requestSave();
                        break;
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
        generateBoxes: generateAccumulationBoxes,
        generateListener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateBoxes: generateAccumulationBoxes,
        generateListener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateBoxes: generateBoxes,
        generateListener: streamEventListener
    },
    timer: {
        defaultConfig: defaultConfigTimer,
        generateBoxes: generateTimerBoxes,
        generateListener: timerListener
    }
}

export default mixins;