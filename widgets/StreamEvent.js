import Module from '../core/Module.js';
import BasicDisplay from '../widgets/BasicDisplay.js';

let defaultConfig = {
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