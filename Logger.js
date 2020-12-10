import Module from './Module.js';
        //TODO: this way seperate pages kill each other's events instead of merging them; might need something better; perhaps uids with semi seperate logs?

        //ALSO TODO: only *display* recent events

const defaultConfig = {
    moduleId: 'log',
    expectRead: false, //whether or not to maintain a queue (pseudo-queue) of unread events for an alert; Actually, todo: use a reader count and a has-read count to solve for multiple alerts?(?)
    defaultData: {events: [], lastEventId: 0},
};

/**
 * Stores the most recent 1000 events
 */

//todo: may be use this as a basis for alerts or *in* alerts?; Alerts would have the option of replaying the event within it's controls, so it kind of makes sense to display differently
class Logger extends Module {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
    }

    // generateDisplayBox() {
    //    this.componentLists.display.push({
    //         data: this.coreDataGetter,
    //         computed: {
    //             eventsToShow() {
    //                 return this.info.events.slice(0, 100);
    //             }
    //         },
    //         template: `
    //             <div class="displayBox logBox" ref="displayBox">
    //                 <h1>{{this.config.displayTitle}}</h1>
    //                 <ul id="eventLog">
    //                     <li v-for="each in eventsToShow">
    //                         <strong>Type: </strong><span class="eventName">{{each.name}}</span>
    //                         <br/>
    //                         <strong>Time: </strong><span class="eventTime">{{each.time}}</span>
    //                     </li>
    //                 </ul>
    //             </div>
    //         `
    //     });
    // }

    async loadInfo(lock) {
        await super.loadInfo(lock);
        for(let each of this.info.events) {
            each.time = new Date(Date.parse(each.time));
        }
    }

    // generateControlsBox() {
    //     this.componentLists.controls.push({
    //         data() {return {
    //             widget: self.coreDataGetter(),
    //             logger: self.logger.coreDataGetter()
    //         }},
    //         computed: {
    //             eventsToShow() {
    //                 return this.logger.info.events.slice(0, 100);
    //             }
    //         },
    //         template: `
    //             <div class="displayBox logBox" ref="displayBox">
    //                 <h1>{{widget.config.displayTitle}} Log</h1>
    //                 <div class="eventListCon">
    //                     <ul class="eventList">
    //                         <li v-for="each in eventsToShow">
    //                             <strong>Type: </strong><span class="eventName">{{each.name}}</span>
    //                             <br/>
    //                             <strong>Time: </strong><span class="eventTime">{{each.time.toLocaleString()}}</span>
    //                         </li>
    //                     </ul>
    //                 </div>
    //             </div>
    //         `
    //     });
    // }
    

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
    //     //     await this.save();
    //     //     eraseButton.disabled = false;
    //     // }
    // }

    // /**
    //  * stores the current events in localStorage
    //  */
    // save() {
    //     localStorage.setItem(`${this.config.moduleId}+Even`, JSON.stringify(this.info.events));
    // }

    async log(event) {
        let lock = await this.requestDataLock();
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
        this.save(lock);
    }
}

export default Logger;