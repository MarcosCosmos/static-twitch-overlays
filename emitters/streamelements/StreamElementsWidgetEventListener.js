import Module from '../../core/Module.js';
import EventEmitter from '../EventEmitter.js';

const defaultConfig = {

    displayTitle: 'Stream Elements Widget Event'
};

class StreamElementsWidgetEventListener extends EventEmitter {
    constructor(config) {
        super(Module.mixin(defaultConfig, config));

        this.eventCallback = async (data) => {
            for(const eachListener of self.listeners) {
                try {
                    //possibly don't need to await each listener anymore since they control their own data lock? however, having the await here allowed the listener to dictate that.
                    await eachListener(data.detail);
                } catch (err) {
                    console.error(err);
                }
            }
        }

        this.eventCallback = null;
    }
    

    async start() {
        await this.stop();
        window.addEventListener('onEventRecieved', this.eventCallback);
    }

    async stop() {
        window.removeEventListener('onEventRecieved', this.eventCallback);
    }
}

export default StreamElementsWidgetEventListener;