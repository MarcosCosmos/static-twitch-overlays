import Form from './Form.js'
import Module from '../Module.js';
let randomNum = Math.floor(Math.random() * Math.floor(1000000));
const baseDefaultConfig = {
    moduleId: `compositeModule_${randomNum}`,
    widget: {moduleTypeName: 'goal', moduleId: `compositeModule_widget_the_only`},
    services: [],
    handlers: []
};

let loadedConfig;
if(document.location.search.length > 0) {
    loadedConfig = JSON.parse(decodeURIComponent(document.location.search.slice(1)));
} else {
    loadedConfig = {};
}
let initialConfig = Module.mixin(baseDefaultConfig, loadedConfig);

const app = Vue.createApp(Form, {initialConfig: initialConfig});
const vm = app.mount('#config');