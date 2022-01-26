import {widgetTypes} from '../../CompositeModule.js';
import defaultThemeBoxes from '/themes/default/displays.js';

export default {
    template: `
    <div>
        <div id="previewSection">
            <h1>Widget Preview</h1>
            <component :is="displayBox"/>
        </div>
        <div id="widgetSettings" class="configBox">
            <h1>Widget Settings</h1>
            <form id="universalWidgetDetails" class="settingsBox">
                <div>
                    <label for="widgetId">Widget ID</label>
                    <input name="widgetId" id="widgetId" v-model="module.config.moduleId"/>
                </div>
                <div>
                    <label for="theme">Widget Theme</label>
                    <input name="theme" id="theme" v-model="module.widget.config.theme"/>
                </div>
            </form>
            <form id="widgetTypeForm" class="settingsBox">
                <div>
                    <h4>Widget Type</h4>
                    <div>
                        <div v-for="(eachInfo, eachId) of widgetTypes">
                            <input type="radio" name="widgetType" :value="eachId" :id="'wt_' + eachId" v-model="selectedWidgetType"/>
                            <label :for="'wt_' + eachId">{{eachInfo.title}}</label>
                        </div>
                    </div>
                </div>
            </form>
            <form id="additionalWidgetSettings" class="settingBox">
                <component :is="settingsBoxes"/>
            </form>
        </div>
    </div>
    `,
    props: ['module'],
    data() {
        return {
            widgetTypes: Vue.markRaw(widgetTypes),
            selectedWidgetType: this.module.widget.config.moduleTypeName,
            displayBoxGenerators: Vue.markRaw(defaultThemeBoxes),
            displayBox: Vue.markRaw({template: ''}),
            settingsBoxes: Vue.markRaw({template: ''}),
            settingsBoxPromise: Promise.resolve()
        };
    },
    watch: {
        'module.widget.config.theme'() {
            this.loadTheme().then(()=>this.updateBoxes());
        },
        'module.config.moduleId'() {
            this.module.widget.config.moduleId = `the_only`;
        },
        'selectedWidgetType'() {
            this.module.handlers = {};
            let theTheme = this.module.widget.config.theme;
            this.module.widget = Vue.markRaw(new widgetTypes[this.selectedWidgetType].constructor());
            this.module.widget.config.moduleTypeName = this.selectedWidgetType;
            this.module.widget.config.moduleId = `the_only`;
            this.module.widget.config.theme = theTheme;
            this.module.widget.finalizeBoxes().then(
                () => this.settingsBoxes = this.module.widget.boxes.settings
            );
            this.updateBoxes();
        }
    },
    methods: {
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
                newStyleSheet.href = `./themes/${this.module.widget.config.theme}/style.css`;
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
        this.module.widget.config.moduleId = `the_only`;
        await this.module.widget.finalizeBoxes();
        this.settingsBoxes = this.module.widget.boxes.settings
        await this.updateBoxes();
    },
};