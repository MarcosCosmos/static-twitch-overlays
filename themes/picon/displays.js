let displayMixins = {
    goal(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox goalBox" ref="displayBox">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    eventDisplay(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox" ref="displayBox">
                <div style="text-decoration: underline;">{{config.displayTitle}}</div>
                    {{info.currentEvent.by}}
                <template v-if="!config.nameOnly">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }}
};

export default displayMixins;