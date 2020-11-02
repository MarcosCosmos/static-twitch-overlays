const defaultConfig = {
    commandPrefixes: ''
};

function generateBoxes(processor) {
    this.componentLists.settings.push({
        data: this.coreDataGetter,
        template: `
            <form action="" onsubmit="return false">
                <label :for="config.moduleId + 'commandPrefixes'">
                    Command(s) to listen for (aliases are comma seperated):
                </label>
                <input name="commandPrefixes" :id="config.moduleId + 'commandPrefixes'" v-model="config.commandPrefixes"/>
            </form>
        `,
    });
    const self = this;
    processor = processor.bind(this);
    // let regex = (makeRegex.bind(this))();
    this.componentLists.controls.push({
        data(){return {
            core: self.coreDataGetter(),
            demoResponse: ' ',
            demoCommand: ''
        }},
        computed: {
            regex() {
                let prefixes = this.core.config.commandPrefixes.split(',').map(each => each.trim());
                let regex = new RegExp(`^(${prefixes.join('|')})`);
                return regex;
            }
        },
        template: `
            <form action="" @submit.prevent="sampleCommand">
                <label :for="core.config.moduleId + 'DemoCommand'">
                    Enter Demo Command:
                </label>
                <input name="demoCommand" :id="core.config.moduleId + 'DemoCommand'" v-model="demoCommand"/>
                <button type="submit">Send</button>
                <br/>
                <strong>Response Message:</strong>
                <span>{{demoResponse}}</span>
                <div class="alert alert-primary">
                    Format: <em><strong>command</strong></em> to add 1, or <em><strong>command</strong> amount</em> to add <em>amount</em>, <em><strong>command</strong> -amount</em> to subtract <em>amount</em>, or <em><strong>command</strong> =amount</em> to set the value to exactly <em>amount</em>.
                </div>
            </form>
        `,
        methods: {
            sampleCommand(event) {
                let response = processor(
                    {
                        message: this.demoCommand,
                        tags: {
                            displayName: 'Username'
                        }
                    },
                    this.regex
                ) || '';
                this.demoResponse = response;
            }
        }
    });
}

function makeRegex() {
    let prefixes = this.config.commandPrefixes.split(',').map(each => each.trim());
    let regex = new RegExp(`^(${prefixes.join('|')})( +|$)`);
    return regex;
}

function processEventAccumulation(event, regex) {
    if(regex.test(event.message)) {
        let match = event.message.match(regex);
        let amount = NaN;
        let relative = true;
        let increment = false;
        if(match != null) {
            let payload = event.message.substr(match.index + match[0].length);
            if(payload == '') {
                increment = true;
            } else { 
                payload = payload.trim();
                if (payload[0] == '=') {
                    relative = false;
                    payload = payload.substr(1).trim();
                }
                amount = parseFloat(payload);
            }
        }
        if(increment) {
            this.increment();
        } else {
            if(!isNaN(amount) && isFinite(amount)) {
                if (relative) {
                    this.add(amount);
                } else {
                    this.set(amount);
                }
            }
        }
        return `${this.config.displayTitle} is now: ${this.info.currentValue}`;
    }
    return false;
}

async function processEventTimer(event, regex) {
    if(regex.test(event.message)) {
        let match = event.message.match(regex);
        let amount = NaN;
        let relative = true;
        let negative = false;
        if(match != null) {
            let payload = event.message.substr(match.index + match[0].length).trim();
            if(payload == 'pause' || payload == 'stop') {
                this.pause();
            } else if(payload == 'unpause' || payload == 'start') {
                this.unpause();
            }
            if(payload.length > 0) {
                if (payload[0] == '=') {
                    relative = false;
                    payload = payload.substr(1).trim();
                }
                if(payload[0] == "-") {
                    negative = true;
                    payload = payload.substr(1);
                }
                let parts = payload.split(':');
                if(parts.length == 3) {
                    parts = parts.map(each => parseFloat(each));
                    amount = this.computeMs(parts[0], parts[1], parts[2]);
                    if(negative) {
                        amount = -amount;
                    }
                }
            }
        }
        if(!isNaN(amount) && isFinite(amount)) {
            this.timeToNowIfNull();
            if (relative) {
                this.add(amount);
            } else {
                this.info.snapshotTime = new Date(Date.now());
                this.setReferenceTime(amount, this.info.snapshotTime.valueOf());
                await this.save();
            }
        }
        return `${this.config.displayTitle} is now: ${this.getHours()}:${this.getMinutes()}:${this.getSeconds()} (${this.info.isPaused ? 'paused' : 'and counting'})`;
    }
    return false;
}

async function processEventStreamEvent(event, regex) {
    if(regex.test(event.message)) {
        let match = event.message.match(regex);
        let payload = '';
        if(match != null) {
            payload = event.message.substr(match.index + match[0].length);
        }
        this.info.currentEvent = {
            by: event.tags.displayName,
            detail: payload,
            raw: event
        };
        await this.save();
        return `Message recieved! @${event.tags.displayName}`;
    }
    return false;
}

// function accumulationListener() {
//     let regex = (makeRegex.bind(this))();
//     let processor = processEventAccumulation.bind(this);
//     this.service.addListener(
//         event => {
//             let response = processor(event, regex);
//             if(response) {
//                 this.service.client.say(event.channel, response);
//             }
//         }
//     );
// }

// function streamEventListener() {
//     let regex = (makeRegex.bind(this))();
//     let processor = processEventStreamEvent.bind(this);
//     this.service.addListener(
//         event => {
//             let response = processor(event, regex);
//             if(response) {
//                 this.service.client.say(event.channel, response);
//             }
//         }
//     );
// }

function parameterisedListener(processor) {
    let regex = (makeRegex.bind(this))();
    processor = processor.bind(this);
    this.service.addListener(
        async event => {
            let response = await processor(event, regex);
            if(response) {
                this.service.client.say(event.channel, response);
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
        generateBoxes(){(generateBoxes.bind(this))(processEventAccumulation)},
        generateListener(){(parameterisedListener.bind(this))(processEventAccumulation)}
    },
    counter: {
        defaultConfig,
        generateBoxes(){(generateBoxes.bind(this))(processEventAccumulation)},
        generateListener(){(parameterisedListener.bind(this))(processEventAccumulation)}
    },
    streamEvent: {
        defaultConfig,
        generateBoxes(){(generateBoxes.bind(this))(processEventStreamEvent)},
        generateListener(){(parameterisedListener.bind(this))(processEventStreamEvent)}
    },
    timer: {
        defaultConfig,
        generateBoxes(){(generateBoxes.bind(this))(processEventTimer)},
        generateListener(){(parameterisedListener.bind(this))(processEventTimer)}
    }
};