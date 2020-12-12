
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
    static mixin(initial, source) {
        let result = JSON.parse(JSON.stringify(initial));
        let recursingAssign = (destination, source) => {
            for(const eachKey of Object.keys(source)) {
                if(!destination.hasOwnProperty(eachKey) || destination[eachKey] === null || (!(source[eachKey] instanceof Object) || source[eachKey] instanceof Array)) {
                    destination[eachKey] = source[eachKey];
                } else {
                    recursingAssign(destination[eachKey], source[eachKey]);
                }
            }
        };
        recursingAssign(result, source);
        return result;
    }

    constructor(config={}) {
        this.config = Module.mixin(defaultConfig, config);
        this.info = Module.mixin({}, this.config.defaultData);
        this.dataLock = Lock.build(`Data-lock (${this.config.moduleId})`); //todo: consider if this second datalock is even neccessary anymore? it doesn't hurt, and would neccessary outside of JS, but still.
        this.saveLock = Lock.build(`Save-lock (${this.config.moduleId})`);
        this.isSavePending = false;
        this.dataLock = this.dataLock
            .then(() => this.loadInfo())
            .then(() => {
                this.componentLists = {};

                this.boxes = {};

                for(const each of ['display', 'info', 'settings', 'controls']) {
                    this.componentLists[each] = [];
                }

                //prepare this for most of the boxes
                let coreData = {
                    config: this.config,
                    info: this.info
                };

                this.coreDataGetter = function() {
                    return coreData;
                }
            });
    }
    
    generateBoxes() {
        // this.generateDisplayBox();//note that settings and data are things cached into localstorage.
        // this.generateInfoBox();
        // this.generateControlsBox();
        // this.generateSettingsBox();
        // this.generateSensitiveSettingsBox();

        let self=this;
        this.componentLists.settings.push({
            data: this.coreDataGetter,
            template: `<h3>{{config.displayTitle}} Settings</h3>`
        });

        this.componentLists.info.push(
            {
                data: this.coreDataGetter,
                template: `<h3>{{config.displayTitle}} Information</h3>`
            }
        );
        this.componentLists.info.push({
            data: this.coreDataGetter,
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
            data: this.coreDataGetter,
            template: `<h3>{{config.displayTitle}} Controls</h3>`
        });
        this.componentLists.controls.push({
            data: this.coreDataGetter,
            template: `
                <form action="" onsubmit="return false">
                    <div>
                        <span style="color: red;">Warning: this action is cannot be undone</span>
                        <button type="button" class="eraseButton" v-on:click="eraseData">Erase Data</button>
                    </div>
                </form>
            `,
            methods: {
                async eraseData() {
                    self.eraseData();
                }
            }
        });
    }

    /**
     * Shouldn't be called in the constructor chain since it essentially shoe-horns lists of components into object-maps for later use
     * @returns a promise indicating it's completion
     */
    async finalizeBoxes() {
        this.dataLock = this.dataLock.then(() => {
            this.generateBoxes();
            for(const each of ['display', 'info', 'settings', 'controls']) {
                let eachComponents = this.componentLists[each];
                let self=this;
                this.boxes[each] = {
                    data: function(){return {
                        config: self.config,
                        info: self.info,
                        components: self.componentLists[each]
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
                };
            }
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
    
    loadInfo() {
       return this.getItems(this.info);
    }



    /**
     * note: you can only have the lock until one call to save; which always releases the lock.
     * this is backward compatibility for requestSave(), but also for lease checking
     * 
     * Although it is not itself async, this method calls an async method and returns it's promise.
     */
    save(lease) {
        //only saves if the lease is valid, as otherwise release throws.
        dataLease.release();
        return this.requestSave();
    }

    /**
     * Throttles the save rate according to config.saveCooldown
     * An external user can 
     * @param {*} dataLease 
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
            let saveLease = await promise;
            await this.dataLock; //only save if the datalock is in a resolved state; but also because we are re-entrant, we have no need to prevent data from being changed between starting the store and having the store finish.
            try {
                this.storeItems(this.info);
                this.isSavePending = false;
                setTimeout(() => {
                    saveLease.release();
                }, this.config.saveCooldown);  
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

class LocalStorageModule extends ModuleBase {
    /**
     * replaces existing values with those in local storage, where it exists
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async getItems(destination) {
        for(let eachName in destination) {
            let tmp = await localStorage.getItem(`${this.config.moduleId}${eachName}`); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
            if(typeof tmp !== 'undefined' && tmp !== null) {
                destination[eachName] = JSON.parse(tmp);
            }
        }
    }

    /**
     * 
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async storeItems(destination) {
        for(let eachName in destination) {
            await localStorage.setItem(`${this.config.moduleId}${eachName}`, JSON.stringify(destination[eachName])); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
        }
    }
}

class SEStorageModule extends ModuleBase {
    /**
     * replaces existing values with those in local storage, where it exists
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async getItems(destination) {
        let tmp = await SE_API.store.get(`${this.config.moduleId}.info`) || null;
        if(tmp != null) {
            for(let eachName in destination) {
                if(typeof tmp[eachName] !== 'undefined' && tmp[eachName] !== null) {
                    destination[eachName] = JSON.parse(tmp[eachName]);
                }
            }
        }
    }

    /**
     * 
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async storeItems(destination) {
        let payload = {};
        for(let eachName in destination) {
            let eachTmp = destination[eachName];
            payload[eachName] = typeof eachTmp === 'number' || typeof eachTmp === 'boolean' || typeof eachTmp === 'string' ? eachTmp : JSON.stringify(eachTmp);
            await SE_API.store.set(`${this.config.moduleId}.info`, payload);
        }
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