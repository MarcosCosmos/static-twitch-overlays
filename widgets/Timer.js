import Module from '../core/Module.js';
import BasicDisplay from './BasicDisplay.js';
import Logger from '../emitters/log/Logger.js';
 
let defaultConfig;
{
    let exampleTitle = `{Widget Title}`;
    defaultConfig = {
        displayTitle: exampleTitle,
        defaultData: {
            referenceTime: null, //in up timers, this is the time the timer was started, in down timers it's some future moment being counted towards
            snapshotTime: null,
            pausedGapMs: 0,
            timerMode: 'down',
            stopAtZero: true,
            isPaused: true,
            finishSeen: false
        }
    };
}

function hoursIn(ms) {                    
    let denominator = 1000*60*60;
    let result = ms/denominator;
    return result > 0 ? Math.floor(result) : Math.ceil(result);
}
function minutesIn(ms) {
    let denominator = 1000*60;
    let result = (ms % (60*denominator))/denominator;
    return result > 0 ? Math.floor(result) : Math.ceil(result);
}
function secondsIn(ms) {
    let denominator = 1000;
    let result = Math.round((ms % (60*denominator))/denominator);
    return result > 0 ? Math.min(result, 59) : Math.max(result, -59);
}

//todo: consider adding global options for overriding config via chat?

//todo: fields; (include reference time, some of the fields that are currently data.)

//todo: only save on start/stop?

/**
 * Note this basic/base goal doesn't include an updating mechanism in and of itself other than manually through settings, and should be extended with subclasses that interact with other modules (such a streamlabs socket.io module) to listen for updates
 */
export default class Timer extends BasicDisplay {
    constructor(config=defaultConfig) {
        config = Module.mixin(defaultConfig, config);
        if(typeof config.defaultData.referenceTime === 'string') {
            config.defaultData.referenceTime = new Date(Date.parse(config.defaultData.referenceTime));
        }
        if(typeof config.defaultData.snapshotTime === 'string') {
            config.defaultData.snapshotTime = new Date(Date.parse(config.defaultData.snapshotTime));
        }
        super(config);
        this.logger = new Logger(this.config.moduleId);
        this.updateInterval = null;
        
        //a utility var used internally to reduce repetitive computation, but never saved to storage since it would almost-never stay relevant/accurate
        this.currentGapMs = 0;
        this.updateCurrentGap(); //initial values before the data is actually loaded (works, because re-entrant?)
    }

    getHours() {
        return hoursIn(this.currentGapMs);
    }

    getMinutes() {
        return minutesIn(this.currentGapMs);
    }

    getSeconds() {
        return secondsIn(this.currentGapMs);
    }

