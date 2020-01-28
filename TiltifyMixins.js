const defaultConfig = {
};

function generateSettingsBox() {
    // super.generateSettingsBox();
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

function displayListener() {
    this.service.addListener(
        event => {
            this.info.currentEvent = {
                by: event.details.name,
                detail: event.details.message.formattedAmount
            };
            this.save();
        }
    );
}

function alertListener() {
    console.log('WARNING: NOT YET IMPLEMENTED');
}

export default { defaultConfig, generateSettingsBox, accumulationListener, displayListener, alertListener};