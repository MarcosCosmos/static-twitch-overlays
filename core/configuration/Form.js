import CompositeModule, {widgetTypes, serviceTypes, handlerTypes} from '../CompositeModule.js';
import WidgetTypeSection from './sections/WidgetTypeSection.js';
import ServicesSection from './sections/ServicesSection.js';
import LinksSection from './sections/LinksSection.js';

export default {
    props: ['initialConfig'],
    data() {
        let theModule = new CompositeModule(this.initialConfig);
        theModule.widget.config.moduleId = `the_only`;
        /* strip away the previously injected module id prefixes from the services and handlers*/
        for(let each of Object.values(theModule.services)) {
            each.config.moduleId = each.config.moduleId.substring(theModule.config.moduleId.length+9);
        }
        for(let each of Object.values(theModule.handlers)) {
            each.config.moduleId = each.config.moduleId.substring(theModule.config.moduleId.length+9);
        }
        return {
            currentFormPage: 'null',
            module: theModule,
            selectedServiceTypes: [],
            pages: Vue.markRaw(['widget-type-section', 'services-section', 'links-section']),
        }
    },
    components: {
        'null': {template:''},
        'widget-type-section': WidgetTypeSection,
        'services-section': ServicesSection,
        'links-section': LinksSection,
        'nav-bar': {
            props: ['pages', 'currentFormPage'],
            emits: ['navPrev', 'navNext'],
            template: `
                <div class="d-flex justify-content-center">
                    <div class="btn-group">
                        <button :disabled="!(pages.indexOf(currentFormPage) > 0)" type="button" class="btn btn-info" @click="$emit('navPrev')">Previous</button>
                        <ul class="nav nav-tabs">
                            <li v-for="eachPage of pages" class="nav-item">
                                <a :class="'nav-link' + (eachPage === currentFormPage ? ' active' : '')" :href="'#' + eachPage">{{eachPage}}</a>
                            </li>
                        </ul>
                        <button :disabled="!(pages.indexOf(currentFormPage) < (pages.length-1))" type="button" class="btn btn-info" @click="$emit('navNext')">Next</button>
                    </div>
                </div>
            `
        }
    },
    template: `
    <div>
        <nav-bar :pages="pages" v-bind:currentFormPage="currentFormPage" @navPrev="navPrev" @navNext="navNext"/>
        <component :is="currentFormPage" :module="module"/>
        <nav-bar :pages="pages" v-bind:currentFormPage="currentFormPage" @navPrev="navPrev" @navNext="navNext"/>
    </div>
    `,
    methods: {
        async navTo(page) {
            await this.module.finalizeBoxes();
            this.currentFormPage = page;
        },
        navPrev() {
            console.log('hi');
            this.navTo(this.pages[this.pages.indexOf(this.currentFormPage)-1]);
        },
        navNext() {
            this.navTo(this.pages[this.pages.indexOf(this.currentFormPage)+1]);
        },
        updateNavFromHash() {
            let hash = document.location.hash.substring(1);
            console.log('hi', hash);
            if(this.pages.includes(hash)) {
                console.log('bye', hash);
                this.navTo(hash);
            }
        }
    },
    async created() {
        await this.module.finalizeBoxes();
        let hash = document.location.hash.substring(1);
        if(this.pages.includes(hash)) {
            this.navTo(hash);
        } else {
            this.navTo(this.pages[0]);
        }
        this.updateNavFromHash();
        window.addEventListener('hashchange', ()=>{
            this.updateNavFromHash();
        })
    }
};      