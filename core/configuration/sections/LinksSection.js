import {widgetTypes} from '../../CompositeModule.js';
import defaultThemeBoxes from '/themes/default/displays.js';


import Module from '../../Module.js';

function relativeToAbsolute(path) {
    let base = document.location.href.split("?",1)[0];
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

export default {
    template: `
        <div>
            <div id="previewSection">
                <h1>Widget Preview</h1>
                <component :is="displayBox"/>
            </div>
            <div id="urlSection">
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
                    <h4>Settings JSON</h4>
                    <div class="urlText alert alert-light" v-on:click="forceSelection">{{settingsJSON}}</div>
                </div>
            </div>
        </div>
    `,
    props: ['module'],
    data() {
        return {
            displayBoxGenerators: Vue.markRaw(defaultThemeBoxes),
            displayBox: Vue.markRaw({template: ''}),
        };
    },
    computed: {
        compositeConfig() {
            return {
                moduleId: this.module.config.moduleId,
                widget: this.module.widget.config,
                services: Object.values(this.module.services).map(each=>each.config),
                handlers: Object.values(this.module.handlers).map(each=>each.config)
            };
        },
        formattedConfig() {
            return JSON.stringify(this.compositeConfig, Set_toJSON, 4);
        },
        displayUrl() {
            let displayConfig = Module.mixin(this.compositeConfig, {boxToShow: 'display'});
            displayConfig = encodeURIComponent(JSON.stringify(displayConfig));
            return `${relativeToAbsolute('./core/embed.html')}?${displayConfig}`;
        },
        controlsUrl() {
            let controlsConfig = Module.mixin(this.compositeConfig, {boxToShow: 'controls'});
            controlsConfig = encodeURIComponent(JSON.stringify(controlsConfig));
            return `${relativeToAbsolute('./core/embed.html')}?${controlsConfig}`;
        },
        formUrl() {
            let formConfig = encodeURIComponent(JSON.stringify(this.compositeConfig));
            return `${relativeToAbsolute('./configuration.html')}?${formConfig}`;
        },
        settingsJSON() {
            return `${this.formattedConfig}`;
        },
        displayBox() {
            return this.themeBoxes[this.widgetType];
        }
    },
    methods: {
        async loadTheme() {
            //only change theme if the new theme is real
            let themeJsUrl = `/themes/${this.module.widget.config.theme}/displays.js`;
            if((await fetch(themeJsUrl)).status === 200){
                //only changes the css on a successful theme being grabbed
                
                let oldStyleSheet = document.querySelector('#themeStyle');
                if(oldStyleSheet) {
                    oldStyleSheet.remove();
                }
                let newStyleSheet = document.createElement('link');
                newStyleSheet.rel = 'stylesheet';
                newStyleSheet.href = `/themes/${this.module.widget.config.theme}/style.css`;
                newStyleSheet.id = 'themeStyle';
                
                document.head.appendChild(newStyleSheet);

                this.displayBoxGenerators = (await import(themeJsUrl)).default;
            }
        },
        async updateBoxes() {
            this.displayBox = Vue.markRaw(await (this.displayBoxGenerators[this.module.widget.config.moduleTypeName].bind(this.module.widget)()));
        }
    },

    async created() {
        this.loadTheme();
        this.updateBoxes();
        this.module.widget.finalizeBoxes().then(
            () => this.settingsBoxes = this.module.widget.boxes.settings
        );
    },
};