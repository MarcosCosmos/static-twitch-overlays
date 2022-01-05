import Module from '../core/Module.js';
 
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

    populateSEFields() {
        let self=this;
        Object.assign(this.streamElementsFields, 
            {
                title: {
                    get destination(){return self.config.displayTitle;},
                    set destination(v){self.config.displayTitle = v;},
                    settings: {
                        type: 'text',
                        label: 'Title'
                        //this value will be randomly generated on the config side
                    }
                }
            }
        );

         //todo: consider if this should become static in some way and have the result passed as a constructor? it'll be easier to do it this way for now but the alternative would be more performant.
    }

    async generateBoxes() {
        await super.generateBoxes();
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
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