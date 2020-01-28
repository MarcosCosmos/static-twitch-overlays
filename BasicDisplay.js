import Module from './Module.js';
 
let defaultConfig;
{
    let exampleTitle = `{Widget Title}`;
    defaultConfig = {
        displayTitle: exampleTitle
    };
}

/**
 * Note this basic/base goal doesn't include an updating mechanism in and of itself other than manually through settings, and should be extended with subclasses that interact with other modules (such a streamlabs socket.io module) to listen for updates
 */
export default class BasicDisplay extends Module {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
    }
    generateSettingsBox() {
        super.generateSettingsBox();

        this.componentLists.settings.push({
            data: this.coreDataGetter,
            template: `
                <form action="" onsubmit="return false">
                    <label :for="config.moduleId + 'DisplayTitleSetting'">
                        Title:
                    </label>
                    <input name="displayTitle" :id="config.moduleId + 'DisplayTitleSetting'" type="text" v-model="config.displayTitle"/>
                </form>
            `
        });
    }
}