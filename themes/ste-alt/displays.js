let displayMixins = {
    goal(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox goalBox" ref="displayBox" style="height: calc(1.5em)">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `,
        computed: {
            markerPoint() {
                if(this.$refs.displayBox){
                    let width = this.$refs.displayBox.offsetWidth;
                    let currentProportion = this.info.currentValue / this.config.goal;
                    let result = Math.floor(currentProportion*width);
                    return result;
                } else {
                    return 0;
                }
            }
        },
    }},
    counter(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox counterBox" ref="displayBox" style="height: calc(1.5em)">
                {{config.displayTitle}}</span>: {{info.currentValue}}
            </div>
        `,
    }},
    streamEvent(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox eventBox" ref="displayBox" style="height: 3em">
                    {{info.currentEvent.by}}
                    <template v-if="!config.nameOnly">
                        : {{info.currentEvent.detail}}
                    </template>
                </div>
            </div>
        `
    }},
    timer() {
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

        return {
            data(){return {
                core: self.coreDataGetter(),
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
                <div class="displayBox timerBox" ref="displayBox" style="height: calc(1.5em)">
                    <div v-for="e in ['forestroke', 'backstroke']" :class="e">
                        <span v-if="core.config.displayTitle">
                            {{core.config.displayTitle}}:
                        </span>
                        <span>
                            {{hours}}:{{minutes}}:{{seconds}}
                        </span>
                    </div>
                </div>
            `
        }
    },
    poll() {
        // const codeForA = 'a'.charCodeAt(0);
        const self=this;
        return {
            data(){
                return {
                    core: self.coreDataGetter(),
                    results: self.resultsForVue
                }
            },
            // computed: {
            //     options() {
            //         // if(this.resultToggle || !this.resultToggle) {
            //             if(this.results.votes) {
            //                 let winMap = {};
            //                 for(const each of this.results.winners) {
            //                     winMap[each] = true;
            //                 }
            //                 let result = this.core
            //                     .info
            //                     .optionNames
            //                     .map(
            //                         (each, index) => {
            //                             return {
            //                                 name: each,
            //                                 letter: String.fromCharCode(codeForA+index),
            //                                 votes: this.results.votes[each],
            //                                 isWinning: winMap[each] || false
            //                             };
            //                         })
            //                 ;
            //                 return result;
            //             } else {
            //                 return [];
            //             }
            //         // }
            //     }
            // },
            template: `
                <div class="displayBox pollBox" ref="displayBox" v-if="core.info.isVisible" style="text-align:left;">
                    <div class="outlineBox" style="height: calc(1.5em)">
                        <div v-for="e in ['forestroke', 'backstroke']" :class="[e, 'pollTitle']">
                            !poll: {{core.info.pollTitle}}
                            <span v-if="!core.info.isOpen">
                                (CLOSED)
                            </span>
                        </div>
                    </div>
                    <div v-for="each of results" class="outlineBox" style="height: calc(1.5em)">
                        <div v-for="e in ['forestroke', 'backstroke']" :class="[e, each.styleClass, each.isWinning ? 'pollWinner' : '']">
                            {{each.letter}}) {{each.name}}: {{each.votes}}
                        </div>
                    </div>
                </div>
            `,
        };
    }
};

export default displayMixins;