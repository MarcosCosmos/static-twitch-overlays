// import StreamLabsMixins from './StreamLabsMixins.js';
// import TiltifyMixins from './TiltifyMixins.js';
// import StreamlabsSocket from './StreamLabsSocket.js';
// import TiltifyScanner from './TiltifyScanner.js';
// import BasicGoal from './BasicGoal.js';
// import BasicAlert from './BasicAlert.js';
// import EventDisplay from './EventDisplay.js';
// import Logger from './Logger.js';
// import StreamLabsSocket from './StreamLabsSocket.js';
import {widgetTypes, serviceTypes, generateMixinWidget} from './generateMixinWidget.js';
import Module from './Module.js';

import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.11/dist/vue.esm.browser.js';

import defaultThemeBoxes from './themes/default/displays.js';

function relativeToAbsolute(path) {
    let base = document.location.href;
    var stack = base.split("/"),
        parts = path.split("/");
    stack.pop(); // remove current file name (or empty string)
                 // (omit if "base" is the current folder without trailing slash)
    for (var i=0; i<parts.length; i++) {
        if (parts[i] === ".")
            continue;
        if (parts[i] === "..")
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join("/");
}

function Set_toJSON(key, value) {
  if (typeof value === 'object' && value instanceof Set) {
    return [...value];
  }
  return value;
}
//todo: required fields?

//TODO: SWITCHING TYPES LOSES MIXIN SETTINGS?

let randomNum = Math.floor(Math.random() * Math.floor(1000000));
const baseDefaultConfig = {
    moduleId: `widget_${randomNum}`,
    widgetType: 'goal',
    serviceType: 'streamlabs',
    theme: 'default'
};

let loadedConfig;
if(document.location.search.length > 0) {
    loadedConfig = JSON.parse(decodeURIComponent(document.location.search.slice(1)));
} else {
    loadedConfig = {};
}
let defaultConfig = Module.mixin(baseDefaultConfig, loadedConfig);

let mixedModules = {
};

let mixedComponents = {};
let doWork = async () => {
    for(const eachWidgetType of Object.keys(widgetTypes)) {
        // const eachWidgetTypeInfo = widgetTypes[eachWidgetName];
        for(const eachServiceType of Object.keys(serviceTypes)) {
            let widgetConfigToUse;
            let serviceConfigToUse;
            if(defaultConfig.widgetType === eachWidgetType) {
                widgetConfigToUse = defaultConfig.widgetConfig;
            } else {
                widgetConfigToUse = {};
            }
            if(defaultConfig.serviceType === eachServiceType) {
                serviceConfigToUse = defaultConfig.serviceConfig;
            } else {
                serviceConfigToUse = {};
            };

            const MixedWidget = generateMixinWidget(eachWidgetType, eachServiceType);
            let eachService = new serviceTypes[eachServiceType].constructor(serviceConfigToUse);
            let eachWidget = new MixedWidget(widgetConfigToUse, eachService);

            await eachService.finalizeBoxes();
            await eachWidget.finalizeBoxes();
                
            let eachComponent = {
                props: ['widgetId'],
                data: function (){return {
                    widgetConfig: eachWidget.config,
                    serviceConfig: eachService.config,
                    widgetInfo: eachWidget.info,
                    serviceInfo: eachService.info,
                    visibilities: {
                        links: true,
                        controls: false,
                        info: false,
                        settings: true,
                    }
                }},
                components: {
                    // widgetDisplay: eachWidget.boxes.display,
                    widgetControls: eachWidget.boxes.controls,
                    serviceControls: eachService.boxes.controls,
                    widgetInfo: eachWidget.boxes.info,
                    serviceInfo: eachService.boxes.info,
                    widgetSettings: eachWidget.boxes.settings,
                    serviceSettings: eachService.boxes.settings
                },
                watch: {
                    widgetInfo: {
                        handler () {
                            eachWidget.requestSave();
                        },
                        deep: true
                    },
                    serviceInfo: {
                        handler() {
                            eachService.requestSave();
                        },
                        deep: true
                    },
                    widgetId() {
                        this.updateIds();
                    }
                },
                methods: {
                    updateIds() {
                        this.widgetConfig.moduleId = this.widgetId;
                        this.serviceConfig.moduleId = `${this.widgetId}_service`;
    
                    },
                    created() {
                        this.updateIds();
                    },
                    toggle(section) {
                        this.visibilities[section] = !this.visibilities[section];
                    }
                },
                created() {
                    this.updateIds();
                },
                template: `
                    <div>
                        <h1>Preview</h1>
                        <div id="previewSection">
                            <slot name="displayBox"></slot>
                        </div>
                        <h1 class="btn-lg btn-block btn-secondary block" v-on:click="toggle('links')">Links</h1>
                        <div id="urlsSection" :class="{hidden: !visibilities.links}">
                            <slot name="urlBoxes"></slot>
                        </div>
                        <h1 class="btn-lg btn-block btn-secondary block" v-on:click="toggle('controls')">Preview Controls</h1>
                        <div id="controlsSection" :class="{hidden: !visibilities.controls}">
                            <widget-controls></widget-controls>
                            <service-controls></service-controls>
                        </div>
                        <h1 class="btn-lg btn-block btn-secondary block" v-on:click="toggle('info')">Debug Info</h1>
                        <div id="infoSection" :class="{hidden: !visibilities.info}">
                            <widget-info></widget-info>
                            <service-info></service-info>
                        </div>
                        <h1 class="btn-lg btn-block btn-secondary block" v-on:click="toggle('settings')">Settings</h1>
                        <div id="settingsSection" :class="{hidden: !visibilities.settings}">
                            <slot name="widgetTypeSettings"></slot>
                            <widget-settings></widget-settings>
                            <service-settings></service-settings>
                        </div>
                    </div>
                `,

                
            };

            mixedModules[`${eachWidgetType}_${eachServiceType}`] = {
                widget: eachWidget,
                service: eachService
            };
            mixedComponents[`${eachWidgetType}_${eachServiceType}`] = eachComponent;
        }
    }

    let perWidgetComponent = {
        data: function(){return {
            moduleId: defaultConfig.moduleId,
            widgetType: defaultConfig.widgetType,
            serviceType: defaultConfig.serviceType,
            widgetTypes: widgetTypes,
            serviceTypes: serviceTypes,
            theme: defaultConfig.theme || 'default',
            themeBoxes: Object.assign({}, defaultThemeBoxes),
        }},
        components: mixedComponents,
        computed: {
            currentComponentKey() {
                return `${this.widgetType}_${this.serviceType}`;
            },
            widget: function() {
                return mixedModules[this.currentComponentKey].widget;
            },
            service: function() {
                return mixedModules[this.currentComponentKey].service;
            },
            displayUrl() {
                return `${relativeToAbsolute('./embed.html')}?${encodeURIComponent(JSON.stringify({
                    moduleId: this.moduleId,
                    boxToShow: 'display',
                    theme: this.theme,
                    widgetType: this.widgetType,
                    serviceType: this.serviceType,
                    widgetConfig: this.widget.config,
                    serviceConfig: this.service.config
                }, Set_toJSON))}`;
            },
            controlsUrl() {
                return `${relativeToAbsolute('./embed.html')}?${encodeURIComponent(JSON.stringify({
                    moduleId: this.moduleId,
                    boxToShow: 'controls',
                    theme: this.theme,
                    widgetType: this.widgetType,
                    serviceType: this.serviceType,
                    widgetConfig: this.widget.config,
                    serviceConfig: this.service.config
                }, Set_toJSON))}`;
            },
            formUrl() {
                return `${relativeToAbsolute('./configuration.html')}?${encodeURIComponent(JSON.stringify({
                    moduleId: this.moduleId,
                    theme: this.theme,
                    widgetType: this.widgetType,
                    serviceType: this.serviceType,
                    widgetConfig: this.widget.config,
                    serviceConfig: this.service.config
                }, Set_toJSON))}`;
            },
            settingsJSON() {
                return `${JSON.stringify({
                    moduleId: this.moduleId,
                    theme: this.theme,
                    widgetType: this.widgetType,
                    serviceType: this.serviceType,
                    widgetConfig: this.widget.config,
                    serviceConfig: this.service.config
                }, Set_toJSON)}`;
            },
            displayBox() {
                return (this.themeBoxes[this.widgetType].bind(this.widget))();
            },
            // loggerBox() {
            //     if(this.widget.logger) {
            //         return (this.themeBoxes.logger.bind(this.widget.logger))();
            //     } else {
            //         return {
            //             template: '<div></div>'
            //         };
            //     }
            // }
        },
        watch: {
            theme() {
                this.loadTheme();
            }
        },
        methods: {
            async loadTheme() {
                //only change theme if the new theme is real
                let themeJsUrl = `./themes/${this.theme}/displays.js`;
                if((await fetch(themeJsUrl)).status === 200){
                    let newBoxes = (await import(themeJsUrl)).default;
                    //assign only those that exist;
                    for(const eachKey of Object.keys(newBoxes)) {
                        this.themeBoxes[eachKey] = newBoxes[eachKey];
                    }
                    
                    //only changes the css on a successful theme being grabbed
                    
                    let oldStyleSheet = document.querySelector('#themeStyle');
                    if(oldStyleSheet) {
                        oldStyleSheet.remove();
                    }
                    let newStyleSheet = document.createElement('link');
                    newStyleSheet.rel = 'stylesheet';
                    newStyleSheet.href = `./themes/${this.theme}/style.css`;
                    newStyleSheet.id = 'themeStyle';
                    
                    document.head.appendChild(newStyleSheet);
                }
            }
        },
        created() {
            this.loadTheme();
        },
        template: `
            <component :is="currentComponentKey" :widget-id="moduleId" :display-box="displayBox">
                <template v-slot:urlBoxes>
                    <div class="alert alert-primary">
                        Notice: When adding these as Browser Sources in OBS and SLOBS, be sure to only create one "new" source for each URL; That is, you can create one source for the <em>Main Display URL</em> and one for the <em>Additional Controls URL</em>, but do not need to create new sources to add a widget to multiple scenes. To add a source to multiple scenes, choose "Add Existing" when adding the source, and select the existing source from the list that appears.
                        <br/>
                        <br/>
                        It is recommended that both the "Shutdown source when not visible" and "Refresh browser when scene becomes active" settings are unticked, however "Shutdown source when not visible" may be selected for widgets which play audio to prevent the audio playing in scenes that do not have the widget.
                    </div>
                    <div class="urlBox">
                        <h4>Embedding Links (Use these as a browser source in OBS)</h4>
                        <h5>Main Display URL</h5>
                        <a class="urlText alert alert-light" :href="displayUrl" target="_blank">
                            <pre>{{displayUrl}}</pre>
                        </a>
                        <h5>Additional Controls URL</h5>
                        <a class="urlText alert alert-light" :href="controlsUrl" target="_blank">
                        <pre>{{controlsUrl}}</pre>
                        </a>
                        <h4>Permalink to the Current Settings</h4>
                        <a class="urlText alert alert-light" :href="formUrl">
                            <pre>{{formUrl}}</pre>
                        </a>
                        <h4>StreamElements 'fields'</h4>
                        <span class="urlText alert alert-light">
                            <pre>{{settingsJSON}}</pre>
                        </span>
                    </div>
                </template>
                <template v-slot:displayBox>
                    <component :is="displayBox"></component>
                </template>
                <template v-slot:widgetTypeSettings>
                    <div id="widgetTypeSettings">
                        <form id="primaryForm" class="settingsBox">
                            <div>
                                <label for="widgetId">Widget ID</label>
                                <input name="widgetId" id="widgetId" v-model="moduleId"/>
                            </div>
                            <div>
                                <label for="theme">Widget Theme</label>
                                <input name="theme" id="theme" v-model="theme"/>
                            </div>
                            <div>
                                <h4>Widget Type</h4>
                                <div>
                                    <div v-for="(eachInfo, eachId) of widgetTypes">
                                        <input type="radio" name="widgetType" :value="eachId" :id="'wt_' + eachId" v-model="widgetType"/>
                                        <label :for="'wt_' + eachId">{{eachInfo.title}}</label>
                                    </div>
                                    todo: some of these options like timer or counter or will potentially have their own options beyond service type or offer different services like chat-command triggers
                                </div>
                            </div>
                            <div>
                                <h4>Backend Service</h4>
                                <div>
                                    <div v-for="(eachInfo, eachId) of serviceTypes">
                                        <input type="radio" name="serviceType" :value="eachId" :id="'service_' + eachId" v-model="serviceType"/>
                                        <label :for="'service_' + eachId">{{eachInfo.title}}</label>
                                    </div>
                                    todo: some of these options like timer or counter or will potentially have their own options beyond service type or offer different services like chat-command triggers
                                </div>
                            </div>
                        </form>
                    </div>
                </template>
            </component>
        `,
        el: '#config'
    }

    let thing = new Vue(perWidgetComponent);
};
doWork();