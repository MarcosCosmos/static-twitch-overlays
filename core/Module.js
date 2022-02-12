
import Lock from './Lock.js';
let defaultConfig;
{
    defaultConfig = {
        moduleId: 'exampleWidget', //note: displayable, numeric moduleIdes should be managable via css
        saveCooldown: 10000, //save no more than once every 10 seconds
        defaultData: {},
    };
}

// let localStorageWrapper = {
//     get: (k) => localStorage.getItem(k),
//     set: (k,v) => localStorage.setItem(k,v)
// }

/*
    This defines the base/common contents of an overlay module, which gets interacted with by the core
*/
class ModuleBase {
    /**
     * creates a deep copy
     */
    static mixin(initial, source) {
        return ModuleBase.assigningDeepMixin(JSON.parse(JSON.stringify(initial)), source);
    }

    static assigningDeepMixin(destination, source) {
        let recursingAssign = (destination, source) => {
            for(const eachKey of Object.keys(source)) {
                if(!destination.hasOwnProperty(eachKey) || destination[eachKey] === null || (!(source[eachKey] instanceof Object) || source[eachKey] instanceof Array)) {
                    destination[eachKey] = source[eachKey];
                } else {
                    recursingAssign(destination[eachKey], source[eachKey]);
                }
            }
        };
        recursingAssign(destination, source);
        return destination;
    }

    constructor(config={}) {
        this.config = Module.mixin(defaultConfig, config);
        this.info = Module.mixin({}, this.config.defaultData);
        this.dataLock = Lock.build(`Data-lock (${this.config.moduleId})`); //todo: consider if this second datalock is even neccessary anymore? it doesn't hurt, and would neccessary outside of JS, but still.
        this.saveLock = Lock.build(`Save-lock (${this.config.moduleId})`);
        this.isSavePending = false;
        this.coreDataPromise = new Promise((resolve) => {
            this.dataLock = this.dataLock
                .then(() => this.loadInfo())
                .then(() => {
                    this.componentLists = {};

                    this.boxes = {};

                    for(const each of ['display', 'info', 'settings', 'controls']) {
                        this.componentLists[each] = [];
                    }

                    /*
                    * format {name: {destination: this.config.something, settings: {sePropName: value,}},}
                    */
                    this.streamElementsFields = {};
                    
                    this.config = Vue.reactive(this.config);
                    this.info = Vue.reactive(this.info);

                    //prepare this for most of the boxes
                    let coreData = {
                        config: this.config,
                        info: this.info
                    };

                    resolve(coreData);
                });
        });
    }

    /**
     * Note: it is not neccessary to fill in the 'value' property - it is automatically populated from the destination when the json is generated by the configuration form scripts.
     * The following fields are reserved and these comments describe the config/data values they override when loaded.
     * widgetName -> config.displayTitle
     * widgetAuthor -> N/A
     * widgetDuration -> N/A (for now)
     */
    populateSEFields() {
        let self=this;
        Object.assign(this.streamElementsFields, 
            {
                dataScope: {
                    get destination(){return self.config.moduleId;},
                    set destination(v){self.config.moduleId = v;},
                    settings: {
                        type: 'text',
                        label: 'Module ID (Widgets with the same Module ID will share and display the same data)'
                        //this value will be randomly generated on the config side
                    }
                }
            }
        );

         //todo: consider if this should become static in some way and have the text passed as a constructor? it'll be easier to do it this way for now but the alternative would be more performant.
    }
    
