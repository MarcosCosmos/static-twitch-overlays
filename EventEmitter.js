import Module from './Module.js';

function Set_toJSON(key, value) {
  if (typeof value === 'object' && value instanceof Set) {
    return [...value];
  }
  return value;
}

const defaultConfig = {
    defaultData: {
        eventsSeen: []
    }
};

class EventEmitter extends Module {
    constructor(config) {
        super(Module.mixin(defaultConfig, config));

        this.listeners = [];
    }

    start() {
        
    }

    stop() {
    }

    updateSettings() {
        this.stop();
        super.updateSettings();
        this.start();
    }

    //for now listeners are simple callbacks of the forms (event) => {/*work*/};
    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners.remove(listener);
    }

    //use these overloads to deal with the set business
    loadInfo() {
        let tmp = {};
        this.getItems(tmp);
        if(tmp.eventsSeen) {
            tmp.eventsSeen = new Set([...tmp.eventsSeen, ...this.info.eventsSeen]);
        } else if(this.info.eventsSeen instanceof Array) {
            this.info.eventsSeen = new Set(this.info.eventsSeen);
        }
        for(let each of Object.keys(tmp)) {
            this.info[each] = tmp[each];
        }
    }

    /**
     * 
     * @param Object destination 
     * Note: this method can only safely deal with JSON-compatible data
     */
    storeItems(destination) {
        for(let eachName in destination) {
            localStorage.setItem(`${this.config.moduleId}${eachName}`, JSON.stringify(destination[eachName], Set_toJSON)); //keep this ${this.config.moduleId}${eachName} format for backward compatibility?
        }
    }
    
    // async requestInfoLock() {
    //     let ownResolver;
    //     let existingPromise = this.infoLock;
    //     this.infoLock = new Promise((resolve) => ownResolver=resolve);
    //     await existingPromise;
    //     let listenerResolvers = [];
    //     for(let each of this.listeners){
    //         listenerResolvers.push(await each.requestInfoLock());
    //     }
    //     return () => {
    //         listenerResolvers.forEach(each => each());
    //         ownResolver();
    //     };
    // }
}

export default EventEmitter;