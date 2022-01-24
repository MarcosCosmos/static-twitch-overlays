import CompositeModule from './CompositeModule.js';
export default async (config, start=true) => {
    let theModule = new CompositeModule(config);
    await theModule.finalizeBoxes();
    switch(config.boxToShow) {
        case 'display':
            let work = async () => {
                let themeName = config.widget.theme;

                let themeJsUrl = `https://marcoscosmos.gitlab.io/static-twitch-overlays/themes/${themeName}/displays.js`;
                if((await fetch(themeJsUrl)).status != 200){
                    //fallback to the default theme
                    themeName = 'default';
                    themeJsUrl = `/themes/${themeName}/displays.js`;
                }
                let displayBoxes = (await import(themeJsUrl)).default;
                let displayBox = (displayBoxes[config.widgetType].bind(activeWidget))();
                
                //only changes the css on a successful theme being grabbed
                
                let oldStyleSheet = document.querySelector('#themeStyle');
                if(oldStyleSheet) {
                    oldStyleSheet.remove();
                }
                let newStyleSheet = document.createElement('link');
                newStyleSheet.rel = 'stylesheet';
                newStyleSheet.href = `https://marcoscosmos.gitlab.io/static-twitch-overlays/themes/${themeName}/style.css`;
                newStyleSheet.id = 'themeStyle';
                
                document.head.appendChild(newStyleSheet);

                const app = Vue.createApp({
                    components: {
                        display: displayBox
                    },
                    template: `<display></display>`
                });
                const vm = app.mount('#embed');
                if(start) {
                    theModule.start();
                }
            }
            work();
            break;
        default:
            const app = Vue.createApp({
                data() {
                    return {module: theModule};
                },
                components: {
                    boxes: theModule.boxes[config.boxToShow], 
                },
                template: `
                    <div>
                        <component :is="module.widget.boxes[module.config.boxToShow]"/>
                        <div v-for="eachService of Object.values(module.services)">
                            <component :is="eachService.boxes[module.config.boxToShow]"/>
                        </div>
                        <div v-for="eachHandler of Object.values(module.handlers)">
                            <component :is="eachHandler.boxes[module.config.boxToShow]"/>
                        </div>
                    </div>
                `,
            });
            const vm = app.mount('#embed'); 
    }
};
doWork();