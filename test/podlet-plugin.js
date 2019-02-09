'use strict';

const tap = require('tap');
const Plugin = require('../');

/**
 * Constructor
 */

tap.test(
    'Constructor() - object type - should be PodiumPodletHapiPlugin',
    t => {
        const p = new Plugin();
        t.equal(
            Object.prototype.toString.call(p),
            '[object PodiumPodletHapiPlugin]',
        );
        t.end();
    },
);
