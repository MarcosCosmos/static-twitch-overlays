
let defaultConfig;
{
    defaultConfig = {
        moduleId: 'exampleWidget', //note: displayable, numeric moduleIdes should be managable via css
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
                if(!destination.hasOwnProperty(eachKey) || destination[eachKey] == null || (!(source[eachKey] instanceof Object) || source[eachKey] instanceof Array)) {
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
        this.dataPromise = Promise.resolve();
        
        this.withDataLock(async (lock) => {
            await this.loadInfo(lock);
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

            // //add a listener for external localStorage changes
            // window.addEventListener('storage', async () => {
            //     await this.withDataLock(this.loadInfo.bind(this));
            // });
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
                    self.eraseData(await self.requestDataLock());
                }
            }
        });
    }

    /**
     * Shouldn't be called in the constructor chain since it essentially shoe-horns lists of components into object-maps for later use
     */
    async finalizeBoxes() {
        await this.withDataLock((lock) => {this.generateBoxes();
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

    }

    // async requestInfoLock() {
    //     let resolver;
    //     let existingPromise = this.infoLock;
    //     this.infoLock = new Promise((resolve) => resolver=resolve);
    //     await existingPromise;
    //     return resolver;
    // }

    async eraseData(lock) {
        lock.check();
        let recursingAssign = (destination, source) => {
            for(const eachKey of Object.keys(source)) {
                if(destination[eachKey] == null || (!(source[eachKey] instanceof Object) || source[eachKey] instanceof Array || source[eachKey] instanceof Date)) {
                    destination[eachKey] = source[eachKey];
                } else {
                    recursingAssign(destination[eachKey], source[eachKey]);
                }
            }
        };
        recursingAssign(this.info, this.config.defaultData);
        await this.save(lock);
    }

    async loadInfo(lock) {
        await this.getItems(lock, this.info);
    }



    //note: you can only have the lock until one call to save; which always releases the lock.
    async save(lock) {
        await this.storeItems(lock, this.info);
        lock.release();
    }

    // /**
    //  * replaces existing values with those in local storage, where it exists
    //  * @param Object destination
    //  * Note: this method can only safely deal with JSON-compatible data
    //  */
    // async getItems(lock, destination) {
    //     lock.check();
    //     for(let eachName in destination) {
    //         let tmp = await this.storage.get(`${this.config.moduleId}${eachName}`); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
    //         if(tmp !== null) {
    //             destination[eachName] = JSON.parse(tmp);
    //         }
    //     }
    // }

    // /**
    //  * 
    //  * @param Object destination
    //  * Note: this method can only safely deal with JSON-compatible data
    //  */
    // async storeItems(lock, destination) {
    //     lock.check();
    //     for(let eachName in destination) {
    //         await this.storage.set(`${this.config.moduleId}${eachName}`, JSON.stringify(destination[eachName])); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
    //     }
    // }

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

    async requestDataLock() {
        let result = { 
            owned: true
        };
        result.check = () => {
            if(!result.owned) {
                throw new Error("Cannot release the lock, as this hold was already released.");
            }
        }; //extra fast-fail
        let existingLock = this.dataPromise;
        this.dataPromise = new Promise((resolve) => result.release = () => {
            result.check();
            result.owned = false;
            resolve();
        });
        await existingLock;
        return result;
    }
    
    async withDataLock(work) {
        let lock = await this.requestDataLock();
        await work(lock);
        if(lock.owned) {
            lock.release();
        }
    }
}

class LocalStorageModule extends ModuleBase {
    /**
     * replaces existing values with those in local storage, where it exists
     * @param Object destination
     * Note: this method can only safely deal with JSON-compatible data
     */
    async getItems(lock, destination) {
        lock.check();
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
    async storeItems(lock, destination) {
        lock.check();
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
    async getItems(lock, destination) {
        lock.check();
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
    async storeItems(lock, destination) {
        lock.check();
        let tmp = {};
        for(let eachName in destination) {
            tmp[eachName] = typeof destination[eachName] === 'number' || typeof destination[eachName] === 'string' ? destination[eachName] : JSON.stringify(destination[eachName]);
            await SE_API.store.set(`${this.config.moduleId}.info`, tmp);
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