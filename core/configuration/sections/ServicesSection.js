import {widgetTypes, serviceTypes, handlerTypes} from '../../CompositeModule.js';
import defaultThemeBoxes from '../../../themes/default/displays.js';

export default {
    template: `
    <div>
        <h1>Services</h1>
        <div>
            <div v-for="eachService of serviceList" class="configBox d-flex justify-content-between">
                <div>
                    <component :is="eachService.boxes.settings"/>
                    <div>
                        <h3>Event Handlers</h3>
                        <div v-for="eachHandler of handlersByService[eachService.config.moduleId]" class="configBox d-flex justify-content-between">
                            <component :is="eachHandler.boxes.settings"/>
                            <button type="button" class="btn btn-primary" @click="deleteHandler(eachHandler)">Delete</button>
                        </div>
                        <button type="button" class="btn btn-primary" @click="addHandler(eachService)">New Handler</button>
                    </div>           
                </div>
                <button type="button" class="btn btn-primary" @click="deleteService(eachService)">Delete</button>
            </div>
        </div>
        <div class="configBox">
            <h2>Add Service</h2>
            <button v-for="eachType of Object.keys(serviceTypes)" type="button" class="btn btn-primary" @click="addService(eachType)">New {{serviceTypes[eachType].title}}</button>
        </div>
    </div>
    `,
    props: ['module'],
    emits: ['submitSection'],
    data() {
        return {
            serviceList: Object.values(this.module.services),
            handlerList: Object.values(this.module.handlers),
            serviceTypes: Vue.markRaw(serviceTypes)
        };
    },
    computed: {
        handlersByService() {
            let result = {};
            for(let eachService of this.serviceList) {
                let eachResult = this.handlerList.filter(each => each.config.serviceId == eachService.config.moduleId);
                result[eachService.config.moduleId] = eachResult;
            }
            return result;
        }
    },
    watch: {
    },
    methods: {
        submitMe() {
            this.$emit('submitSection', this.module);
        },
        async addService(newServiceType) {
            let newServiceId;
            do {
                let randomNum = Math.floor(Math.random() * 1000000);
                newServiceId = `${newServiceType}_${randomNum}`;

            } while(this.serviceList.some(each => each.config.moduleId == newServiceId));

            let newService = new serviceTypes[newServiceType].constructor({
                moduleId: newServiceId,
                moduleTypeName: newServiceType
            });
            await newService.finalizeBoxes();
            this.module.services[newServiceId] = newService;
            this.serviceList.push(newService);
        },
        async deleteService(targetService) {
            delete this.module.services[targetService.config.moduleId];
            for(let each of this.handlersByService[targetService.config.moduleId]) {
                this.deleteHandler(each);
            }
            this.serviceList.splice(this.serviceList.indexOf(targetService), 1);
        },
        async addHandler(eachService) {
            let newHandlerId;
            do {
                let randomNum = Math.floor(Math.random() * 1000000);
                newHandlerId = `${eachService.config.moduleTypeName}_handler_${randomNum}`;

            } while(Object.values(this.module.handlers).some(each => each.config.moduleId == newHandlerId));
            let newHandler = new handlerTypes[eachService.config.moduleTypeName][this.module.widget.config.moduleTypeName](
                {
                    moduleId: newHandlerId,
                    serviceId: eachService.config.moduleId
                }
            );
            await newHandler.finalizeBoxes();
            this.module.handlers[newHandlerId] = newHandler;
            this.handlerList.push(newHandler);
        },
        async deleteHandler(targetHandler) {
            delete this.module.handlers[targetHandler.config.moduleId];
            this.handlerList.splice(this.handlerList.indexOf(targetHandler), 1);
        }
    },
};