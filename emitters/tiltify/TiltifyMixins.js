const defaultConfig = {
};

const defaultConfigTimer = {
    extensionAmount: 0
};

async function generateBoxes() {
    // let message = document.createElement('div');
    // message.innerText = 'There are no Tiltify-specific settings at this time.';
    // this.settingsBox.appendChild(message);
    this.componentLists.settings.push({
        template: `<div>There are no Tiltify-specific settings at this time. This widget will respond to Tiltify donations.</div>`
    });
}

async function generateTimerBoxes() {
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
    let coreData = await this.coreDataPromise;
    this.componentLists.settings.push({
        data(){
            return {
                core: coreData,
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
                self.config.extraAmount = self.computeMs(result, this.minutes, this.seconds);
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
    let self=this;
    Object.assign(this.streamElementsFields, 
        {
            extensionAmount: {
                get destination(){return self.config.extensionAmount;},
                set destination(v){self.config.extensionAmount = v;},
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
            switch(event.type) {
                case 'donation':
                    this.add(event.details.amount);
                    this.requestSave(); //don't await the next save event before continuing
                    break;
            }
        }
    );
}

function streamEventListener() {
    this.service.addListener(
        event => {
            this.info.currentEvent = {
                by: event.details.name,
                detail: event.details.message.formattedAmount,
                raw: event.details
            };
            this.requestSave(); //don't await the next save event before continuing
        }
    );
}

function timerListener() {
    this.service.addListener(
        event => {
            switch(event.type) {
                case 'donation':
                    this.add(event.details.amount*this.config.extensionAmount);
                    this.updateCurrentGap();
                    this.requestSave(); //don't await the next save event before continuing
                    break;
            }
        }
    );
}

function alertListener() {
    console.log('WARNING: NOT YET IMPLEMENTED');
}

export default { 
    goal: {
        defaultConfig,
        generateBoxes,
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
        generateBoxes,
        generateSEFields,
        generateListener: streamEventListener
    },
    timer: {
        defaultConfig: defaultConfigTimer,
        generateBoxes: generateTimerBoxes,
        generateSEFields:generateSEFieldsTimer,
        generateListener: timerListener
    }
};