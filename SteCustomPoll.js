import Module from "./Module.js";
import ChatBot from "./ChatBot.js";
import StreamLabsSocket from './StreamLabsSocket.js';

let defaultConfig;
{
    defaultConfig = {
        votesPer: {
            free: 0, //initial votes for everyone
            t1Sub: 0,
            t2Sub: 0,
            t3Sub: 0,
            bit: 0,
            vip: 0,
            donoDollar: 0
        },
        chatBot: {
            commandPrefixes: ''
        },
        slSocket: {},
        defaultData: {
            votes: {}, //available per user
            pollOptions: {}, //assigned by name
            optionNames: [], //this enforces a display order
            pollTitle: '',
            isOpen: false,
            isVisible: false
        },
        lifxAccessToken: '',
        lifxDefaultScene: ''
    };
}

const codeForA = 'a'.charCodeAt(0);

export default class SteCustomPoll extends Module {
    constructor(config=defaultConfig) {
        config = Module.mixin(defaultConfig, config);

        config.slSocket.moduleId = config.moduleId + '_slSocket';
        config.chatBot.moduleId = config.moduleId + '_chatBot';

        super(Module.mixin(defaultConfig, config));

        this.lifxLock = Promise.resolve();

        this.slSocket = new StreamLabsSocket(config.slSocket);
        this.chatBot = new ChatBot(config.chatBot);

        this.slSocket.addListener(
            event => {
                if(event.details.for == 'twitch_account' || event.details.for == 'streamlabs') {
                    let amount = event.details.message.amount;
                    switch(event.details.type) {
                        case 'donation':
                            amount *= this.config.votesPer.donoDollar;
                            break;
                        case 'bits':
                            amount *= this.config.votesPer.bit;
                            break;
                        case 'subscription':
                            switch(event.details.tier) {
                                case 1000:
                                    amount *= this.config.votesPer.t1Sub;
                                case 2000:
                                    amount *= this.config.votesPer.t2Sub;
                                case 3000:
                                    amount *= this.config.votesPer.t3Sub;
                            }
                            break;
                        default:
                            amount=0;
                            return;//ensure no effect is had by unrecognised events

                    }
                    this.giveUserVotes(event.details.message.name, amount);
                }
            }
        );

        let regex;
        {
            let prefixes = this.config.chatBot.commandPrefixes.split(',').map(each => each.trim());
            regex = new RegExp(`^(${prefixes.join('|')})( +|$)`);
        }

        this.chatBot.addListener(
            event => {
                ////examples: (written in a semi-regex style)
                // '!poll vote 1 +1'
                // '!poll vote 2 -1'
                // '!poll unvote (@?username)?'
                // '!poll show'
                // '!poll hide'
                // '!poll open option1;config;config option2;config;config'
                // '!poll close'
                // '!poll reopen'
                // '!poll results'
                // '!poll erasedata (@?username)?' //tokens will be the codeword for wiping allowances so that it's hard to use accidentally.
                // '!poll adjusttokens (@?username|!all) 1
                // '!poll ?'
                // '!poll help'
                
                let message = event.message;
                let parts;

                let checkIfOpen = event => {
                    if(!this.info.isOpen) {
                        this.chatBot.client.say(event.channel, `Notice: Poll not open @${event.tags['display-name']}`);
                        return false;
                    }
                    return true;
                }

                let checkIsMod = event => {
                    if(this.chatBot.levelOf(event.tags) < ChatBot.userLevels.moderator) {
                        this.chatBot.client.say(event.channel, `Notice: This action can only be performed by moderators @${event.tags['display-name']}`);
                        return false;
                    }
                    return true;
                }

                let getTargetUser = nameOptionalAt => {
                    let targetUser = nameOptionalAt;
                    if(targetUser.charAt(0) == '@') {
                        targetUser = targetUser.substr(1);
                    }
                    return targetUser.toLowerCase();
                };

                let validateNumber = text => {
                    try {
                        return parseFloat(text);
                    } catch(e) {
                        this.chatBot.client.say(event.channel, `Error: Invalid number '${text}' @${event.tags['display-name']}`);
                        return 0;
                    }
                }

                if(regex.test(message)) {
                    let match = message.match(regex);
                    let payload = '';
                    if(match != null) {
                        payload = message.substr(match.index + match[0].length);
                    }
                    parts = payload.split(' '); //todo: get parts[1] (the command/case) seperately, slice at 2 and decrement all the related lengths and indices
                    let targetUser;
                    switch(parts[0]) {
                        case 'vote':
                            {
                                if(!checkIfOpen()) {
                                    break;
                                }
                                if(parts.length != 3) {
                                    break;//invalid
                                }
                                
                                //convert the letter into an int index
                                let optionIndex = parts[1].charCodeAt(0) - 'a'.charCodeAt(0);
                                
                                if(optionIndex < 0 || optionIndex >= this.info.optionNames.length) {
                                    break; //invalid;
                                }

                                let optionName = this.info.optionNames[optionIndex];

                                targetUser = getTargetUser(event.tags['display-name']);
                                
                                let requestAmount = validateNumber(parts[2]);
                                if(requestAmount != 0) {
                                    const actualAmount = this.adjustVote(targetUser, optionName, requestAmount);
                                    this.chatBot.client.say(event.channel, `${actualAmount} votes ${actualAmount < 0 ? 'removed from' : 'added to'} '${optionName}'. You now have ${this.info.votes[targetUser].available} votes remaining (only whole votes can be used) @${event.tags['display-name']}`);
                                }
                            }
                            break;
                        case 'unvote':
                            {
                                if(!checkIfOpen()) {
                                    break;
                                }
                                if(parts.length == 2) {
                                    if(!checkIsMod(event)) {
                                        break;
                                    }
                                    targetUser = getTargetUser(parts[1]);
                                    if(typeof this.info.votes[targetUser] == 'undefined') {
                                        this.chatBot.client.say(event.channel, `username '${targetUser}' is not yet registered in the poll. They be registered as they use the poll or when they are awarded vote-tokens @${event.tags['display-name']}`);
                                        break;
                                    }
                                } else {
                                    targetUser = getTargetUser(event.tags['display-name']);
                                    if(!checkIfOpen()) {
                                        break;
                                    }
                                }
                                this.unspendVotesFor(targetUser);
                                this.chatBot.client.say(event.channel, `Votes have been reset for @${targetUser}. They now have ${this.info.votes[targetUser].available} votes to use.`);
                            }
                            break;
                        case 'show':
                            if(!checkIsMod(event)) {
                                break;
                            }
                            this.show();
                            this.chatBot.client.say(event.channel, `The poll should now be visible on the stream @${event.tags['display-name']}`);
                            break;
                        case 'hide':
                            if(!checkIsMod(event)) {
                                break;
                            }
                            this.hide();
                            this.chatBot.client.say(event.channel, `The poll should now be hidden from stream @${event.tags['display-name']}`);
                            break;
                        case 'open':
                            {
                                if(!checkIsMod(event)) {
                                    break;
                                }

                                let pollTitle = '';
                                let i=1;

                                for(; i < parts.length; i++) {
                                    if(parts[i].charAt(parts[i].length-1) == ':') {
                                        pollTitle += ' ' + parts[i].substr(0, parts[i].length-1);
                                        pollTitle = pollTitle.trim();
                                        i++;
                                        break;
                                    } else {
                                        pollTitle += ' ' + parts[i];
                                    }
                                }

                                if(parts.length < i+2) {
                                    this.chatBot.client.say(event.channel, `Error: There must be a poll title and at least 2 options, each seperated by a space @${event.tags['display-name']}`);
                                    break;
                                }

                                let options = [];
                                let eachOption = {};
                                let optionName = '';
                                let isDoingName = true;
                                for(; i < parts.length; i++) {
                                    let eachPart = parts[i];
                                    if(isDoingName) {
                                        let subParts = eachPart.split(':');
                                        if(subParts.length > 1) {
                                            optionName += ' ' + subParts[0].substr(0, subParts[0].length);
                                            optionName = optionName.trim();
                                            eachOption.name = optionName;
                                            eachPart = subParts[1];
                                        } else {
                                            optionName += ' ' + eachPart;
                                            continue;
                                        }
                                    }
                                    if(eachPart.length > 0) {
                                        let optionParts = eachPart.split(';');
                                        for(let k = 0; k < optionParts.length; k++) {
                                            if(optionParts[k].length > 0) {
                                                let attributeParts = optionParts[k].split('=');
                                                if(attributeParts.length != 0 && attributeParts.length != 2) {
                                                    this.chatBot.client.say(event.channel, `Error: Invalid option '${optionParts[k]}'. Options should be of the form: name(';'((key'='value)?';')*(key'='value';'?)? @${event.tags['display-name']}`);
                                                    return;
                                                }
                                                eachOption[attributeParts[0]] = attributeParts[1];
                                            }
                                        }
                                    }
                                    options.push(eachOption);
                                    eachOption = {};
                                    optionName = '';
                                    isDoingName = true;
                                    
                                }
                                this.open(pollTitle, options);
                                this.chatBot.client.say(event.channel, `The poll '${this.info.pollTitle} is now open.`);
                            }
                            break;
                        case 'close':
                            if(!checkIsMod(event)) {
                                break;
                            }
                            this.close();
                            this.chatBot.client.say(event.channel, `The poll '${this.info.pollTitle} is now closed.'`);
                            break;
                        case 'reopen':
                            if(!checkIsMod(event)) {
                                break;
                            }
                            this.reopen();
                            this.chatBot.client.say(event.channel, `The poll '${this.info.pollTitle} is now open.`);
                            break;
                        case 'results':
                            this.chatBot.client.say(event.channel, `The current results for the poll '${this.info.pollTitle}' are: ${this.info.optionNames.map((name,index) => String.fromCharCode(codeForA+index) + ') ' + name + ': ' + this.results.votes[name]).join(', ')}; The winning option${this.results.winners.length > 1 ? 's are' : ' is'}: ${this.results.winners.join(', ')}`);
                            break;
                        case 'cleardata':
                            if(!checkIsMod(event)) {
                                break;
                            }
                            if(parts.length == 2) {
                                targetUser = getTargetUser(parts[1]);
                                delete this.info.votes[targetUser];
                                this.updateTally();
                                await this.save();
                                this.chatBot.client.say(event.channel, `Votes and token wallet data for the user @${targetUser} has been erased.`);
                            } else {
                                this.info.votes = {};
                                this.updateTally();
                                await this.save();
                                this.chatBot.client.say(event.channel, `Votes and token wallet data for all users has been erased.`);
                            }
                            this.updateTally();
                            break;
                        case 'adjusttokens':
                            {
                                if(!checkIsMod(event)) {
                                    break;
                                }
                                if(parts.length != 3) {
                                    this.chatBot.client.say(event.channel, `Error: expected a username and an amount @${event.tags['display-name']}`);
                                    break;
                                }
                                let targetAll;

                                if(parts[1] == '!all') {
                                    targetAll = true;
                                } else {
                                    targetAll = false;
                                    targetUser = getTargetUser(parts[1]);
                                }
                                
                                let amount = validateNumber(parts[2]);

                                if(amount != 0) {
                                    if(targetAll) {
                                        for(let each of Object.keys(this.info.votes)) {
                                            this.giveUserVotes(each, amount);
                                        }
                                        this.chatBot.client.say(event.channel, `Available votes changed by up to ${amount} for all existing users.`);
                                    } else {
                                        this.giveUserVotes(targetUser, amount);
                                        this.chatBot.client.say(event.channel, `@${targetUser} now has ${this.info.votes[targetUser].available} votes remaining (only whole votes can be used).`);
                                    }
                                }
                            }
                            break;
                        case 'help':
                        case '?':
                            this.chatBot.client.say(event.channel, `Basic usage (mod commands not included): use '!poll vote {letter of option} {number votes}' to vote. E.g.: '!poll vote a 2' to add 2 votes to the first option, or '!poll vote b -2' to remove of your votes from the second option; Use '!poll unvote' to undo all of your votes so you can vote again. Use '!poll results' to see the poll options and current results.`);
                            break;
                        default:
                            targetUser = getTargetUser(event.tags['display-name']);
                            this.initialiseVotesIfMissing(targetUser);
                            this.chatBot.client.say(event.channel, `@${targetUser} now has ${this.info.votes[targetUser].available} votes remaining (only whole votes can be used). For instructions, type '!poll help' or '!poll ?'.`);
                    }
                }
                return false;
            }
        );

    }

