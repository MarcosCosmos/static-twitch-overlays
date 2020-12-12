
import {widgetTypes, serviceTypes, generateMixinWidget} from './generateMixinWidget.js';
import Module from './Module.js';
import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.esm.browser.js';

const defaultConfig = {
    moduleId: '',
    widgetType: 'goal',
    serviceType: 'streamlabs',
    widgetConfig: {},
    serviceConfig: {},
    boxToShow: 'display',
    theme: 'default'
};

export default async (config) => {
config = Module.mixin(defaultConfig, config);


let MixedClass = generateMixinWidget(config.widgetType, config.serviceType);
let activeService = new serviceTypes[config.serviceType].constructor(config.serviceConfig);
let activeWidget = new MixedClass(config.widgetConfig, activeService);

await activeService.finalizeBoxes();
await activeWidget.finalizeBoxes();

let vue;
switch(config.boxToShow) {
    case 'display':
        let work = async () => {
            let themeJsUrl = `https://marcoscosmos.gitlab.io/static-twitch-overlays/themes/${config.theme}/displays.js`;
            if((await fetch(themeJsUrl)).status != 200){
                //fallback to the default theme
                config.theme = 'default';
                themeJsUrl = `./themes/${config.theme}/displays.js`;
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
            newStyleSheet.href = `https://marcoscosmos.gitlab.io/static-twitch-overlays/themes/${config.theme}/style.css`;
            newStyleSheet.id = 'themeStyle';
            
            document.head.appendChild(newStyleSheet);
            vue = new Vue({
                el: '#embed',
                components: {
                    display: displayBox
                },
                template: `<display></display>`
            });
            activeWidget.start();
            activeService.start();
        }
        await work();
        break;
    default:
        vue = new Vue({
            el: '#embed',
            components: {
                widget: activeWidget.boxes[config.boxToShow],
                service: activeService.boxes[config.boxToShow],
                widgetInfo: activeWidget.info,
                serviceInfo: activeService.info,                
            },
            template: `
                <div>
                    <widget></widget>
                    <service></service>
                </div>
            `,
            watch: {
                widgetInfo: {
                    handler () {
                        activeWidget.save();
                    },
                    deep: true
                },
                serviceInfo: {
                    handler() {
                        activeService.save();
                    },
                    deep: true
                }
            }
        });
    }
    return activeWidget;
};