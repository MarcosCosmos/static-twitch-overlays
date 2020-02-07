let displayMixins = {
    goal(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox goalBox" ref="displayBox">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    counter(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox counterBox" ref="displayBox">
                {{config.displayTitle}}</span>: {{info.currentValue}}
            </div>
        `
    }},
    streamEvent(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox eventBox" ref="displayBox">
                {{info.currentEvent.by}}
                <template v-if="!config.nameOnly">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }},
    logger(){return {
        data: this.coreDataGetter,
        computed: {
            eventsToShow() {
                return this.info.events.slice(0, 100);
            }
        },
        template: `
            <div class="displayBox logBox" ref="displayBox">
                <h1>${this.config.displayTitle}</h1>
                <ul id="eventLog">
                    <li v-for="each in eventsToShow">
                        <strong>Type: </strong><span class="eventName">${each.name}</span>
                        <br/>
                        <strong>Time: </strong><span class="eventTime">${each.time}</span>
                    </li>
                </ul>
            </div>
        `
    }}
};

export default displayMixins;