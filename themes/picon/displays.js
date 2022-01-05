let displayMixins = {
    async goal(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox goalBox" ref="displayBox">
                {{config.displayTitle}}</span>: {{info.currentValue}}/{{config.goal}}
            </div>
        `
    }},
    async counter(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox counterBox" ref="displayBox">
                {{config.displayTitle}}</span>: {{info.currentValue}}
            </div>
        `
    }},
    async streamEvent(){
        let coreData = await this.coreDataPromise;
        return {
        data: () => coreData,
        template: `
            <div class="displayBox" ref="displayBox">
                <div style="text-decoration: underline;">{{config.displayTitle}}</div>
                    {{info.currentEvent.by}}
                <template v-if="!config.nameOnly">
                    - {{info.currentEvent.detail}}
                </template>
            </div>
        `
    }},
    // logger(){return {
    //     data: this.coreDataPromise,
    //     template: `
    //         <div class="displayBox logBox" ref="displayBox">
    //             <h1>${this.config.displayTitle}</h1>
    //             <ul id="eventLog">
    //                 <li v-for="each of info.events.slice(0, 100)">
    //                     <strong>Type: </strong><span class="eventName">${event.name}</span>
    //                     <br/>
    //                     <strong>Time: </strong><span class="eventTime">${event.time}</span>
    //                 </li>
    //             </ul>
    //         </div>
    //     `
    // }}
};

export default displayMixins;