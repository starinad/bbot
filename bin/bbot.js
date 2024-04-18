#!/usr/bin/env node

import bbot from '../src/main.js';

try {
    await bbot();
} catch (ex) {
    console.error(`Something went wrong: ${ex}`);
}
