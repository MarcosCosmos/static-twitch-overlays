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
        }
    }

    generateDisplayBox() {
        this.displayBox = document.createElement('div');
        this.displayBox.classList.add('displayBox');
        this.displayBox.id = 'logDisplayBox';
        
        this.displayBox.innerHTML = `
            <h1>${this.config.displayTitle}</h1>
            <ul id="eventLog">
            </ul>
        `;

        this.eventListElm = this.displayBox.querySelector(':scope #eventLog');
        this.updateElements();
    }

    generateControlsBox() {
        this.controlsBox = document.createElement('div');
        this.controlsBox.classList.add('controlsBox');
        this.controlsBox.id = `${this.moduleId}ControlsBox`;

        this.controlsBox.innerHTML = `
            <h3>${this.config.displayTitle}</h3>
            <div>
                <span style="color: red;">Warning: this action is cannot be undone</span>
                <button type="button" class="eraseButton">Erase Data</button>
            </div>
        `;

        let eraseButton = this.controlsBox.querySelector(':scope .eraseButton');
        eraseButton.onclick = event => {
            eraseButton.disabled = true;
            this.info = {events: []};
            this.updateElements();
            this.save();
            eraseButton.disabled = false;
        }

    }

    /**
     * Cleanly recreates all the html elements
     */
    updateElements() {
        while (this.eventListElm.firstChild) {
            this.eventListElm.removeChild(this.eventListElm.firstChild);
        }
        for(let each of this.info.events.slice(0,100)) {
            let item = this.generateListItem(each.data);
            each.item = item;
            this.eventListElm.appendChild(item);
        }
    }

    /**
     * Intended for internal use within this class
     * @param Object eventData 
     */
    generateListItem(event) {
        let result = document.createElement('li');
        result.innerHTML = `<strong>Type: </strong><span class="eventName">${event.name}</span><br/><strong>Time: </strong><span class="eventTime">${event.time}</span>`;
        return result;
    }

    /**
     * stores the current events in localStorage
     */
    save() {
        localStorage.setItem('eventLog', JSON.stringify(this.info.events.map(each => each.data)));
    }

    log(event) {
        let item = this.generateListItem(event);
        this.info.events.unshift({data: event, item: item, id: this.info.lastEventId});
        this.info.lastEventId += 1;
        if(this.info.events.length > 1000) {
            let toHide = this.info.events[1000];
            toHide.item.remove();
            delete toHide.item;
        }
        if(this.info.events.length > 1) {
            this.eventListElm.insertBefore(item, this.eventListElm.childNodes[0]);
        } else {
            this.eventListElm.appendChild(item);
        }
        this.save();
    }

}

export default Logger;