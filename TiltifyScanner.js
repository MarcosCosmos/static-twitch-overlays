import Module from './Module.js';
const defaultData = {
    //track the amount raised so we only raise events when that changes
    donoPaginationMark: null
};
const defaultSettings = {
    accessToken: '',
    campaignId: '',
};
class TiltifyScanner extends Module {
    constructor(config) {
        /**
         * config: {
         *     scanDelay: integer, expressed in ms, (suggested: 30s (30000ms))
         * }
         */
        config.prefix = 'tiltifyScanner';
        config.displayTitle = 'Tiltify API';
        config.defaultData = defaultData;
        config.defaultSettings = defaultSettings;
        super(config);

        this.listeners = [];

        this.scanningInterval = null;
    }

    generateSensitiveSettingsBox() {
        this.sensitiveSettingsBox = document.createElement('div');
        this.sensitiveSettingsBox.classList.add('settingsBox');
        this.sensitiveSettingsBox.id = `${this.prefix}SettingsBox`;
        
        this.sensitiveSettingsBox.innerHTML = `
            <h3>${this.moduleConfig.displayTitle}</h3>
            <div>
                <label for="${this.prefix}AccessToken">
                   Access Token:
                </label>
                <input name="${this.prefix}AccessToken" id="${this.prefix}AccessToken" value="${this.settings.accessToken}"/>
            </div>
            <div>
                <label for="${this.prefix}CampaignId">
                   Campaign ID:
                </label>
                <input name="${this.prefix}CampaignId" id="${this.prefix}CampaignId" value="${this.settings.campaignId}"/>
            </div>
        `;
        
        this.settingsElms.accessToken = this.sensitiveSettingsBox.querySelector(`:scope #${this.prefix}AccessToken`),
        this.settingsElms.campaignId = this.sensitiveSettingsBox.querySelector(`:scope #${this.prefix}CampaignId`);
    }

    generateControlsBox() {
        this.controlsBox = document.createElement('div');
        this.controlsBox.classList.add('controlsBox');
        this.controlsBox.id = `${this.prefix}ControlsBox`;

        this.controlsBox.innerHTML = `
            <h3>${this.moduleConfig.displayTitle}</h3>
            <div>
                <span style="color: red;">Warning: this action is cannot be undone</span>
                <button type="button" class="eraseButton">Erase Data</button>
            </div>
        `;

        let eraseButton = this.controlsBox.querySelector(':scope .eraseButton');
        eraseButton.onclick = event => {
            eraseButton.disabled = true;
            this.data = defaultData;
            this.updateElements();
            this.save();
            eraseButton.disabled = false;
        }

    }


    save() {
        this.storeItems(this.data);
        this.storeItems(this.settings);
    }

    async checkCampaign() {
        let atEnd = false;
        let params = {
            count: 10
        };
        let mostRecentlySeen = this.loadData.donoPaginationMark;
        if(this.data.donoPaginationMark && !isNaN(this.data.donoPaginationMark)) {
            params.after = this.data.donoPaginationMark;
        }
        let firstPass = true;
        while(!atEnd) {
            //do an api call to check for duration extensions and update the extension amount!
            let request = new XMLHttpRequest();
            try {
                
                
                let response = (await (await fetch(
                    `https://tiltify.com/api/v3/campaigns/${this.settings.campaignId}/donations?${new URLSearchParams(params).toString()}`,
                    {
                        method: 'GET',
                        headers: new Headers({'Authorization': `Bearer ${this.settings.accessToken}`})
                    }
                )).json());
                let donations = response.data;
                
                if(donations.length > 0) {
                    if(firstPass) {
                        //the results start from the most recent if before is ommitted, so on the first pass we find the limit for the next check, then we have to keep scanning back through history to get up to what we saw on the last check
                        this.data.donoPaginationMark = new URLSearchParams(response.links.next).get('after');
                        this.storeItems(this.data);
                        firstPass = false;
                    }
                    for(const each of donations) {
                        for(const eachListener of this.listeners) {
                            eachListener({
                                type: 'donation',
                                details: each
                            });
                        }
                    }
                }
                if(response.links.prev.length > 0) {
                    let tmp = new URLSearchParams(response.links.prev).get('before');
                    if(tmp) {
                        params.before = tmp;
                    }
                } else {
                    atEnd = true;
                }
                if(response.links.next.length == 0) {
                    atEnd = true;
                }
            } catch (e) {
                console.error(e);
                atEnd = true;
            }
        }
    }

    startScanning() {
        this.checkCampaign();
        this.scanningInterval = setInterval(
            this.checkCampaign.bind(this),
            this.moduleConfig.scanDelay
        );
    }

    stopScanning() {
        clearInterval(this.scanningInterval);
        this.scanningInterval = null;
    }

    updateSettings() {
        this.stopScanning();
        super.updateSettings();
        this.startScanning();
    }

    //for now listeners are simple callbacks of the forms (event) => {/*work*/};
    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners.remove(listener);
    }
}

export default TiltifyScanner;