    async generateBoxes() {
        // this.generateDisplayBox();//note that settings and data are things cached into localstorage.
        // this.generateInfoBox();
        // this.generateControlsBox();
        // this.generateSettingsBox();
        // this.generateSensitiveSettingsBox();

        let coreData = await this.coreDataPromise;

        let self=this;
        this.componentLists.settings.push({
            data: () => coreData,
            template: `<h3>{{config.displayTitle}} Settings ({{config.moduleId}})</h3>`
        });

        this.componentLists.info.push(
            {
                data: () => coreData,
                template: `<h3>{{config.displayTitle}} Information</h3>`
            }
        );
        this.componentLists.info.push({
            data: () => coreData,
            template: `
                <div>
                    <div>
                        Current Data: <pre class="currentData">{{JSON.stringify(info, null, 4)}}</pre>
                    </div>
                    <div>
                        Current Settings: <pre class="currentConfig">{{JSON.stringify(config, null, 4)}}</pre>
                    </div>
                </div>
            `
        });
        this.componentLists.controls.push({
            data: () => coreData,
            template: `<h3>{{config.displayTitle}} Controls</h3>`
        });
        this.componentLists.controls.push({
            data: () => coreData,
            template: `
                <form action="" onsubmit="return false">
                    <div class="configBox">
                        <span style="color: red;">Warning: this action is cannot be undone</span>
                        &nbsp;
                        <button type="button" class="eraseButton" v-on:click="eraseData">Erase Data</button>
                    </div>

                    <div class="configBox">
                        <button type="button" class="saveButton" v-on:click="saveData">Save Data</button>
                    </div>
                </form>
            `,
            methods: {
                async eraseData() {
                    self.eraseData();
                },
                saveData() {
                    self.requestSave();
                }
            }
        });
    }

    /**
     * Shouldn't be called in the constructor chain since it essentially shoe-horns lists of components into object-maps for later use
     * @returns a promise indicating it's completion
     */
    async finalizeBoxes() {
        this.finalizeBoxes = async () => {await this.dataLock};
        this.dataLock = this.dataLock.then(()=>this.generateBoxes())
            .then(() => {
                this.generateBoxes = async () => {await this.dataLock}; //no repeat!
                for(const each of ['display', 'info', 'settings', 'controls']) {
                    let eachComponents = this.componentLists[each].map(e => Vue.markRaw(e));
                    let self=this;
                    this.boxes[each] = Vue.markRaw({
                        data: function(){return {
                            config: self.config,
                            info: self.info,
                            components: eachComponents
                        }},
                        template: `
                            <div>
                                <div class="${each}Box">
                                    <template v-for="each in components">
                                        <component :is="each"></component>
                                    </template>
                                </div>
                            </div>
                        `
                    });
                }
                this.populateSEFields();
            });
        await this.dataLock;
    }

    async eraseData() {
        let recursingAssign = (destination, source) => {
            for(const eachKey of Object.keys(source)) {
                if(destination[eachKey] === null || (!(source[eachKey] instanceof Object) || source[eachKey] instanceof Array || source[eachKey] instanceof Date)) {
                    destination[eachKey] = source[eachKey];
                } else {
                    recursingAssign(destination[eachKey], source[eachKey]);
                }
            }
        };
        recursingAssign(this.info, this.config.defaultData);
        return await this.requestSave();
    }
    
    /**
     * Optional parameter, will be taken from storage if either null or undefined (parsing a non-object will cause errors)
     */
    async loadInfo(data) {
       if(typeof data === 'null' || typeof data === 'undefined') {
           data = await this.getItems(this.config.defaultData);
       }
       if(data) {
           Module.assigningDeepMixin(this.info, data);
       }
    }



    /**
     * note: you can only have the lock until one call to save; which always releases the lock.
     * this is backward compatibility for requestSave(), but also for lease checking
     * 
     * Although it is not itself async, this method calls an async method and returns it's promise.
     */
    save(lease) {
        //only saves if the lease is valid, as otherwise release throws.
        lease.release();
        return this.requestSave();
    }