    open(title, options) {
        //reset available votes
        for(let eachUsername of Object.keys(this.info.votes)) {
            this.unspendVotesFor(eachUsername);
        }

        this.info.pollTitle = title;

        //setup the assigned votes as zero for each of the new options;
        this.info.pollOptions = {};
        this.info.optionNames = [];
        this.results.votes = {};
        for(let each of options) {
            let eachResult = {};
            Object.assign(eachResult, each);
            this.info.pollOptions[each.name] = eachResult;
            this.info.optionNames.push(each.name);
            this.results.votes[each.name] = 0;
        }

        for(let eachUsername of Object.keys(this.info.votes)) {
            let eachTarget = this.info.votes[eachUsername];
            let available = this.info.votes.available || 0;
            for(let eachOldOption of Object.keys(eachTarget.spent)) {
                available += eachTarget.spent[eachOldOption];
            }
            eachTarget.spent = {};
            for(let eachOptionName of this.info.optionNames) {
                eachTarget.spent[eachOptionName] = 0;
            }
        }
        this.updateTally();

        this.info.isOpen = true;
        this.info.isVisible = true;
        await this.save();
    }

    close() {
        this.info.isOpen = false;
        await this.save();
    }

    reopen() {
        this.info.isOpen = true;
        await this.save();
    }

