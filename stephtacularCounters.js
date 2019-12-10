let config = {
    hash: {
        follows: {
            type: 'showElm',
            default: false
        },
        subs: {
            type: 'showElm',
            default: false
        },
        bar: {
            type: 'counterStyle',
            default: false,
            handler: usingBar => {
                if(usingBar) {
                    document.getElementById('globalCon').classList.add('progressBars')
                } else {
                    document.getElementById('globalCon').classList.add('stroked');
                }
            } 
        }
    },
    urls: {
        displaySubsOutlined: {
            description: 'Sub Goal (Outlined):',
            builder: base => `${base}#urls=0&subs`
        },
        displayFollowsOutlined: {
            description: 'Follow Goal (Outlined):',
            builder: base => `${base}#urls=0&follows`
        },
        displaySubsBar: {
            description: 'Sub Goal (Bar):',
            builder: base => `${base}#urls=0&subs&bar`
        },
        displayFollowsBar: {
            description: 'Follow Goal (Bar):',
            builder: base => `${base}#urls=0&follows&bar`
        }
    }
};