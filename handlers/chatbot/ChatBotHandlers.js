import EventHandler from "../EventHandler.js";

import Module from '../../core/Module.js';

const defaultConfig = {
    userLevel: 0,
    cooldown: 1000,
    commandPrefixes: '',
    ignoreOwnMessage: true,
    defaultData: {
        lastMessageTime: new Date(0)
    }
};

class GeneralHandler extends EventHandler {
    constructor(config, widget, service) {
        super(Module.mixin(defaultConfig, config), widget, service);
        this.regex = null;
    }

    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        let coreData = await this.coreDataPromise;
        this.componentLists.settings.push({
            data: () => coreData,
            computed: {
                cooldownSeconds: {
                    get() {
                        return this.config.cooldown/1000;
                    },
                    set(val) {
                        this.config.cooldown = 1000*val;
                    }
                }
            },
            template: `
                <div>
                    <h4>Misc Settings</h4>
                    <form action="" onsubmit="return false">
                        <label :for="config.moduleId + 'commandPrefixes'">
                            Command(s) to listen for (aliases are comma seperated):
                        </label>
                        <input name="commandPrefixes" :id="config.moduleId + 'commandPrefixes'" v-model="config.commandPrefixes"/>
                        <label :for="config.moduleId + 'Cooldown'">
                            Cooldown (seconds):
                        </label>
                        <input name="cooldown" :id="config.moduleId + 'Cooldown'" v-model="cooldownSeconds"/>
                        <br/>
                        <label :for="config.moduleId + 'UserLevel'">
                            Minimum User Level (ignore users below this):
                        </label>
                        <select name="userLevel" :id="config.moduleId + 'userLevel'" v-model="config.userLevel">
                            <option value="4">Broadcaster</option>
                            <option value="3">Moderator</option>
                            <option value="2">VIP</option>
                            <option value="1">Subscriber</option>
                            <option value="0">Everyone</option>
                        </select>
                    </form>
                </div>
            `,
        });
    }

    async messageProcessor(event) {

    }

    async onAcceptedEvent(event) {
        let response = await this.messageProcessor(event);
        if(response) {
            this.service.client.say(event.channel, response);
        }
    }

    async onEvent(event) {
        if(this.config.ignoreOwnMessage && event.isMyMsg) return;
        if(this.regex === null) {
            let prefixes = this.config.commandPrefixes.split(',').map(each => each.trim());
            this.regex = new RegExp(`^(${prefixes.join('|')})( +|$)`);
        }
        if(this.regex.test(event.message)) {
            let now = new Date(Date.now());
            if(this.service.levelOf(event.tags) >= this.config.userLevel ) {
                if(now - this.info.lastMessageTime < this.config.cooldown) {
                    return;
                } else {
                    this.info.lastMessageTime = now;
                }
                this.requestSave();
                await this.onAcceptedEvent(event);
            }
        }
    }
}

class AccumulationHandler extends GeneralHandler {
    async messageProcessor(event) {
        let match = event.message.match(this.regex);
        let amount = NaN;
        let relative = true;
        let increment = false;
        if(match != null) {
            let payload = event.message.substr(match.index + match[0].length);
            if(payload === '') {
                increment = true;
            } else { 
                payload = payload.trim();
                if (payload[0] === '=') {
                    relative = false;
                    payload = payload.substr(1).trim();
                }
                amount = parseFloat(payload);
            }
        }
        let result;
        if(increment) {
            await this.widget.increment();
            result = `${this.widget.config.displayTitle} is now: ${this.widget.info.currentValue}`;
            this.widget.requestSave(); //save forcedly releases the lock, so it can only be used once each time the lock is grabbed.
        } else if(!isNaN(amount) && isFinite(amount)) {
            if (relative) {
                this.widget.add(amount);
            } else {
                this.widget.set(amount);
            }
            result = `${this.widget.config.displayTitle} is now: ${this.widget.info.currentValue}`;
            this.widget.requestSave(); //save forcedly releases the lock, so it can only be used once each time the lock is grabbed.
        } else {
            result = `${this.widget.config.displayTitle} is now: ${this.widget.info.currentValue}`;
        }
        return result;
    }
}

