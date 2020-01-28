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

    // generateControlsBox() {
    //     this.controlsBox = document.createElement('div');
    //     this.controlsBox.classList.add('controlsBox');
    //     this.controlsBox.id = `${this.moduleId}ControlsBox`;

    //     this.controlsBox.innerHTML = `
    //         <h3>${this.config.displayTitle}</h3>
    //         <div>
    //             <span style="color: red;">Warning: this action is cannot be undone</span>
    //             <button type="button" class="eraseButton">Erase Data</button>
    //         </div>
    //     `;

    //     let eraseButton = this.controlsBox.querySelector(':scope .eraseButton');
    //     eraseButton.onclick = event => {
    //         eraseButton.disabled = true;
    //         this.info = defaultData;
    //         this.updateElements();
    //         this.save();
    //         eraseButton.disabled = false;
    //     }

    // }

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
    async loadInfo() {
        
        let release = await this.requestInfoLock();
        let tmp = {};
        this.getItems(tmp);
        if(tmp.eventsSeen) {
            tmp.eventsSeen = new Set(tmp.eventsSeen);
        } else if(this.info.eventsSeen instanceof Array) {
            this.info.eventsSeen = new Set(this.info.eventsSeen);
        }
        for(let each of Object.keys(tmp)) {
            this.info[each] = tmp[each];
        }
        release();
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
}

export default EventEmitter;