let displayMixins = {
    async goal(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox goalBox" ref="displayBox">
                <span>{{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    async counter(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox counterBox" ref="displayBox">
                <span>{{config.displayTitle}}</span>: {{info.currentValue}}
            </div>
        `
    }},
    async streamEvent(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox eventBox" ref="displayBox">
                {{info.currentEvent.by}}
                <template v-if="typeof info.currentEvent.detail !== 'undefined'">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }},
    
    async timer() {
        let self=this;

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
        
        let coreData = await this.coreDataPromise;
        return {
            data(){return {
                core: coreData,
                gapMilliseconds: self.currentGapMs,
            }},
            computed: {
                hours() {
                    return hoursIn(this.gapMilliseconds);
                },
                minutes() {
                    return minutesIn(this.gapMilliseconds);
                },
                
                seconds() {
                    return secondsIn(this.gapMilliseconds);
                }
            },
            watch: {
                'core.info.referenceTime': function() {
                    this.gapMilliseconds = self.currentGapMs;
                },
                'core.info.snapshotTime': function() {
                    this.gapMilliseconds = self.currentGapMs;
                }
            },
            template: `
                <div class="displayBox timerBox" ref="displayBox">
                    <span v-if="core.config.displayTitle">
                        {{core.config.displayTitle}}:
                    </span>
                    <span>
                        {{hours}}:{{minutes}}:{{seconds}}
                    </span>
                </div>
            `
        }
    }
    // logger(){return {
    //     data: this.coreDataPromise,
    //     computed: {
    //         eventsToShow() {
    //             return this.info.events.slice(0, 100);
    //         }
    //     },
    //     template: `
    //         <div class="displayBox logBox" ref="displayBox">
    //             <h1>${this.config.displayTitle}</h1>
    //             <ul id="eventLog">
    //                 <li v-for="each in eventsToShow">
    //                     <strong>Type: </strong><span class="eventName">${each.name}</span>
    //                     <br/>
    //                     <strong>Time: </strong><span class="eventTime">${each.time}</span>
    //                 </li>
    //             </ul>
    //         </div>
    //     `
    // }}
};

export default displayMixins;