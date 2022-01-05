import Module from '../../Module';
import EventEmitter from './EventEmitter';

const defaultConfig = {
    sourceId: '', //note: this is the id of the source widget, without the _logger
    lastEventSeen: null, //the id of the last event seen from the logger; this module scan's the logger's events whenever the data changes, emitting all until but not including that id, or all if that id isn't in the list; In either case, the id is updated to the first new one (which will have the highest id/be the latest)
}


//todo: finish this;

/**
 * For reading events such as reaching a goal in a goal widget, etc
 */
class LogReader extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
    }
    
    async loadInfo(lock) {
        await super.loadInfo(lock);
        for(let each of this.info.events) {
            each.time = new Date(Date.parse(each.time));
        }
    }
}