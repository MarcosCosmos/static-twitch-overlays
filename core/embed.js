import CompositeModule from './CompositeModule.js';

async function loadTheme(themeName, baseUrl) {
    let themeJsUrl = `${baseUrl}/themes/${themeName}/displays.js`;
    if((await fetch(themeJsUrl)).status != 200){
        //fallback to the default theme
        themeName = 'default';
        themeJsUrl = `${baseUrl}/themes/${themeName}/displays.js`;
    }
    
    //only changes the css on a successful theme being grabbed
    
    let oldStyleSheet = document.querySelector('#themeStyle');
    if(oldStyleSheet) {
        oldStyleSheet.remove();
    }
    let newStyleSheet = document.createElement('link');
    newStyleSheet.rel = 'stylesheet';
    newStyleSheet.href = `${baseUrl}/themes/${themeName}/style.css`;
    newStyleSheet.id = 'themeStyle';
    
    document.head.appendChild(newStyleSheet);

    return (await import(themeJsUrl)).default;
}

async function spawnApp(theModule, displayBox, start) {
    switch(theModule.config.boxToShow) {
        case 'display': {
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
            break;
        }
        default: {
            if(theModule.config.boxToShow == 'controls') {
                theModule.isInManualMode = true;
                theModule.widget.isInManualMode = true;
                for(let each of Object.values(theModule.services)) {
                    each.isInManualMode = true;
                }
                for(let each of Object.values(theModule.handlers)) {
                    each.isInManualMode = true;
                }
            }
            const app = Vue.createApp({
                data() {
                    return {module: theModule};
                },
                components: {
                    boxes: theModule.boxes[theModule.config.boxToShow], 
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
    }
}

async function initialise(config, start=true, baseUrl='https://marcoscosmos.gitlab.io/static-twitch-overlays') {
    let theModule = new CompositeModule(config);
    await theModule.finalizeBoxes();

    let displayBoxes = await loadTheme(config.widget.theme, baseUrl);
    let displayBox = await (displayBoxes[config.widget.moduleTypeName].bind(theModule.widget))();
    
    spawnApp(theModule, displayBox, start);
};

export {initialise as default, loadTheme, spawnApp};