    async generateBoxes() {
        await super.generateBoxes();
        let self=this;
        // this.componentLists.settings.push({
        //     data: this.coreDataPromise,
        //     template: `
        //         <form action="" onsubmit="return false">
        //             <span>
        //                Timer Mode: 
        //             </span>
        //             <br/>
        //             <input type="radio" name="timerMode" value="up" v-model="data.timerMode">
        //             <label :for="config.moduleId + 'ModeUp'">
        //                 Count Up
        //             </label>
        //             <input type="radio" name="timerMode" value="down" v-model="config.timerMode">
        //             <label :for="config.moduleId + 'ModeDown'">
        //                 Count Down
        //             </label>
        //         </form>
        //     `
        // });
        let coreData = await this.coreDataPromise;
        this.componentLists.controls.push({
            data(){
                return {
                    core: coreData,
                    hours: hoursIn(self.currentGapMs),
                    minutes: minutesIn(self.currentGapMs),
                    seconds: secondsIn(self.currentGapMs)
                }
            },
            template: `
                <form action="" onsubmit="return false">
                    <span>
                       Timer Mode: 
                    </span>
                    <br/>
                    <input type="radio" name="timerMode" value="up" v-model="timerMode" :id="core.config.moduleId + 'ModeUp'">
                    <label :for="core.config.moduleId + 'ModeUp'">
                        Count Up
                    </label>
                    <input type="radio" name="timerMode" value="down" v-model="timerMode" :id="core.config.moduleId + 'ModeDown'">
                    <label :for="core.config.moduleId + 'ModeDown'">
                        Count Down
                    </label>
                    <input name="stopAtZero" :id="core.config.moduleId + 'StopAtZero'" type="checkbox" v-model="core.info.stopAtZero"/>
                    <label :for="core.config.moduleId + 'StopAtZero'">
                        Stop timer at zero?
                    </label>
                    <br/>
                    <div>
                        <label :for="core.config.prefix + 'dummyHours'">
                            Current Value (hours:minutes:seconds):
                        </label>
                        <div>
                            <input name="dummyHours" type="number" step="1" v-model="dummyHours" :id="core.config.prefix + 'addedHours'"/>
                            :
                            <input name="dummyMinutes" type="number" step="1" v-model="dummyMinutes"/>
                            :
                            <input name="dummySeconds" type="number" step="1" v-model="dummySeconds"/>
                        </div>
                    </div>
                    <div>
                        <template v-if="core.info.isPaused">
                            <button type="button" @click="unpause()">
                                Unpause
                            </button>
                        </template>
                        <template v-else>
                            <button type="button" @click="pause()">
                                Pause
                            </button>
                        </template>
                    </div>
                </form>
            `,
            computed: {
                timerMode: {
                    get() {
                        return self.info.timerMode;
                    },
                    async set(newValue) {
                        self.setMode(newValue);
                        self.requestSave();
                    }
                },
                dummyHours: {
                    get() {
                        return this.hours;
                    },
                    set(newValue) {
                        let result = parseInt(newValue,10);
                        if(!isNaN(result)) {
                            this.setTimeGap(result, this.minutes, this.seconds);
                        }
                    }
                },
                dummyMinutes: {
                    get() {
                        return this.minutes;
                    },
                    set(newValue) {
                        let result = parseInt(newValue,10);
                        if(!isNaN(result)) {
                            this.setTimeGap(this.hours, result, this.seconds);
                        }
                    }
                },
                dummySeconds: {
                    get() {
                        return this.seconds;
                    },
                    set(newValue) {
                        let result = parseInt(newValue,10);
                        if(!isNaN(result)) {
                            this.setTimeGap(this.hours, this.minutes, result);
                        }
                    }
                }
            },
            watch: {
                'core.info.referenceTime': function() {
                    this.updateGapParts();
                },
                'core.info.snapshotTime': function() {
                    this.updateGapParts();
                }
            },
            methods: {
                pause(){
                    self.pause();
                },
                unpause() {
                    self.unpause();
                },
                setTimeGap(hours, minutes, seconds) {
                    self.timeToNowIfNull();
                    self.setReferenceTime(self.computeMs(hours, minutes, seconds), this.core.info.snapshotTime.valueOf());
                    self.info.pausedGapMs = self.currentGapMs;
                    self.requestSave();
                },
                updateGapParts() {
                    this.hours = hoursIn(self.currentGapMs);
                    this.minutes = minutesIn(self.currentGapMs);
                    this.seconds = secondsIn(self.currentGapMs);
                }
            }
        });


        let loggerData = await this.logger.coreDataPromise;

        this.componentLists.controls.push({
            data() {return {
                widget: coreData,
                logger: loggerData
            }},
            computed: {
                eventsToShow() {
                    return this.logger.info.events.slice(0, 100);
                }
            },
            template: `
                <div class="displayBox logBox" ref="displayBox">
                    <h1>{{widget.config.displayTitle}} Log</h1>
                    <div class="eventListCon">
                        <ul class="eventList">
                            <li v-for="each in eventsToShow">
                                <strong>Type: </strong><span class="eventName">{{each.name}}</span>
                                <br/>
                                <strong>Time: </strong><span class="eventTime">{{each.time.toLocaleString()}}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            `
        });
    }

    timeToNowIfNull() {
        if(this.info.snapshotTime === null) {
            this.info.snapshotTime = new Date(Date.now());
        } 
        if(this.info.referenceTime === null) {
            this.info.referenceTime = new Date(this.info.snapshotTime.valueOf());
        }
    }

    /**
     * Updates the reference time to be gap ms away from relativeTo (the direction is determined based on the current mode)
     * @param {*} gap a duration in ms
     * @param {*} relativeTo defaults to zero (the base reference epoch for js time)
     * Note: does not save/get the data lock
     */
    setReferenceTime(gap, relativeTo=0) {
        switch(this.info.timerMode) {
            case 'up':
                //set the new reference time to however long the duration was when paused, but in the past.
                this.info.referenceTime = new Date(relativeTo - gap);
                break;
            case 'down':
                this.info.referenceTime = new Date(relativeTo + gap);
                break;
        }
        this.updateCurrentGap();
        // await this.save();
    }

    add(milliseconds) {
        this.timeToNowIfNull();
        this.setReferenceTime(milliseconds, this.info.referenceTime.valueOf());
    }

