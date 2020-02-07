import Module from './Module.js';
        //TODO: this way seperate pages kill each other's events instead of merging them; might need something better; perhaps uids with semi seperate logs?

        //ALSO TODO: only *display* recent events

const defaultConfig = {
    moduleId: 'log',
    displayTitle: 'Event Log',
    expectRead: false, //whether or not to maintain a queue (pseudo-queue) of unread events for an alert; Actually, todo: use a reader count and a has-read count to solve for multiple alerts?(?)
    defaultData: {events: [], lastEventId: 0},
};

/**
 * Stores the most recent 100 events; Also keeps track of 'unread' events for an alert, 
 */

class Logger extends Module {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.loadData();
    }

    loadData() {
        this.info = {
            events: []
        };

        let eventsText = localStorage.getItem('eventLog');
        if(eventsText !== null) {
            this.info.events = JSON.parse(eventsText)
                .map(e => {e.time = new Date(Date.parse(e.time)); return {data: e};});

            //fallback against corrupted data from old format
            if(this.info.events.length > 0 && typeof this.info.events[0].id === 'undefined') {
                this.info.events = [];
                this.save();
            }
        }
    }

    

    // generateControlsBox() {
    //     //todo: later alerts will be similar to a logger, and will have an option to retrigger events
    //     // this.controlsBox = document.createElement('div');
    //     // this.controlsBox.classList.add('controlsBox');
    //     // this.controlsBox.id = `${this.moduleId}ControlsBox`;

    //     // this.controlsBox.innerHTML = `
    //     //     <h3>${this.config.displayTitle}</h3>
    //     //     <div>
    //     //         <span style="color: red;">Warning: this action is cannot be undone</span>
    //     //         <button type="button" class="eraseButton">Erase Data</button>
    //     //     </div>
    //     // `;

    //     // let eraseButton = this.controlsBox.querySelector(':scope .eraseButton');
    //     // eraseButton.onclick = event => {
    //     //     eraseButton.disabled = true;
    //     //     this.info = {events: []};
    //     //     this.updateElements();
    //     //     this.save();
    //     //     eraseButton.disabled = false;
    //     // }
    // }

    /**
     * stores the current events in localStorage
     */
    save() {
        localStorage.setItem('eventLog', JSON.stringify(this.info.events));
    }

    log(event) {
        event.id = this.info.lastEventId;
        this.info.events.unshift(event);
        this.info.lastEventId += 1;
        if(this.info.events.length > 1000) {
            this.info.events = this.info.events.slice(0, 1000);
        }
        this.save();
    }

}

export default Logger;