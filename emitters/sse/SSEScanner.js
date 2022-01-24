import EventEmitter from '../EventEmitter.js';
import Module from '../../core/Module.js';

const defaultConfig = {
    sourceURL: '',
    moduleId: 'seeEventScanner',
    displayTitle: 'SSE Event Scanner',
    rememberedEventLimit: 100,
    defaultData: {
        rememberedEvents: []
    }
};

class SSEScanner extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.eventSourceObj = null;
    }
    async generateBoxes() {
        await super.generateBoxes();
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
            template: `
                <div>
                    <h4>Authentication Settings</h4>
                    <form action="" onsubmit="return false">
                        <label :for="config.moduleId + 'sourceURL'">
                            Event Source URL:
                        </label>
                        <input name="sourceURL" type="text" :id="config.moduleId + 'sourceURL'" v-model="config.sourceURL"/>
                        <br/>

                        <label :for="config.moduleId + 'rememberedEventLimit'">
                            Number of Cached Events:
                        </label>
                        <input name="rememberedEventLimit" type="text" :id="config.moduleId + 'rememberedEventLimit'" v-model="config.rememberedEventLimit"/>
                    </form>
                </div>
            `
        });
    }

    async start() {
        this.eventSourceObj = new EventSource(this.config.sourceURL);

        this.eventSourceObj.addEventListener('kofi-events', e => {
            if(!this.info.rememberedEvents.includes(e.lastEventId)) {
                this.info.rememberedEvents.push(e.lastEventId);
                if(this.info.rememberedEvents.length > this.config.rememberedEventLimit) {
                    this.info.rememberedEvents = this.info.rememberedEvents.slice(Math.max(0, this.info.rememberedEvents.length - this.config.rememberedEventLimit));
                }
                this.requestSave();
                this.onEvent(e);
            }
        });
        await new Promise((resolve) => this.eventSourceObj.onopen = resolve);
    }

    async onEvent(event) {
        for(const eachListener of this.listeners) {
            try {
                //possibly don't need to await each listener anymore since they control their own data lock? however, having the await here allowed the listener to dictate that.
                await eachListener({
                    type: 'serverSentEvent',
                    details: JSON.parse(event.data)
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    async stop() {
        if(this.eventSourceObj) {
            await this.eventSourceObj.close();
            this.eventSourceObj = null;
        }   
    }
}

export {SSEScanner as default, defaultConfig};