    show() {
        this.info.isVisible = true;
        await this.save();
    }

    hide() {
        this.info.isVisible = false;
        await this.save();
    }

    /**
     * Use only if the user has no votes or to reset their available votes; To reset only the user's spent votes user unspendVotesFor(username);
     * @param {String} username 
     */
    initialiseVotesFor(username) {
        let result = {
            available: this.config.votesPer.free,
            spent: {
            }
        };

        for(let each of this.info.optionNames) {
            result.spent[each] = 0;
        }
        this.info.votes[username] = result;
    }

    initialiseVotesIfMissing(username) {
        if(typeof this.info.votes[username] === 'undefined') {
            this.initialiseVotesFor(username);
            await this.save();
        }
    }

    giveUserVotes(username, amount) {
        this.initialiseVotesIfMissing(username);
        this.info.votes[username].available = Math.max(0, this.info.votes[username].available + amount);
        await this.save();

        //todo: add chat message
    }

    unspendVotesFor(username) {
        this.initialiseVotesIfMissing(username);
        let userVotes = this.info.votes[username];

        for(let eachOption of this.info.optionNames) {
            let amount = userVotes.spent[eachOption];
            userVotes.available += amount;
            userVotes.spent[eachOption] -= amount;
            this.results.votes[eachOption] -= amount;
            userVotes.spent[eachOption] = 0;
        }


        await this.save();

        this.updateTally();
        //todo: add chat message
    }

