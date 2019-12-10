import BasicGoal from './BasicGoal.js';
class TiltifyGoal extends BasicGoal {
    constructor(config) {
         /**
         * config: {
         *  prefix: 'btnPress', //note: displayable, numeric prefixes should be managable via css
         *  displayTitle: 'Button Presses',
         *  settingsTitle: 'Button Pressing Goal:',
         *  useModulo: bool, //indicates whether or not to roll over to 0 when a goal is reached,
         *  tiltifyScanner: Mandatory TiltifyScanner instance to listen to updates with
         *  logger: optional Logger instance (only used if present),
         * }
         */
        config.step = 'any';
        config.min = 0;
        super(config);

        config.tiltifyScanner.addListener(
            event => {
                switch(event.type) {
                    case 'donation':
                        this.data.currentCount += event.details.amount;
                        this.data.totalCount += event.details.amount;
                        this.storeItems(this.data); //force a save incase it doesn't happen otherwise
                        this.updateElements();
                        break;
                }
            }
        )
    }
}

export default TiltifyGoal;