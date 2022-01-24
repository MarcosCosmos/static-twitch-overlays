import Module from '../core/Module.js';
const defaultConfig = {};

class EventHandler extends Module {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfig, config));
        this.widget = widget;
        this.service = service;
    }
    /**
     * Action that takes place when an event occurs; Maybe include configurable filters etc
     */
    async onEvent(event) {
    }

    async generateBoxes() {
    }
}

export default EventHandler;