    adjustVote(username, optionName, numberOfVotes) {
        this.initialiseVotesIfMissing(username);
        let userVotes = this.info.votes[username]; 

        //first clip the number of votes to be at most the number of whole votes available/at least (if negative) no less than -the number of votes allocated to an option
        if(numberOfVotes > 0) {
            numberOfVotes = Math.min(numberOfVotes, Math.floor(userVotes.available));
        } else if(numberOfVotes < 0) {
            numberOfVotes = Math.max(numberOfVotes, -userVotes.spent[optionName]);
        }

        this.info.votes[username].spent[optionName] += numberOfVotes;
        this.info.votes[username].available -= numberOfVotes;

        await this.save();

        this.results.votes[optionName] += numberOfVotes;
        this.updateTally();

        if(numberOfVotes > 0 && typeof this.info.pollOptions[optionName].sceneId !== 'undefined') {
            this.activateLiFX(this.info.pollOptions[optionName].sceneId);
        }

        //return the actual number of votes changed
        return numberOfVotes;
    }
    
    /**
     * The actual tally is just a computed value used for display;
     * But it's not left to vue as it's useful to obtain it via 
     */
    updateTally() {
        let winners = [];
        let countToBeat = -1;
        for(let i=0; i<this.info.optionNames.length; i++) {
            let eachName = this.info.optionNames[i];
            let eachCount = this.results.votes[eachName];
            if(eachCount < countToBeat) {
                continue;
            }

            if(eachCount > countToBeat) {
                winners = [eachName];
                countToBeat = eachCount;
            } else if(eachCount == countToBeat) {
                winners.push(eachName);
            }
        }
        this.results.winners = winners;
        
        let winMap = {};
        for(const each of this.results.winners) {
            winMap[each] = true;
        }
        this.resultsForVue.splice(0);
        Array.prototype.splice.apply(this.resultsForVue, [0, 0].concat(
            this.info
            .optionNames
            .map(
                (each, index) => {
                    return {
                        name: each,
                        letter: String.fromCharCode(codeForA+index),
                        votes: this.results.votes[each],
                        isWinning: winMap[each] || false
                    };
                }
            ))
        );
}

