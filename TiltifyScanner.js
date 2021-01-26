import EventEmitter from './EventEmitter.js';
import Module from './Module.js';

const defaultData = {
    //track the amount raised so we only raise events when that changes
    donoPaginationMark: null,
    seenEvents: new Set()
};
const defaultConfig = {
    accessToken: '',
    campaignId: '',
    moduleId: 'tiltifyScanner',
    scanDelay: 30000, //integer, expressed in ms, (suggested: 30s (30000ms)),
    defaultData: defaultData
};

//todo: fields

class TiltifyScanner extends EventEmitter {
    constructor(config={}) {
        super(Module.mixin(defaultConfig, config));
        this.listeners = [];
        this.scanningInterval = null;
    }

    populateSEFields() {
        super.populateSEFields();
        let self=this;
        Object.assign(this.streamElementsFields, 
            {
                accessToken: {
                    get destination(){return self.config.accessToken;},
                    set destination(v){self.config.accessToken = v;},
                    settings: {
                        type: 'text',
                        label: 'Tiltify Access Token'
                        //this value will be randomly generated on the config side
                    }
                },
                campaignId: {
                    get destination(){return self.config.campaignId;},
                    set destination(v){self.config.campaignId = v;},
                    settings: {
                        type: 'text',
                        label: 'Tiltify Campaign ID'
                        //this value will be randomly generated on the config side
                    }
                }
            }
        );

         //todo: consider if this should become static in some way and have the result passed as a constructor? it'll be easier to do it this way for now but the alternative would be more performant.
    }

    generateBoxes() {
        super.generateBoxes();
        this.componentLists.settings.push({
            data: this.coreDataGetter,
            template: `
                <div>
                    <h4>Authentication Settings</h4>
                    <form action="" onsubmit="return false">
                        <div>
                            <label :for="config.moduleId + 'AccessToken'">
                                Access Token:
                            </label>
                            <input name="accessToken" :id="config.moduleId + 'AccessToken'" v-model="config.acessToken"/>
                        </div>
                        <div>
                            <label for="config.moduleId + 'CampaignId'">
                                Campaign ID:
                            </label>
                            <input name="campaignId" id="config.moduleId + 'CampaignId'" v-model="config.campaignId"/>
                        </div>
                    </form>
                </div>
            `
        });
    }

    async checkCampaign() {
        //TODO: HANDLE LOAD RELATED CONFLICT IN THIS AND SET UP OTHER GOAL TYPES
        let atEnd = false;
        let params = {
            count: 10
        };
        let mostRecentlySeen = this.loadData.donoPaginationMark;
        if(this.info.donoPaginationMark && !isNaN(this.info.donoPaginationMark)) {
            params.after = this.info.donoPaginationMark;
        }
        let firstPass = true;
        while(!atEnd) {
            //do an api call to check for duration extensions and update the extension amount!
            let request = new XMLHttpRequest();
            try {
                let response = (await (await fetch(
                    `https://tiltify.com/api/v3/campaigns/${this.config.campaignId}/donations?${new URLSearchParams(params).toString()}`,
                    {
                        method: 'GET',
                        headers: new Headers({'Authorization': `Bearer ${this.config.accessToken}`})
                    }
                )).json());
                let donations = response.data;
                
                if(donations.length > 0) {
                    if(firstPass) {
                        //the results start from the most recent if before is ommitted, so on the first pass we find the limit for the next check, then we have to keep scanning back through history to get up to what we saw on the last check
                        this.info.donoPaginationMark = new URLSearchParams(response.links.next).get('after');
                        firstPass = false;
                    }

                    // let lock = await self.requestDataLock();
                    // for(const each of donations) {
                    //     if(!this.info.eventsSeen.has(each.id)) { 
                    //         this.info.eventsSeen.add(each.id);
                            
                    //     }
                    // }
                    // await this.save(lock);
                }
                if(response.links.prev.length > 0) {
                    let tmp = new URLSearchParams(response.links.prev).get('before');
                    if(tmp) {
                        params.before = tmp;
                    }
                } else {
                    atEnd = true;
                }
                if(response.links.next.length === 0) {
                    atEnd = true;
                }
            } catch (e) {
                console.error(e);
                atEnd = true;
            }
        }
    }

    start() {
        this.checkCampaign();
        this.scanningInterval = setInterval(
            this.checkCampaign.bind(this),
            this.config.scanDelay
        );
    }

    stop() {
        clearInterval(this.scanningInterval);
        this.scanningInterval = null;
    }
}

export default TiltifyScanner;