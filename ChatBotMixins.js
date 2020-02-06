const defaultConfig = {
    commandPrefixes: ''
};

function generateSettingsBox() {
    // super.generateSettingsBox();
    // let message = document.createElement('div');
    // message.innerText = 'There are no Tiltify-specific settings at this time.';
    // this.settingsBox.appendChild(message);
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
        async event => {
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
                        await this.add(amount);
                    } else {
                        await this.set(amount);
                    }
                } else {
                    await this.increment();
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
        async event => {
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
                await this.save();
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
        generateSettingsBox,
        listener: accumulationListener
    },
    counter: {
        defaultConfig,
        generateSettingsBox,
        listener: accumulationListener
    },
    streamEvent: {
        defaultConfig,
        generateSettingsBox,
        listener: streamEventListener
    }
};