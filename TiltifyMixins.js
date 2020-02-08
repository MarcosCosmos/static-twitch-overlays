const defaultConfig = {
};

function generateBoxes() {
    // super.generateBoxes();
    // let message = document.createElement('div');
    // message.innerText = 'There are no Tiltify-specific settings at this time.';
    // this.settingsBox.appendChild(message);
    this.componentLists.settings.push({
        template: `<div>There are no Tiltify-specific settings at this time. This widget will respond to Tiltify donations.</div>`
    });
}

function accumulationListener() {
    this.service.addListener(
        event => {
            switch(event.type) {
                case 'donation':
                    this.add(event.details.amount);
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
            this.save();
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