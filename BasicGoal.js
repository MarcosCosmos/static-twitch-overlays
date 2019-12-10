import Module from './Module.js';

const defaultData = {
    currentCount: 0,
    totalCount: 0,
    goalsReached: 0
};
const defaultSettings = {
    goal: 0
};

/**
 * Note this basic/base goal doesn't include an updating mechanism in and of itself other than manually through settings, and should be extended with subclasses that interact with other modules (such a streamlabs socket.io module) to listen for updates
 */
export default class BasicGoal extends Module {
    constructor(config) {
        /**
         * config: {
         *  prefix: 'btnPress', //note: displayable, numeric prefixes should be managable via css
         *  displayTitle: 'Button Presses',
         *  settingsTitle: 'Button Pressing Goal',
         *  step: number | 'any',
         *  min: number,
         *  useModulo: bool, //indicates whether or not to roll over to 0 when a goal is reached,
         *  logger: optional Logger instance (only used if present)
         * }
         */
        config.defaultData = defaultData;
        config.defaultSettings = defaultSettings;
        super(config);
    }

    generateDisplayBox() {
        this.displayBox = document.createElement('div');
        this.displayBox.classList.add('displayBox');
        this.displayBox.id = `${this.prefix}DisplayBox`;

        //in case we use the bar style, also set some css to reflect the current proportion (though it won't show without additional styling)
        let width = this.displayBox.offsetWidth;
        let currentProportion = this.data.currentCount / this.settings.goal;
        let markerPoint = Math.floor(currentProportion*width);
        
        //semi-redundant to apply it this way only the first time; the intention goes towards making this logic easier to inspect even if you'd need to go to browser inspection to get a full copy.
        this.displayBox.setAttribute('style', `background-size: ${markerPoint}px, 1px; background-position: 0, ${markerPoint}px;`)

        //these initial values somewhat serve as a declarative example of how what needs to set and how even though with the current overall implementation it's immediately updated/overriden
        let eachStrokeInner = `
            ${this.moduleConfig.displayTitle}: <span class="countValue">${this.data.currentCount}</span>
            <span class="goalCon ${this.settings.goal == 0 ? 'hidden' : ''}">
                /
                <span class="goalValue">${this.settings.goal}</span>
            </span>
        `;

        // <span class="goalsReachedCon ${this.data.currentCount/this.settings.goal < 1 ? 'hidden' : ''}">
        //      (Hit <span class="goalsReachedValue">${Math.floor(this.data.currentCount/this.settings.goal)}</span>x)
        // </span>

        this.displayBox.innerHTML = `
            <div class="backstroke">
                ${eachStrokeInner}
            </div>
            <div class="forestroke">
                ${eachStrokeInner}
            </div>
        `;

        //todo: maybe don't apply redundant changes on each update; though that would dynamically updating the module config based on hash data?

        
        this.displayElms = {
            countValues: this.displayBox.querySelectorAll(':scope .countValue'),
            goalValues: this.displayBox.querySelectorAll(':scope .goalValue'),
            // goalsReachedValue: this.displayBox.querySelectorAll(':scope .goalsReachedValue'),
            goalCon: this.displayBox.querySelectorAll(':scope .goalCon'),
            // goalsReachedCon: this.displayBox.querySelectorAll(':scope .goalsReachedCon')
        }
    }

    generateInfoBox() {
        this.infoBox = document.createElement('div');
        this.infoBox.classList.add('infoBox');
        this.infoBox.id = `${this.prefix}InfoBox`;
        this.infoBox.innerHTML = `
            <h3>${this.moduleConfig.displayTitle}</h3>
            <div>
                Total Amount: <span class="${this.prefix}Total">${this.data.totalCount}</span>
            </div>
            <div>
                Goals reached: <span class="${this.prefix}GoalsReached">${this.data.goalsReached}</span>
            </div>
        `;

        this.infoElms = {
            total: this.infoBox.querySelector(`:scope .${this.prefix}Total`),
            goalsReached: this.infoBox.querySelector(`:scope .${this.prefix}GoalsReached`)
        };
    }

    generateSettingsBox() {
        this.settingsBox = document.createElement('div');
        this.settingsBox.classList.add('settingsBox');
        this.settingsBox.id = `${this.prefix}SettingsBox`;
        
        this.settingsBox.innerHTML = `
            <h3>${this.moduleConfig.displayTitle}</h3>
            <div>
                <label for="${this.prefix}GoalSetting">
                    Note: a value of 0 will hide the goal entirely
                    <br/>
                    Goal:
                </label>
                <input name="${this.prefix}GoalSetting" id="${this.prefix}GoalSetting" type="number" step="${this.moduleConfig.step}" min="${this.moduleConfig.min}" value="${this.settings.goal}"/>
            </div>
        `;
        
        this.settingsElms.goal = this.settingsBox.querySelector(`:scope #${this.prefix}GoalSetting`);
    }

