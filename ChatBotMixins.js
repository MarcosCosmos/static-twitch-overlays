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
}

function accumulationListener() {
    let prefixes = this.config.commandPrefixes.split(',');
    let regex = new RegExp(`^(${prefixes.join('|')})`)
    this.service.addListener(
        event => {
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
                this.service.client.say(event.channel, `${this.config.displayTitle} is now: ${this.info.currentValue}`);
            }
        }
    );
}

function streamEventListener() {
    let prefixes = this.config.commandPrefixes.split(',');
    let regex = new RegExp(`^(${prefixes.join('|')})`)
    this.service.addListener(
        event => {
            if(regex.test(event.message)) {
                let match = event.message.match(regex);
                let msg = '';
                if(match != null) {
                    msg = event.message.substr(match.index + match[0].length);
                }
                this.info.currentEvent = {
                    by: event.tags.displayName,
                    detail: msg,
                    raw: event
                };
                this.save();
                this.service.client.say(event.channel, `Message recieved! @${event.tags.displayName}`);
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
        listener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateBoxes,
        listener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateBoxes,
        listener: streamEventListener
    }
};