class TimerHandler extends GeneralHandler {
    async messageProcessor(event) {
        let match = event.message.match(this.regex);
        let amount = NaN;
        let relative = true;
        let negative = false;
        if(match != null) {
            let payload = event.message.substr(match.index + match[0].length).trim();
            if(payload === 'pause' || payload === 'stop') {
                await this.pause();
            } else if(payload === 'unpause' || payload === 'start') {
                await this.unpause();
            } else if(payload.length > 0) {
                if (payload[0] === '=') {
                    relative = false;
                    payload = payload.substr(1).trim();
                }
                if(payload[0] === "-") {
                    negative = true;
                    payload = payload.substr(1);
                }
                let parts = payload.split(':');
                if(parts.length === 3) {
                    parts = parts.map(each => parseFloat(each));
                    amount = this.computeMs(parts[0], parts[1], parts[2]);
                    if(negative) {
                        amount = -amount;
                    }
                }
            }
        }
        
        let result;
        if(!isNaN(amount) && isFinite(amount)) {
            this.widget.timeToNowIfNull();
            if (relative) {
                this.widget.add(amount);
            } else {
                this.widget.info.snapshotTime = new Date(Date.now());
                this.widget.setReferenceTime(amount, this.widget.info.snapshotTime.valueOf());
            }
            this.widget.updateCurrentGap();
            result = `${this.config.displayTitle} is now: ${this.widget.getHours()}:${this.widget.getMinutes()}:${this.widget.getSeconds()} (${this.widget.info.isPaused ? 'paused' : 'and counting'})`;
        } else {
            result = `${this.config.displayTitle} is now: ${this.widget.getHours()}:${this.widget.getMinutes()}:${this.widget.getSeconds()} (${this.widget.info.isPaused ? 'paused' : 'and counting'})`;
        }
        return result;
    }
}

class StreamEventHandler extends GeneralHandler {
    async messageProcessor(event) {
        let match = event.message.match(regex);
        let payload = '';
        if(match != null) {
            payload = event.message.substr(match.index + match[0].length);
        }
        
        this.widget.info.currentEvent = {
            by: event.tags.displayName,
            detail: payload,
            raw: event
        };
        this.widget.requestSave();
        return `Message recieved! @${event.tags.displayName}`;
    }
}

let defaultExport = { 
    goal: AccumulationHandler,
    counter: AccumulationHandler,
    streamEvent: StreamEventHandler,
    timer: TimerHandler
};

export {defaultExport as default, GeneralHandler};

// function generateBoxes(processor) {
// }

// function generateSEFields() {
// }

// function makeRegex() {
//     let prefixes = this.service.config.commandPrefixes.split(',').map(each => each.trim());
//     let regex = new RegExp(`^(${prefixes.join('|')})( +|$)`);
//     return regex;
// }

// async function processEventAccumulation(event, regex) {
//     if(regex.test(event.message)) {
//         let match = event.message.match(regex);
//         let amount = NaN;
//         let relative = true;
//         let increment = false;
//         if(match != null) {
//             let payload = event.message.substr(match.index + match[0].length);
//             if(payload === '') {
//                 increment = true;
//             } else { 
//                 payload = payload.trim();
//                 if (payload[0] === '=') {
//                     relative = false;
//                     payload = payload.substr(1).trim();
//                 }
//                 amount = parseFloat(payload);
//             }
//         }
//         let result;
//         if(increment) {
//             await this.increment();
//             result = `${this.config.displayTitle} is now: ${this.info.currentValue}`;
//             this.requestSave(); //save forcedly releases the lock, so it can only be used once each time the lock is grabbed.
//         } else if(!isNaN(amount) && isFinite(amount)) {
//             if (relative) {
//                 this.add(amount);
//             } else {
//                 this.set(amount);
//             }
//             result = `${this.config.displayTitle} is now: ${this.info.currentValue}`;
//             this.requestSave(); //save forcedly releases the lock, so it can only be used once each time the lock is grabbed.
//         } else {
//             result = `${this.config.displayTitle} is now: ${this.info.currentValue}`;
//         }
//         return result;
//     }
//     return false;
// }


// async function processEventStreamEvent(event, regex) {
//     if(regex.test(event.message)) {
//         let match = event.message.match(regex);
//         let payload = '';
//         if(match != null) {
//             payload = event.message.substr(match.index + match[0].length);
//         }
        
//         this.info.currentEvent = {
//             by: event.tags.displayName,
//             detail: payload,
//             raw: event
//         };
//         this.requestSave();
//         return `Message recieved! @${event.tags.displayName}`;
//     }
//     return false;
// }



// async function processEventTimer(event, regex) {
//     if(regex.test(event.message)) {
        
//     }
//     return false;
// }

// // function accumulationListener() {
// //     let regex = (makeRegex.bind(this))();
// //     let processor = processEventAccumulation.bind(this);
// //     this.service.addListener(
// //         event => {
// //             let response = processor(event, regex);
// //             if(response) {
// //                 this.service.client.say(event.channel, response);
// //             }
// //         }
// //     );
// // }

// // function streamEventListener() {
// //     let regex = (makeRegex.bind(this))();
// //     let processor = processEventStreamEvent.bind(this);
// //     this.service.addListener(
// //         event => {
// //             let response = processor(event, regex);
// //             if(response) {
// //                 this.service.client.say(event.channel, response);
// //             }
// //         }
// //     );
// // }

// function parameterisedListener(processor) {
//     let regex = (makeRegex.bind(this))();
//     processor = processor.bind(this);
//     this.service.addListener(
//         async event => {
//             let response = await processor(event, regex);
//             if(response) {
//                 this.service.client.say(event.channel, response);
//             }
//         }
//     );
// }

// function alertListener() {
//     console.log('WARNING: NOT YET IMPLEMENTED');
// }
