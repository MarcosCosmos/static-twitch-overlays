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
                    <h5>Main Display URL (local)</h5>
                    <a class="urlText alert alert-light" :href="displayUrl" target="_blank">
                        <pre>{{displayUrl}}</pre>
                    </a>
                    <h5>Additional Controls URL (local)</h5>
                    <a class="urlText alert alert-light" :href="controlsUrl" target="_blank">
                    <pre>{{controlsUrl}}</pre>
                    </a>
                    <h5>Main Display HTML (StreamElements)</h5>
                    <textarea class="urlText alert alert-light" target="_blank" disabled>{{seDisplayHTML}}</textarea>
                    <h5>Additional Controls HTML (StreamElements)</h5>
                    <textarea class="urlText alert alert-light" target="_blank" disabled>{{seControlsHTML}}</textarea>
                    

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
            return `${relativeToAbsolute('./configuration.html')}?${formConfig}#links-section`;
        },
        settingsJSON() {
            return `${this.formattedConfig}`;
        },
        seDisplayHTML() {
            return this.generateEmbedHTML('display');
        },
        seControlsHTML() {
            return this.generateEmbedHTML('controls');
        },
        displayBox() {
            return this.themeBoxes[this.widgetType];
        }
    },
    methods: {
        generateEmbedHTML(boxToShow) {
            return `
            <!doctype html>
            <html>
                <head>
                    <link rel="stylesheet" href="https://mc-twitch-overlays-beta.netlify.app/core/core.css" title="Core CSS with default styles"/>
                    <script src='https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.3/socket.io.js' type='text/javascript'></script>
                    <script src="https://cdn.jsdelivr.net/npm/vue@3.2.27/dist/vue.global.js"></script>
                    <script type="module">
                        import initialise from 'https://marcoscosmos.gitlab.io/static-twitch-overlays/core/embed.js';
                        window.addEventListener('onWidgetLoad', function (obj) {
                            let config = ${JSON.stringify(this.compositeConfig)};
                            config.boxToShow = '${boxToShow}';
                            initialise(config, !(obj.detail.overlay.isEditorMode),'https://marcoscosmos.gitlab.io/static-twitch-overlays');
                        });
                    </script>
                </head>
                <body>
                    <div id="embed"></div>
                </body>
            </html>
            `;
        },
        async loadTheme() {
            //only change theme if the new theme is real
            let themeJsUrl = `./themes/${this.module.widget.config.theme}/displays.js`;
            if((await fetch(themeJsUrl)).status === 200){
                //only changes the css on a successful theme being grabbed
                
                let oldStyleSheet = document.querySelector('#themeStyle');
                if(oldStyleSheet) {
                    oldStyleSheet.remove();
                }
                let newStyleSheet = document.createElement('link');
                newStyleSheet.rel = 'stylesheet';
                newStyleSheet.href = `.//themes/${this.module.widget.config.theme}/style.css`;
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
        await this.module.widget.finalizeBoxes();
        await this.updateBoxes();
    },
};