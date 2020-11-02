const defaultConfig =  {
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
};

const defaultConfigTimer =  {
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
    extensionAmount: 0
};

function generateBoxes() {
    let self=this;
    this.componentLists.settings.push({
        template: `
            <form action="" onsubmit="return false">
                <div>
                    <h4>Platform:</h4>
                    <div v-for="(platform, platformId) of platforms">
                        <input type="radio" name="eventPlatform" v-model="config.eventPlatform" :value="platformId" :id="'slEventPlatform_' + platformId"/>
                        <label :for="'slEventPlatform_' + platformId">{{platform.title}}</label>
                    </div>
                </div>
                <div>
                    <h4>Event Type</h4>
                    <div v-for="(eventTitle, eventId) of selectedPlatform.events">
                        <input type="radio" name="eventType" v-model="config.eventType" :value="eventId" :id="'slEvent_' + eventId"/>
                        <label :for="'slEvent_' + eventId">{{eventTitle}}</label>
                    </div>
                </div>
            </form>
        `,
        data: function(){return {
            config: self.config,
            info: self.info,
            platforms: {
                streamlabs: {
                    title: 'Streamlabs',
                    events: {
                        donation: 'Donation'
                    }
                },
                twitch_account: {
                    title: 'Twitch',
                    events: {
                        follow: 'Follow',
                        subscription: 'Subscription',
                        host: 'Host',
                        bits: 'Bits',
                        raid: 'Raid'
                    }
                },
                youtube_account: {
                    title: 'Youtube',
                    events: {
                        follow: 'Subscription (for notifications, like a Twitch follow)',
                        subscription: 'Sponsership (like a Twitch subscription)',
                        superchat: 'Superchat'
                    }
                },
                mixer_account: {
                    title: 'Mixer',
                    events: {
                        follow: 'Follow',
                        subscription: 'Subscription',
                        host: 'Host'
                    }
                }
            }
        }},
        computed: {
            selectedPlatform() {
                return this.platforms[this.config.eventPlatform];
            }
        },
        watch: {
            selectedPlatform(newValue) {
                let newOptions = Object.keys(newValue.events);
                if(newOptions.indexOf(this.config.eventType) == -1){
                    this.config.eventType = newOptions[0];
                }
            },
        }
    });
}


function generateGoalBoxes() {
    (generateBoxes.bind(this))();
    this.componentLists.settings[this.componentLists.settings.length-1].watch['config.eventType'] = function(newValue) {
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
    this.componentLists.settings[this.componentLists.settings.length-1].watch['config.eventType'] = function(newValue) {
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

function accumulationListener() {
    this.service.addListener(
        async event => {
            if(event.details.for == this.config.eventPlatform && event.details.type == this.config.eventType) {
                let amount = event.details.message.amount;
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                        amount /= 1000000;
                    case 'donation':
                    case 'bits':
                        {
                        let lock = await this.requestDataLock();
                        this.add(amount);
                        await this.save(lock);
                        }
                        break;
                    case 'follow':
                    case 'subscription':
                    case 'host':
                    case 'raid':
                        {
                        let lock = await this.requestDataLock();
                        await this.increment();
                        await this.save(lock);
                        }
                        break;
                    default:
                        return;//ensure no effect is had by unrecognised events

                }

                
            }
        }
    );
}

function streamEventListener() {
    this.service.addListener(
        async event => {
            if(event.details.for == this.config.eventPlatform && event.details.type == this.config.eventType) {
                let lock = await this.requestDataLock();
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
                    case 'host':
                    case 'raid':
                        this.info.currentEvent = {
                            by: event.details.message.name,
                            raw: event.details
                        };
                        break;
                    default:
                        lock.release();
                        return;//ensure no effect is had by unrecognised events

                }
                await this.save(lock);
            }
        }
    );
}

function timerListener() {
    this.service.addListener(
        async event => {
            if(event.details.for == this.config.eventPlatform && event.details.type == this.config.eventType) {
                let amount = event.details.message.amount;
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                        amount /= 10000;
                    case 'bits':
                        amount /= 100
                    case 'donation':
                        {
                        let lock = await this.requestDataLock();
                        this.add(amount*this.config.extensionAmount);
                        }
                        break;
                    case 'follow':
                    case 'subscription':
                    case 'host':
                    case 'raid':
                        {
                        let lock = await this.requestDataLock();
                        await this.add(this.config.extensionAmount);
                        this.save(lock);
                        }
                        break;
                    default:
                        return;//ensure no effect is had by unrecognised events

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
        generateListener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateBoxes,
        generateListener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateBoxes: generateStreamEventBoxes,
        generateListener: streamEventListener
    },
    timer: {
        defaultConfig: defaultConfigTimer,
        generateBoxes: generateTimerBoxes,
        generateListener: timerListener
    }
}

export default mixins;