    loadInfo() {
        super.loadInfo();
        
        //initialise the tally
        this.results = {
            votes: {},
            winners: []
        };

        this.resultsForVue = [];
        for (const eachName of this.info.optionNames) {
            this.results.votes[eachName] = 0;
        }

        for(const eachUsername of Object.keys(this.info.votes)) {
            const eachUserVotes = this.info.votes[eachUsername];
            for (const eachName of this.info.optionNames) {
                this.results.votes[eachName] += eachUserVotes.spent[eachName];
            }
        }

        this.updateTally();
    }

    async finalizeBoxes() {
        await super.finalizeBoxes();
        await this.slSocket.finalizeBoxes();
        await this.chatBot.finalizeBoxes();
    }

    start() {
        this.slSocket.start();
        this.chatBot.start();
    }

    eraseData() {
        this.info.votes = {};
        this.info.pollOptions = {};
        super.eraseData();
    }

    async activateLiFX(sceneId) {
        //wait at 
        let resolver;
        let existingPromise = this.lifxLock;
        this.infoLock = new Promise((resolve) => resolver=resolve);
        await existingPromise;
        await fetch(
            `https://api.lifx.com/v1/scenes/scene_id:${sceneId}/activate`,
            {
                method: 'PUT',
                headers: new Headers({'Authorization': `Bearer ${this.config.lifxAccessToken}`, 'Content-Type': 'application/json'}),
                body: JSON.stringify({
                    "duration": 0.5,
                    "ignore": [],
                    "fast": false
                })
            }
        );
        //wait so that the light has time to be on for at least a little while (in general)
        setTimeout(async () => {
            //now revert, but allow the next call to override immediately
            await fetch(
                `https://api.lifx.com/v1/scenes/scene_id:${this.config.lifxDefaultScene}/activate`,
                {
                    method: 'PUT',
                    headers: new Headers({'Authorization': `Bearer ${this.config.lifxAccessToken}`, 'Content-Type': 'application/json'}),
                    body: JSON.stringify({
                        "duration": 0.5,
                        "ignore": [],
                        "fast": false
                    })
                }
            );
            resolver(); //allow the next call
        }, 1000);
    }
}