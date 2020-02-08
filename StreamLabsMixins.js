const defaultConfig =  {
    eventType: 'donation', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list
    eventPlatform: 'streamlabs', //https://dev.streamlabs.com/docs/socket-api <--- type/for info/list,
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
                        subcription: 'Subscription',
                        host: 'Host',
                        bits: 'Bits',
                        raid: 'Raid'
                    }
                },
                youtube_account: {
                    title: 'Youtube',
                    events: {
                        follow: 'Subscription (for notifications, like a Twitch follow)',
                        subcription: 'Sponsership (like a Twitch subscription)',
                        superchat: 'Superchat'
                    }
                },
                mixer_account: {
                    title: 'Mixer',
                    events: {
                        follow: 'Follow',
                        subcription: 'Subscription',
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

function accumulationListener() {
    this.service.addListener(
        event => {
            if(event.details.for == this.config.eventPlatform && event.details.type == this.config.eventType) {
                switch(event.details.type) {
                    case 'superchat':
                        //superchats are measured in micros of a unit, so divide by 1000000 before continueing
                        event.details.message.amount /= 1000000;
                    case 'donation':
                    case 'bits':
                        this.add(event.details.message.amount);
                        break;
                    case 'follow':
                    case 'subscription':
                    case 'host':
                    case 'raid':
                        this.increment();
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
        event => {
            if(event.details.for == this.config.eventPlatform && event.details.type == this.config.eventType) {
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
                        return;//ensure no effect is had by unrecognised events

                }
                this.save();
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
    }
}

export default mixins;