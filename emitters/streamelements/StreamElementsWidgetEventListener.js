import Module from '../../core/Module.js';
import EventEmitter from '../EventEmitter.js';

const defaultConfig = {

    displayTitle: 'Stream Elements Widget Event'
};

class StreamElementsWidgetEventListener extends EventEmitter {
    constructor(config) {
        super(Module.mixin(defaultConfig, config));

        this.eventCallback = async (data) => {
            for(const eachListener of this.listeners) {
                try {
                    //possibly don't need to await each listener anymore since they control their own data lock? however, having the await here allowed the listener to dictate that.
                    await eachListener(data.detail);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
    

    async start() {
        await this.stop();
        window.addEventListener('onEventReceived', this.eventCallback);
    }

    async stop() {
        window.removeEventListener('onEventReceived', this.eventCallback);
    }
}

export default StreamElementsWidgetEventListener;