    generateControlsBox() {
        this.controlsBox = document.createElement('div');
        this.controlsBox.classList.add('controlsBox');
        this.controlsBox.id = `${this.prefix}ControlsBox`;

        this.controlsBox.innerHTML = `
            <h3>${this.moduleConfig.displayTitle}</h3>
            <div>
                <label for="${this.prefix}CurrentOverride">
                    <span style="color: red;">Warning: this action is cannot be undone</span>
                    <br/>
                    Override the current count to:
                </label>
                <input name="${this.prefix}CurrentOverride" id="${this.prefix}CurrentOverride" type="number" step="${this.moduleConfig.step}" min="${this.moduleConfig.min}" value="0"/>
                <button type="button" class="overrideCurrentButton">Override</button>
            </div>
            <div>
                <label for="${this.prefix}TotalOverride">
                    <span style="color: red;">Warning: this action is cannot be undone</span>
                    <br/>
                    Override the total count to:
                </label>
                <input name="${this.prefix}TotalOverride" id="${this.prefix}TotalOverride" type="number" step="${this.moduleConfig.step}" min="${this.moduleConfig.min}" value="0"/>
                <button type="button" class="overrideTotalButton">Override</button>
            </div>
            <div>
                <span style="color: red;">Warning: this action is cannot be undone</span>
                <button type="button" class="eraseButton">Erase Data</button>
            </div>
        `;

        for(let each of ['current', 'total']) {
            let eachCapsed = each.charAt(0).toUpperCase() + each.slice(1);
            let input = this.controlsBox.querySelector(`:scope #${this.prefix}${eachCapsed}Override`);
            let button = this.controlsBox.querySelector(`:scope .override${eachCapsed}Button`);

            button.onclick = event => {
                button.disabled = true;
                this.data[`${each}Count`] = input.value;
                this.updateElements();
                button.disabled = false;
            }
        }

        let eraseButton = this.controlsBox.querySelector(':scope .eraseButton');
        eraseButton.onclick = event => {
            eraseButton.disabled = true;
            this.data = {};
            for(let each in defaultData) {
                this.data[each] = defaultData[each];
            }
            this.storeItems(this.data);
            this.updateElements();
            eraseButton.disabled = false;
        }

        //todo: if we're not already using modulo, add an option to remove the amount equal to the current goal from the total

    }

    updateElements() {
        /*Update the display box*/

        //first log an event if we reached a goal and (depending on the module config) apply a modulo to the stored value
        let newCount;
        let newTimesReached;
        let totalTimesReached = this.data.goalsReached;
        if(this.moduleConfig.useModulo) {
            newCount = this.settings.goal == 0 ? this.data.currentCount : this.data.currentCount % this.settings.goal;
            newTimesReached = this.settings.goal == 0 ? 0 : Math.floor(this.data.currentCount / this.settings.goal);
            totalTimesReached += newTimesReached;
        } else {
            //if not using the modulo, then keep track of all the count past the goal, and only track the first time the goal is reached
            newCount = this.data.currentCount;
            let tmpTimesReached = this.settings.goal == 0 ? 0 : (this.data.currentCount > this.settings.goal ? 1 : 0);
            newTimesReached = totalTimesReached = Math.max(0, tmpTimesReached - this.data.goalsReached);
        }

        //update the data stored both in localStorage and local variables
        if(newCount != this.data.currentCount || newTimesReached) {
            this.data.currentCount = newCount;
            this.data.goalsReached = totalTimesReached;
            this.storeItems(this.data);
        }

        if(this.moduleConfig.logger && newTimesReached != 0) {
            //log events and update the stored values accordingly.
            for(let i=0; i <newTimesReached; ++i) {
                this.moduleConfig.logger.log({
                    name: this.moduleConfig.displayTitle + ' Goal Reached',
                    time: new Date(Date.now())
                });
            }
        }

        //update the css display for progress bar style display
        let width = this.displayBox.offsetWidth;
        let currentProportion = this.data.currentCount / (this.settings.goal || 1);
        let markerPoint = Math.floor(currentProportion*width);
        this.displayBox.style.backgroundSize = `${markerPoint}px, 1px`;
        this.displayBox.style.backgroundPosition = `0, ${markerPoint}px`;

        //update count

        for(let each of this.displayElms.countValues) {
            each.innerText = this.data.currentCount;
        }

        //update goal
        if(this.settings.goal == 0) {
            for(let each of this.displayElms.goalCon) {
                each.classList.add('hidden');
            }
        } else {
            for(let each of this.displayElms.goalCon) {
                each.classList.remove('hidden');
            }
            for(let each of this.displayElms.goalValues) {
                each.innerText = this.settings.goal;
            }
        }
        
        /*and now the info box*/
        this.infoElms.goalsReached.innerText = this.data.goalsReached;

        this.infoElms.total.innerText = this.data.totalCount;
    }
}