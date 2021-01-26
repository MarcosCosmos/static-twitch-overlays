import Module from './Module.js';
import BasicDisplay from './BasicDisplay.js';
import Logger from './Logger.js';
 
let defaultConfig;
{
    let exampleTitle = `{Widget Title}`;
    defaultConfig = {
        displayTitle: exampleTitle,
        defaultData: {
            referenceTime: null, //in up timers, this is the time the timer was started, in down timers it's some future moment being counted towards
            snapshotTime: null,
            timerMode: 'down',
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
        this.logger = new Logger({moduleId: `${this.config.moduleId}_log`});
        this.updaterInterval = null;
        
        //a utility var used internally to reduce repetitive computation, but never saved to storage since it would almost-never stay relevant/accurate
        this.currentGapMs = 0;
        this.withDataLock(()=>this.updateCurrentGap());
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

    generateBoxes() {
        super.generateBoxes();
        let self=this;
        // this.componentLists.settings.push({
        //     data: this.coreDataGetter,
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

        this.componentLists.controls.push({
            data(){
                return {
                    core: self.coreDataGetter(),
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
                        let lock = await self.requestDataLock();
                        self.setMode(newValue);
                        await self.save(lock);
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
                async setTimeGap(hours, minutes, seconds) {
                    let lock = await self.requestDataLock();
                    self.timeToNowIfNull();
                    self.setReferenceTime(self.computeMs(hours, minutes, seconds), self.info.snapshotTime.valueOf());
                    await self.save(lock);
                },
                updateGapParts() {
                    this.hours = hoursIn(self.currentGapMs);
                    this.minutes = minutesIn(self.currentGapMs);
                    this.seconds = secondsIn(self.currentGapMs);
                }
            }
        });

        this.componentLists.controls.push({
            data() {return {
                widget: self.coreDataGetter(),
                logger: self.logger.coreDataGetter()
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
        if(this.info.referenceTime === null) {
            this.info.snapshotTime = new Date(Date.now());
            this.info.referenceTime = new Date(this.info.snapshotTime.valueOf());
        }
    }

    /**
     * Updates the reference time to be gap ms away from relativeTo (the direction is determined based on the current mode)
     * @param {*} gap a duration in ms
     * @param {*} relativeTo defaults to zero (the base reference epoch for js time)
     * Note: does not save/get the data lock
     */
    async setReferenceTime(gap, relativeTo=0) {
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

    async pause() {
        this.stop();
        let lock = await this.requestDataLock();
        if(!this.info.isPaused) {
            this.updateSnapshot();
            this.info.isPaused = true;
            await this.save(lock);
        } else {
            lock.release();
        }
    }

    async unpause() {
        let lock = await this.requestDataLock();
        if(this.info.isPaused) {
            this.timeToNowIfNull();
            this.setReferenceTime(this.currentGapMs, Date.now());
            this.info.isPaused = false;
            await this.save(lock);
            this.start();
        } else {
            lock.release();
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
                let stateChanged = await this.checkFinished();
                if(stateChanged) {
                    await this.pause();
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
     * Returns whether or not the finished state changed.
     */
    async checkFinished() {
        let oldSeen = this.info.finishSeen;
        if(!this.info.finishSeen) {
            if(this.currentGapMs <= 0) {
                await this.logger.log({
                    name: `Timer (${this.config.displayTitle}) Finished!`,
                    time: new Date(this.info.snapshotTime.valueOf()+this.currentGapMs)
                });
                this.info.finishSeen = true;
            }
        } else if(this.currentGapMs > 0) {
            //if we've already finished, but are no longer finished, then clear the flag to allow for finishing again
            this.info.finishSeen = false;
        }
        return oldSeen !== this.info.finishSeen;
    }

    async loadInfo(lock) {
        let oldPauseState = this.info.isPaused;
        await super.loadInfo(lock);
        if(this.info.referenceTime != null) {
            this.info.referenceTime = new Date(Date.parse(this.info.referenceTime));
        }
        if(this.info.snapshotTime != null) {
            this.info.snapshotTime = new Date(Date.parse(this.info.snapshotTime));
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
        this.updateCurrentGap();
    }
}

// async function updateTimerDisplay() {
//     let timeNow = Date.now();
//     let timerEndMs = settings.startTime.valueOf() + totalTimeMs;
//     let diff = timerEndMs - timeNow.valueOf();
//     //if we're doing the last check and we're low, make sure we have up to date dono information before we call it, otherwise give up; A single-depth recursive call is easy for this
//     if(diff < 0 && !haveDoneLastCheck) {
//         haveDoneLastCheck = true;
//         await checkCampaign();
//         await updateTimerDisplay();
//     } else {
//         haveDoneLastCheck = false;
//         let totalSeconds = diff/1000;
        
//         let hours = Math.floor(totalSeconds/(60*60));
        
//         totalSeconds -= hours*(60*60);

//         let minutes = Math.floor(totalSeconds/60);

//         totalSeconds -= minutes*60;

//         let seconds = totalSeconds > 0 ? Math.floor(totalSeconds) : Math.ceil(totalSeconds); //if the time is non-zero show at least 1 second

//         document.getElementById('timerHours').innerText = hours;
//         document.getElementById('timerMinutes').innerText = minutes;
//         document.getElementById('timerSeconds').innerText = seconds;
//         updateInfoDisplay();

//         if(diff < 0) {
//             stopTimer();
//         }
//     }
// }

// async function runTimer() {
//     if(currentSecondInterval === null) {
//         haveDoneLastCheck = false; //always allow one last check when the timer runs out
//         checkCampaign(); //do the first update immediately;
//         updateTimerDisplay();
//         currentSecondInterval = setInterval(updateTimerDisplay, 1000);
//         currentUpdateInterval = setInterval(checkCampaign, 60000); //once per minute.
        
//     }
// }

// async function startTimer() {
//     document.getElementById('btnStart').disabled = true;
//     settings.running = true;
//     settings.startTime = new Date(Date.now());
//     localStorage.setItem('startTime', settings.startTime.toJSON());
//     localStorage.setItem('running', settings.running);
//     document.getElementById('startTime').innerText = settings.startTime;
//     try {
//         await runTimer();
//     } catch(e) {
//         console.err(e);
//     }
//     document.getElementById('btnStop').disabled = false;
// }

// function stopTimer() {
//     document.getElementById('btnStop').disabled = true;
//     clearInterval(currentSecondInterval);
//     currentSecondInterval = null;
//     clearInterval(currentUpdateInterval);
//     currentUpdateInterval = null;
//     settings.running = false;
//     // settings.startTime = null;
//     localStorage.setItem('running', settings.running);
//     // localStorage.setItem('startTime', settings.startTime);
//     // document.getElementById('startTime').innerText = settings.startTime;
//     for(let each of ['timerHours', 'timerMinutes', 'timerSeconds']) {
//         document.getElementById(each).innerText = 0;
//     }
//     document.getElementById('btnStart').disabled = false;
// }