
import {widgetTypes, serviceTypes, generateMixinWidget} from './generateMixinWidget.js';
import Module from './Module.js';
import Vue from 'https://cdn.jsdelivr.net/npm/vue@3.2.27/dist/vue.esm.browser.js';

const defaultConfig = {
    moduleId: '',
    widgetType: 'goal',
    serviceType: 'streamlabs',
    widgetConfig: {},
    serviceConfig: {},
    boxToShow: 'display',
    theme: 'default'
};

export default async (config, fields={}, start=true) => {
    config = Module.mixin(defaultConfig, config);

    //use se field overrides to set the widget and service types.
    if('_core_.widget_type' in fields) {
        config.widgetType = fields['_core_.widget_type'];
        delete fields['_core_.widget_type'];
    }
    if('_core_.service_type' in fields) {
        config.serviceType = fields['_core_.service_type'];
        delete fields['_core_.service_type'];
    }
    if('_core_.dataScope' in fields) {
        config.moduleId = fields['_core_.dataScope'];
        delete fields['_core_.dataScope'];
    }
    if('_core_.theme' in fields) {
        config.theme = fields['_core_.theme'];
        delete fields['_core_.theme'];
    }

    let MixedClass = generateMixinWidget(config.widgetType, config.serviceType);
    let activeService = new serviceTypes[config.serviceType].constructor(config.serviceConfig);
    activeService.inManualMode = true;
    let activeWidget = new MixedClass(config.widgetConfig, activeService);
    activeWidget.inManualMode = true;
    await activeService.finalizeBoxes();
    await activeWidget.finalizeBoxes();

    for(let eachCompKey of Object.keys(fields)) {
        let eachCategory, eachInnerKey;
        {
            let parts = eachCompKey.split('.', 2);
            if(parts.length == 2) {
                eachCategory = parts[0];
                eachInnerKey = parts[1];
            } else {
                continue;
            }
        }
        let targetFields;
        switch(eachCategory) {
            case '_widget_':
                targetFields = activeWidget.streamElementsFields;
                break;
            case '_service_':
                targetFields = activeService.streamElementsFields;
                break;
            default:
                continue;
        }
        targetFields[eachInnerKey].destination = fields[eachCompKey];
    }

    let vue;
    config.boxToShow = config.boxToShow || 'display';
    switch(config.boxToShow) {
        case 'display':
            let work = async () => {
                let themeJsUrl = `https://marcoscosmos.gitlab.io/static-twitch-overlays/themes/${config.theme}/displays.js`;
                if((await fetch(themeJsUrl)).status != 200){
                    //fallback to the default theme
                    config.theme = 'default';
                    themeJsUrl = `/themes/${config.theme}/displays.js`;
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
                if(start) {
                    activeWidget.start();
                    activeService.start();
                }
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