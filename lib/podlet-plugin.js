'use strict';

const { HttpIncoming } = require('@podium/utils');
const utils = require('@podium/utils');
const pkg = require('../package.json');

const PodiumPodletHapiPlugin = class PodiumPodletHapiPlugin {
    constructor() {
        Object.defineProperty(this, 'name', {
            value: 'PodiumPodletHapiPlugin',
            enumerable: true,
        });

        Object.defineProperty(this, 'pkg', {
            value: pkg,
            enumerable: true,
        });

        Object.defineProperty(this, 'requirements', {
            value: {
                hapi: '>=17.0.0'
            },
            enumerable: true,
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodiumPodletHapiPlugin';
    }

    register(server, podlet) {
        // Run parsers on request and store state object on request.app.podium
        // Do proxying if path is matching a proxy path
        server.ext({
            type: 'onRequest',
            method: async (request, h) => {
                const { req, res } = request.raw;
                const incoming = new HttpIncoming(req, res, request.app.params);
                request.app.podium = await podlet.process(incoming)

                // If "incoming.proxy" is true, the proxy did proxy.
                // Abandon the request.
                if (request.app.podium.proxy) {
                    return h.abandon;
                }

                // There was nothing to proxy. Continue the request.
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
        // eslint-disable-next-line func-names
        server.decorate('toolkit', 'podiumSend', function(fragment) {
            return podlet.render(this.request.app.podium, fragment);
        });
    }
};

module.exports = PodiumPodletHapiPlugin;
