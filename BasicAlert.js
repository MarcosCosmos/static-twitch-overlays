import Module from "./Module.js";



//todo: make this accept both/either external events from a scanner, and also internally generated goals.
//todo: possibly introduce a universal logger/database-driven logger as a result?
//todo: on a server or fully locally? (fully locally I suppose?)
//todo: according to https://medium.com/@mfreundlich1/syncing-localstorage-across-multiple-tabs-cb5d0b1feaab localstorage will be fully sufficient due to an a window 'storage' event? nice. Assuming OBS supports that correctly.
//It also means that one master service source might work?
class BasicAlert extends Module {
    generateDisplayBox() {
        super.generateDisplayBox();
        this.componentLists.display.push({
            template: `<div>(Coming Soon)</div>`
        });
    }
    // generateSettingsBox() {
    //     super.generateSettingsBox();
        
    //     let newForm = document.createElement('form');
    // }
}

export default BasicAlert;