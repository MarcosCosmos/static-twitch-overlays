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
    eventDisplay(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox eventBox" ref="displayBox" style="height: 3em">
                {{info.currentEvent.by}}
                <template v-if="!config.nameOnly">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }}
};

export default displayMixins;