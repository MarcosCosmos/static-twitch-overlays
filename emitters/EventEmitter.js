import Module from '../core/Module.js';

function Set_toJSON(key, value) {
  if (typeof value === 'object' && value instanceof Set) {
    return [...value];
  }
  return value;
}

const defaultConfig = {};

class EventEmitter extends Module {
    constructor(config) {
        super(Module.mixin(defaultConfig, config));

        this.listeners = [];
    }
    
    //for now listeners are simple callbacks of the forms (event) => {/*work*/};
    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners.remove(listener);
    }

    // //use these overloads to deal with the set business
    // async loadInfo(lock) {
    //     let tmp = {};
    //     await this.getItems(lock, tmp);
    //     if(tmp.eventsSeen) {
    //         tmp.eventsSeen = new Set([...tmp.eventsSeen, ...this.info.eventsSeen]);
    //     } else if(this.info.eventsSeen instanceof Array) {
    //         this.info.eventsSeen = new Set(this.info.eventsSeen);
    //     }
    //     for(let each of Object.keys(tmp)) {
    //         this.info[each] = tmp[each];
    //     }
    // }
    
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