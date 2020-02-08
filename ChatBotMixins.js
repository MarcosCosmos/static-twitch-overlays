const defaultConfig = {
    commandPrefixes: ''
};

function generateBoxes() {
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
    const processor = processEventAccumulation.bind(this);
    let regex = (makeRegex.bind(this))();
    this.componentLists.controls.push({
        data(){return {
            core: self.coreDataGetter(),
            demoResponse: ' ',
            demoCommand: '',
        }},
        template: `
            <form action="" v-on:submit.prevent="sampleCommand">
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
            sampleCommand() {
                this.demoResponse = processor(
                    {
                        message: this.demoCommand,
                        tags: {
                            displayName: 'Username'
                        }
                    },
                    regex
                ) || '';
                return false;
            }
        }
    });
}

function makeRegex() {
    let prefixes = this.config.commandPrefixes.split(',');
    let regex = new RegExp(`^(${prefixes.join('|')})`);
    return regex;
}

function processEventAccumulation(event, regex) {
    if(regex.test(event.message)) {
        let match = event.message.match(regex);
        let amount = NaN;
        let relative = true;
        if(match != null) {
            let payload = event.message.substr(match.index + match[0].length).trim();
            if (payload[0] == '=') {
                relative = false;
                payload = payload.substr(1).trim();
            }
            amount = parseFloat(payload);
        }
        if(!isNaN(amount) && isFinite(amount)) {
            if (relative) {
                this.add(amount);
            } else {
                this.set(amount);
            }
        } else {
            this.increment();
        }
        return `${this.config.displayTitle} is now: ${this.info.currentValue}`;
    }
    return false;
}


function processEventStreamEvent(event, regex) {
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
        this.save();
        return `Message recieved! @${event.tags.displayName}`;
    }
    return false;
}

function accumulationListener() {
    let regex = (makeRegex.bind(this))();
    let processor = processEventAccumulation.bind(this);
    this.service.addListener(
        event => {
            let response = processor(event, regex);
            if(response) {
                this.service.client.say(event.channel, response);
            }
        }
    );
}

function streamEventListener() {
    let regex = (makeRegex.bind(this))();
    let processor = processEventStreamEvent.bind(this);
    this.service.addListener(
        event => {
            let response = processor(event, regex);
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
        generateBoxes,
        generateListener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateBoxes,
        generateListener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateBoxes,
        generateListener: streamEventListener
    }
};