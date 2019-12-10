/*
    This defines the base/common contents of an overlay module, which gets interacted with by the core
*/
export default class Module {
    constructor(config) {
        this.moduleConfig = config;
        this.prefix = config.prefix;

        this.settingsElms = {}; //note: intended to include both sensitive and safe settings
       
        this.loadData();
        this.loadSettings();

        //note that settings and data are things cached into localstorage.
        this.generateSettingsBox();
        this.generateSensitiveSettingsBox();
        this.generateControlsBox();

        this.generateDisplayBox();
        this.generateInfoBox();
        
        // this.updateDisplay();
    }

    /**
     * Should generate the box fully up to date with current data
     */
    generateDisplayBox() {
        this.displayBox =  null;
    }

    /**
     * Should generate the box fully up to date with current data
     */
    generateInfoBox() {
        this.infoBox = null;
    }

    /**
     * Should generate the box fully up to date with current data
     */
    generateSensitiveSettingsBox() {
        this.sensitiveSettingsBox = null;
    }

    /**
     * Should generate the box fully up to date with current data
     */
    generateSettingsBox() {
        this.generalSettingsBox = null;
    }

    /**
     * Should generate the box fully up to date with current data
     */
    generateControlsBox() {
        this.controlsBox = null;
    }

    loadData() {
        this.data = {};
        if(this.moduleConfig.defaultData) {
            for(let each in this.moduleConfig.defaultData) {
                this.data[each] = this.moduleConfig.defaultData[each];
            }
            this.getItems(this.data);
        }
    }

    loadSettings() {
        this.settings = {};
        if(this.moduleConfig.defaultData) {
            for(let each in this.moduleConfig.defaultSettings) {
                this.settings[each] = this.moduleConfig.defaultSettings[each];
            }
            this.getItems(this.settings);
        }
    }

    
    /**
     * Update the settings based on form data
     */
    updateSettings() {
        if(Object.keys(this.settingsElms).length > 0) {
            for(let eachName in this.settings) {
                this.settings[eachName] = this.settingsElms[eachName].value;
            }
            this.storeItems(this.settings);
        }
    }

    save() {
        this.storeItems(this.data);
        this.storeItems(this.settings);
    }

    /**
     * Updates all display elements (i.e. including the info box)
     */
    updateElements() {
        
    }

    /**
     * replaces existing values with those in local storage, where it exists
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    getItems(destination) {
        for(let eachName in destination) {
            let tmp = localStorage.getItem(`${this.prefix}${eachName}`);
            if(tmp !== null) {
                destination[eachName] = JSON.parse(tmp);;
            }
        }
    }

    /**
     * 
     * @param Object destination 
     * Note: this method can only safely deal with JSON-compatible data
     */
    storeItems(destination) {
        for(let eachName in destination) {
            localStorage.setItem(`${this.prefix}${eachName}`, JSON.stringify(destination[eachName]));
        }
    }
}