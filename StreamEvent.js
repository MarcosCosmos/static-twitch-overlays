import Module from './Module.js';
import BasicDisplay from './BasicDisplay.js';

let defaultConfig = {
    nameOnly: false,
    defaultData: {
        currentEvent: {by: '-', detail: '-'}
    },
    service: null
};

class StreamEvent extends BasicDisplay {
    constructor(config=defaultConfig) {
        super(Module.mixin(defaultConfig, config));
    }
}

export default StreamEvent;