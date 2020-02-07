let displayMixins = {
    goal(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox goalBox outlineBox" ref="displayBox" style="height: calc(1.5em)">
                <div v-for="e in ['forestroke', 'backstroke']" :class="e">
                    {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
                </div>
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
            <div class="displayBox counterBox outlineBox" ref="displayBox" style="height: calc(1.5em)">
                <div v-for="e in ['forestroke', 'backstroke']" :class="e">
                    {{config.displayTitle}}</span>: {{info.currentValue}}
                </div>
            </div>
        `,
    }},
    streamEvent(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox eventBox outlineBox" ref="displayBox" style="height: 3em">
                <div v-for="e in ['forestroke', 'backstroke']" :class="e">
                    <div style="text-decoration: underline;">{{config.displayTitle}}</div>
                    {{info.currentEvent.by}}
                    <template v-if="!config.nameOnly">
                        - {{info.currentEvent.detail}}
                    </template>
                </div>
            </div>
        `
    }},
    // logger(){return {
    //     data: this.coreDataGetter,
    //     template: `
    //         <div class="displayBox logBox" ref="displayBox" style="height: 10em;">
    //             <h1>${this.config.displayTitle}</h1>
    //             <ul id="eventLog">
    //                 <li v-for="each of info.events.slice(0, 100)">
    //                     <div v-for="e in ['forestroke', 'backstroke']" :class="e">
    //                         <strong>Type: </strong><span class="eventName">${event.name}</span>
    //                         <br/>
    //                         <strong>Time: </strong><span class="eventTime">${event.time}</span>
    //                     </div>
    //                 </li>
    //             </ul>
    //         </div>
    //     `
    // }}
};

export default displayMixins;