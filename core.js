let globalContainer = document.createElement('div');
globalContainer.id = 'globalCon';
globalContainer.innerHTML = `
    <div id="displayCon">
    </div>
    <div id="urlCon">
        <h1>URLs (for various browser sources to add to OBS)</h1>
        <!---Configured URLs go here-->
    </div>
    <div id="infoCon">
        <h1>Additional Information</h1>
    </div>
    <div id="controlsCon">
        <h1>Controls</h1>
    </div>
    <div id="settingsCon">
        <h1>Settings</h1>
        <button class="btnSave">
            Save Settings
        </button>
        <div id="sensitiveSettingsCon">
        </div>
        <div id="generalSettingsCon">
        </div>
        <button class="btnSave">
            Save Settings
        </button>
    </div>
`;

let baseUrl;
let settings = {};
let hashSettings = {};
let eventLog = [];

//these are default, standard, expected hash settings (but overridable)
let hashConfig = {
    sensitivesettings: {
        type: 'showElm',
        target: 'sensitiveSettingsCon',
        default: false
    },
    generalsettings: {
        type: 'showElm',
        target: 'generalSettingsCon',
        default: false
    },
    controls: {
        type: 'showElm',
        target: 'controlsCon',
        default: false
    }, 
    info: {
        type: 'showElm',
        target: 'infoCon',
        default: false
    },
    urls: {
        type: 'showElm',
        target: 'urlCon',
        default: true
    },
    log: {
        type: 'showElm',
        target: 'logDisplayBox',
        default: false
    },
    settings: {
        type: 'collectiveShowElm',
        target: 'settingsCon',
        parts: ['generalsettings', 'sensitivesettings']
    }
};

let urls = {
    sensitiveSettings: {
        description: '<span style="font-size: 2em;">🔒</span> Set sensitive settings such as auth keys here (DANGER: DON\'T SHOW WHILST LIVE):',
        builder: base => `${base}#urls=0&sensitiveSettings`
    },
    generalSettings: {
        description: '<span style="font-size: 2em;">⚙</span> Set settings here:',
        builder: base => `${base}#urls=0&generalSettings`,
    },
    log: {
        description: '<span style="font-size: 2em;">📜</span> See a log of your recently reached goals here:',
        builder: base => `${base}#urls=0&log`,
    },
    controlsNInfo: {
        description: '<span style="font-size: 2em;">🛈+⚙</span> See additional information and use controls (to, for example, reset a counter) here:',
        builder: base => `${base}#urls=0&info&controls`
    }
};

let modules = {};

function checkHash(hashConfig) {
    //default to global being hidden until hash is resolved
    let hash = window.location.hash;
    if(hash) {
        hash = hash.substring(1);
        let parts = hash.split('&');
        for(let each of parts) {
            each = each.split('=');
            let name = each[0].toLowerCase();
            let value = 1; //default to true
            if(each.length > 1) {
                value = each[1];
                if(value == "false" || value == '0') {
                    value = false;
                }
            }
            hashSettings[name] = value;
        }
    }
    for(let eachName in hashConfig) {
        let eachConfig = hashConfig[eachName];
        switch(eachConfig.type) {
            case 'showElm':
                // console.log(eachName, hashSettings[eachName], eachConfig.default, typeof hashSettings[eachName] === 'undefined', !(hashSettings[eachName] || (hashConfig[eachName].default && typeof hashSettings[eachName] === 'undefined')));
                if(!(hashSettings[eachName] || (eachConfig.default && typeof hashSettings[eachName] === 'undefined'))) {
                    globalContainer.querySelector(`#${eachConfig.target}`).classList.add('hidden');
                }
                break;
            case 'collectiveShowElm':
                let show = eachConfig.parts.reduce(
                    (cur, eachName) => cur || hashSettings[eachName] || (hashConfig[eachName].default && typeof hashSettings[eachName] === 'undefined'),
                    false
                );
                if(!show) {
                    globalContainer.querySelector(`#${eachConfig.target}`).classList.add('hidden');
                }    
                break;
            default:
                //custom handlers
                eachConfig.handler(hashSettings[eachName]);
        }
    }
}
/**
* Sets up the list of displayed urls
*/
function setUrls(urls) {
    let parent = globalContainer.querySelector('#urlCon');
    for(let eachName in urls) {
        let eachConfig = urls[eachName];
        let eachBox = document.createElement('div');
        eachBox.classList.add('urlBox');
        eachBox.id = `${eachName}UrlBox`;
        
        let eachDescription = document.createElement('div');
        eachDescription.classList.add('urlDescription');
        eachDescription.innerHTML = eachConfig.description;
        eachBox.appendChild(eachDescription);

        let eachValueDisplay = document.createElement('div');
        eachValueDisplay.classList.add('urlText');
        eachValueDisplay.id = `${eachName}UrlText`;
        eachValueDisplay.innerText = eachConfig.builder(baseUrl);
        eachBox.appendChild(eachValueDisplay);

        parent.appendChild(eachBox);
    }
}

function update() {
    for(let each of Object.values(modules)) {
        each.updateElements();
    }
}

function save() {
    for(let each of Object.values(modules)) {
        each.updateSettings();
        each.updateElements();
        each.save();
    }
}

function initialize(config) {
    
    window.onresize = update;

   
    //trigger stuff
    baseUrl = window.location.origin + window.location.pathname;
    
    //the use of hash settings should help in the creation of scenes that show the timer without the settings visible.
    for(let each in config.urls) {
        urls[each] = config.urls[each];
    }

    setUrls(urls);

    let displayCon = globalContainer.querySelector('#displayCon');
    let infoCon = globalContainer.querySelector('#infoCon');
    let controlsCon = globalContainer.querySelector('#controlsCon');
    let sensitiveSettingsCon = globalContainer.querySelector('#sensitiveSettingsCon');
    let generalSettingsCon = globalContainer.querySelector('#generalSettingsCon');

    //bind the save settings buttons to the save function
    for(let each of globalContainer.querySelectorAll(':scope .btnSave')) {
        each.onclick = save;
    }

    //initialise each module's boxes etc
    for(let each of config.modules) {
        modules[each.moduleId] = each;
        if(each.displayBox) {
            displayCon.appendChild(each.displayBox);
        }
        if(each.infoBox) {
            infoCon.appendChild(each.infoBox);
        }
        if(each.controlsBox) {
            controlsCon.appendChild(each.controlsBox);
        }
        if(each.sensitiveSettingsBox) {
            sensitiveSettingsCon.appendChild(each.sensitiveSettingsBox);
        }
        if(each.settingsBox) {
            generalSettingsCon.appendChild(each.settingsBox);
        }
    }

    //now process the hash, etc.
    for(let each in config.hash) {
        hashConfig[each] = config.hash[each];
    }
    checkHash(hashConfig);

    //now display everything
    document.querySelector('body').appendChild(globalContainer);
}

export default initialize;