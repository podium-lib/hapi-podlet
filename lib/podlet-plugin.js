'use strict';

const utils = require('@podium/utils');
const pkg = require('../package.json');

// Hapi v17 or newer

const PodiumPodletHapiPlugin = class PodiumPodletHapiPlugin {
    constructor() {
        Object.defineProperty(this, 'pkg', {
            value: pkg,
            enumerable: true,
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumPodletHapiPlugin';
    }

    register(server, podlet) {
        // Run parsers on request and store state object on request.app.podium
        server.ext({
            type: 'onRequest',
            method: async (request, h) => {
                const { req, res } = request.raw;
                request.app.podium = await podlet.process(req, res);
                return h.continue;
            },
        });

        // Set http headers on response
        server.ext({
            type: 'onPreResponse',
            method: (request, h) => {
                const response = request.response.output
                    ? request.response.output
                    : request.response;
                response.headers['podlet-version'] = podlet.version;
                return h.continue;
            },
        });

        // Decorate response with .podiumSend() method
        server.decorate('toolkit', 'podiumSend', function(fragment) {
            return this.request.app.podium.render(fragment);
        });

        // Mount proxy route
        const pathname = utils.pathnameBuilder(podlet.httpProxy.pathname, podlet.httpProxy.prefix, '/{path*}');
        server.route([
            {
                method: '*',
                path: pathname,
                handler: async (request, h) => {
                    const state = await podlet.httpProxy.process(request.app.podium);

                    // If a state object is returned, there was nothing to proxy
                    // Continue the request
                    if (state) {
                        return h.continue;
                    }

                    // If a state was not returned, the proxy did proxy
                    // Abandon the request
                    return h.abandon;
                },
            },
        ]);
    }
};

module.exports = PodiumPodletHapiPlugin;
