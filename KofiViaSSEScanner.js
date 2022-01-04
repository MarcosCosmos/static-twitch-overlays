import SSEScanner, { defaultConfig as baseConfig } from './SSEScanner.js';

import Module from './Module.js';

const defaultConfig = baseConfig;

class KofiViaSSEScanner extends SSEScanner {
}

export {KofiViaSSEScanner as default, defaultConfig};