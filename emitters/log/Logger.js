import Module from '../../core/Module.js';
        //TODO: this way seperate pages kill each other's events instead of merging them; might need something better; perhaps uids with semi seperate logs?

        //ALSO TODO: only *display* recent events

const defaultConfig = {
    expectRead: false, //whether or not to maintain a queue (pseudo-queue) of unread events for an alert; Actually, todo: use a reader count and a has-read count to solve for multiple alerts?(?)
    defaultData: {events: [], lastEventId: 0},
};

/**
 * Stores the most recent 1000 events
 */

//todo: may be use this as a basis for alerts or *in* alerts?; Alerts would have the option of replaying the event within it's controls, so it kind of makes sense to display differently
class Logger extends Module {
    constructor(parentScopeId, config={}) {
        super((()=>{
            let theConfig = Module.mixin(defaultConfig, config);
            theConfig.moduleId = `${parentScopeId}_log`;
            return theConfig;
        })());
    }


    async loadInfo(lock) {
        await super.loadInfo(lock);
        for(let each of this.info.events) {
            each.time = new Date(Date.parse(each.time));
        }
    }

    log(event) {
        event.id = this.info.lastEventId;
        this.info.events.unshift(event);
        if(this.lastEventId === Number.MAX_SAFE_INTEGER) {
            this.info.lastEventId = 0;
        } else {
            ++this.info.lastEventId;
        }
        if(this.info.events.length > 1000) {
            this.info.events = this.info.events.slice(0, 1000);
        }
        return this.requestSave();
    }
}

export default Logger;