    /**
     * Throttles the save rate according to config.saveCooldown
     * @returns a promise that resolves once the save completed (but before it's cooldown ends).
     * Important: If an error occurs, it is the savelock that rejects (so you should call this aynchronously, attach a catch to the savelock, and then await the resolution of this if you wish to handle those errors).
     * This means that the returned promise is a glorified callback, but it also importantly highlights that handling failed saves must return the module to a valid state for other callers, not just cancel the requested action.
     * If the error is not handled, then no more saves can be made
     */
    async requestSave() {
        if(!this.isSavePending) {
            this.isSavePending = true;
            let [promise, nextLock] = this.saveLock.lease();
            this.saveLock = nextLock;
            //this is where we wait for the existing save to complete.
            let saveLease = await promise;

            await this.dataLock; //only save if the datalock is in a resolved state; but also because we are re-entrant, we have no need to prevent data from being changed between starting the store and having the store finish.
            try {
                let storePromise = this.storeItems(this.info);
                if(Module.isInManualMode) {
                    saveLease.release();
                } else {   
                    setTimeout(() => saveLease.release(), this.config.saveCooldown);
                }
                this.isSavePending = false;
                await storePromise; //now wait for the storage to finish before returning/resolving the function's promise
                return true;
            } catch(e) {
                saveLease.break(e);
            }
        } else {
            return false;
        }
    }

    /**
     * mainly used for services, but also for timers, etc
     */
    start() {
        
    }

    /**
     * mainly used for services, but also for timers, etc
     */
    stop() {
    }
}

class GeneralStorageModule extends ModuleBase {
    /**
     * Extracts data from a jsonified object of jsonified values (this format is used primarily for compatiblity with SE storage)
     */
    extractData(text) {
        let result;
        if(text !== null) {
            result = JSON.parse(text);
            for(let eachName in result) {
                if(typeof result[eachName] !== 'undefined' && result[eachName] !== null) {
                    result[eachName] = JSON.parse(result[eachName]);
                }
            }
        }
        return result;
    }
}

class LocalStorageModule extends GeneralStorageModule {
    /**
     * loads items from storage
     * Note: this method can only safely deal with JSON-compatible data
     */
    async getItems(expected) {
        let text = (await localStorage.getItem(`${this.config.moduleId}.info`));
        let result = this.extractData(text || null); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?

        //collect any legacy format data - once off, erases so it won't override a second time.
        for(let eachName in expected) {
            let tmp = await localStorage.getItem(`${this.config.moduleId}${eachName}`);
            if(typeof tmp !== 'undefined' && tmp !== null) {
                result[eachName] = JSON.parse(tmp);
                await localStorage.removeItem(`${this.config.moduleId}${eachName}`);
            }
        }
        return result;
    }
    
    /**
     * 
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async storeItems(data) {
        let payload = {};
        for(let eachName in data) {
            let eachTmp = data[eachName];
            if(typeof eachTmp !== 'undefined' && eachTmp !== null) {
                payload[eachName] = JSON.stringify(eachTmp);
            }
        }
        let tmp = JSON.stringify(payload);
        await localStorage.setItem(`${this.config.moduleId}.info`, tmp); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
    }
}

class SEStorageModule extends GeneralStorageModule {
    /**
     * replaces existing values with those in local storage, where it exists
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async getItems() {
        return this.extractData((await SE_API.store.get(`${this.config.moduleId}.info`)) || null);
    }

    /**
     * 
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async storeItems(data) {
        let payload = {};
        for(let eachName in data) {
            let eachTmp = data[eachName];
            payload[eachName] = (typeof eachTmp === 'number' || typeof eachTmp === 'boolean' || typeof eachTmp === 'string' ? eachTmp : JSON.stringify(eachTmp));
        }
        await SE_API.store.set(`${this.config.moduleId}.info`, payload);
    }

    async getGenerationTimeStamp() {
        return (await SE_API.store.get(`${this.config.moduleId}.generation_timestamp`)) || null;
    }
    async setGenerationTimeStamp(data) {
        await SE_API.store.set(`${this.config.moduleId}.generation_timestamp`, data);
    }
}

let Module;

///StreamElements storage support.
if(typeof SE_API !== 'undefined' && typeof SE_API.store !== 'undefined') {
    Module = SEStorageModule;
} else {
    Module = LocalStorageModule;
}

export default Module;