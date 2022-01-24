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
        theModule.finalizeBoxes();
        return {
            currentFormPage: 'widget-type-section',
            compositeModule: theModule,
            selectedServiceTypes: [],
            pages: Vue.markRaw(['widget-type-section', 'services-section', 'links-section']),
        };
    },
    components: {
        'widget-type-section': WidgetTypeSection,
        'services-section': ServicesSection,
        'links-section': LinksSection
    },
    template: `
    <div>
        <component :is="currentFormPage" :module="compositeModule"/>
        <div class="d-flex justify-content-around">
            <button v-if="pages.indexOf(currentFormPage) > 0" type="button" class="btn btn-secondary" @click="navPrev">Previous</button>
            <button v-if="pages.indexOf(currentFormPage) < (pages.length-1)" type="button" class="btn btn-secondary" @click="navNext">Next</button>
        </div>
    </div>
    `,
    methods: {
        navPrev() {
            this.currentFormPage = this.pages[this.pages.indexOf(this.currentFormPage)-1];
        },
        navNext() {
            this.currentFormPage = this.pages[this.pages.indexOf(this.currentFormPage)+1];
        }
    }
};      