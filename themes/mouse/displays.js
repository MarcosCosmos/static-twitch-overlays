let displayMixins = {
    goal(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox goalBox" ref="displayBox" style="height: calc(1.5em)">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    counter(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox counterBox" ref="displayBox" style="height: calc(1.5em)">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    streamEvent(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox eventBox" ref="displayBox" style="height: 3em">
                {{info.currentEvent.by}}
                <template v-if="!config.nameOnly">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }},
    logger(){return {
        data: this.coreDataGetter,
        template: `
            <div class="displayBox logBox" ref="displayBox">
                <h1>${this.config.displayTitle}</h1>
                <ul id="eventLog">
                    <li v-for="each of info.events.slice(0, 100)">
                        <strong>Type: </strong><span class="eventName">${event.name}</span>
                        <br/>
                        <strong>Time: </strong><span class="eventTime">${event.time}</span>
                    </li>
                </ul>
            </div>
        `
    }}
};

export default displayMixins;