    computeMs(hours, minutes, seconds) {
        return ( ( ( ( hours * 60 ) + minutes ) * 60 ) + seconds ) * 1000;
    }

    updateCurrentGap() {
        if(this.info.referenceTime != null) {
            switch(this.info.timerMode) {
                case 'up':
                    //set the new reference time to however long the duration was when paused, but in the past.
                    this.currentGapMs = this.info.snapshotTime.valueOf() - this.info.referenceTime.valueOf();
                    break;
                case 'down':
                    this.currentGapMs = this.info.referenceTime.valueOf() - this.info.snapshotTime.valueOf();
                    break;
            }
        } else {
            this.currentGapMs = 0;
        }
    }

    updateSnapshot() {
        this.info.snapshotTime = new Date(Date.now());
        this.updateCurrentGap();
    }

    /**
     * The asyncness of this method allows the caller to wait for the pause-state-change to be recorded in storage.
     * The return value, on resolve, is true if the timer was previously unpaused, and false otherwise.
     */
    async pause() {
        this.stop();
        if(!this.info.isPaused) {
            this.info.isPaused = true;
            this.info.pausedGapMs = this.currentGapMs;
            this.info.referenceTime = null;
            await this.requestSave();
            return true;
        } else {
            return false;
        }
    }
    /**
     * The asyncness of this method allows the caller to wait for the pause-state-change to be recorded in storage.
     * The return value, on resolve, is true if the timer was previously paused, and false otherwise.
     */
    async unpause() {
        if(this.info.isPaused) {
            this.info.snapshotTime = new Date(Date.now());
            this.setReferenceTime(this.currentGapMs, this.info.snapshotTime.valueOf());
            this.info.isPaused = false;
            this.info.pausedGapMs = 0;
            this.start();
            await this.requestSave();
            return true;
        } else {
            return false;
        }
    }

    stop() {
        if(this.updateInterval != null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    start() {
        if(!this.info.isPaused && this.updateInterval === null) {
            this.updateInterval = setInterval(async () => {
                this.updateSnapshot();
                if(this.checkFinished() && this.info.stopAtZero) {
                    if(this.info.finishSeen) {
                        this.stop();
                        this.setReferenceTime(0, this.info.snapshotTime.valueOf());
                        this.updateCurrentGap();
                        this.pause();
                    } else {
                        this.unpause();
                    }
                }
            }, 1000);
        }
    }

    setMode(targetMode) {
        if(targetMode !== this.info.timerMode) {
           //get the gap based on the current mode, then switch modes, then set the gap again to get the same value on the timer despite moving in the opposite direction?
           this.stop();
           this.timeToNowIfNull();
           this.info.timerMode = this.info.timerMode === 'up' ? 'down' : 'up';
           this.setReferenceTime(this.currentGapMs, this.info.snapshotTime.valueOf());
           this.start();
        }
    }

    /**
     * Only timers counters down can 'finish', and the timer must become non-zero again to unset it
     * returns true if a save is warranted.
     */
    checkFinished() {
        if(!this.info.finishSeen) {
            if(this.currentGapMs <= 0) {
                this.logger.log({
                    name: `Timer (${this.config.displayTitle}) Finished!`,
                    time: new Date(this.info.snapshotTime.valueOf()+this.currentGapMs)
                });
                this.info.finishSeen = true;
                return true;
            }
        } else if(this.currentGapMs > 0) {
            //if we've already finished, but are no longer finished, then clear the flag to allow for finishing again
            this.info.finishSeen = false;
            return true;
        }
        return false;
    }

    async loadInfo(lock) {
        let oldPauseState = this.info.isPaused;
        await super.loadInfo(lock);
        this.info.snapshotTime = new Date(Date.now());
        if(this.info.isPaused) {
            this.currentGapMs = this.info.pausedGapMs;
            this.setReferenceTime(this.currentGapMs, this.info.snapshotTime.valueOf());
        } else {
            this.info.referenceTime = new Date(Date.parse(this.info.referenceTime));
            this.timeToNowIfNull();
        }
        this.updateCurrentGap();
        //start/stop the timer if the pause state changed; Note: this is very different to pause/unpause as these commands change the reference timestamps etc and should not be repeated redundantly (this would change the data).
        if(oldPauseState != this.info.isPaused) {
            if(this.info.isPaused) {
                this.stop();
            } else {
                this.start();
            }
        }
    }

    async eraseData() {
        await this.pause();
        await super.eraseData();
        await this.logger.eraseData();
        this.timeToNowIfNull();
        this.updateCurrentGap();
    }
}