import { request } from '@podium/test-utils';
import Podlet from '@podium/podlet';
import Hapi from '@hapi/hapi';
import tap from 'tap';

import HapiPodlet from '../lib/podlet-plugin.js';

class Server {
    constructor(options = {}) {
        this.app = Hapi.Server({
            host: 'localhost',
            port: 0,
        });

        const podlet = new Podlet({
            pathname: '/',
            fallback: '/fallback',
            version: '2.0.0',
            name: 'podletContent',
            ...options,
        });

        podlet.view((incoming, fragment) => `## ${fragment} ##`);

        podlet.defaults({
            locale: 'nb-NO',
        });

        this.app.register({
            plugin: new HapiPodlet(),
            options: podlet,
        });

        this.app.route({
            method: 'GET',
            path: podlet.content(),
            handler: (req, h) => {
                if (req.app.podium.context.locale === 'nb-NO') {
                    return h.podiumSend('nb-NO');
                }
                if (req.app.podium.context.locale === 'en-NZ') {
                    return h.podiumSend('en-NZ');
                }
                return h.podiumSend('en-US');
            },
        });

        this.app.route({
            method: 'GET',
            path: podlet.fallback(),
            handler: (req, h) => h.podiumSend('fallback'),
        });

        this.app.route({
            method: 'GET',
            path: podlet.manifest(),
            handler: () => JSON.stringify(podlet),
        });

        // Dummy endpoints for proxying
        this.app.route({
            method: 'GET',
            path: '/public',
            handler: () => 'GET proxy target',
        });

        this.app.route({
            method: 'POST',
            path: '/public',
            handler: () => 'POST proxy target',
        });

        this.app.route({
            method: 'PUT',
            path: '/public',
            handler: () => 'PUT proxy target',
        });

        // 404 route
        this.app.route({
            method: '*',
            path: '/{any*}',
            handler: (req, h) => {
                const response = h.response('Not found');
                response.code(404);
                response.header('Content-Type', 'text/plain');
                return response;
            },
        });

        // Proxy to the dummy endpoints
        podlet.proxy({ target: '/public', name: 'localApi' });
    }

    listen() {
        return new Promise((resolve, reject) => {
            setImmediate(async () => {
                try {
                    await this.app.start();
                    resolve(this.app.info.uri);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async close() {
        await this.app.stop();
    }
}

/**
 * Constructor
 */

tap.test(
    'Constructor() - object type - should be PodiumPodletHapiPlugin',
    (t) => {
        const plugin = new HapiPodlet();
        t.equal(
            Object.prototype.toString.call(plugin),
            '[object PodiumPodletHapiPlugin]',
        );
        t.end();
    },
);

/**
 * Generic tests
 */

tap.test(
    'request "manifest" url - should return content of "manifest" url',
    async (t) => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({ address, pathname: '/manifest.json' });
        const parsed = JSON.parse(result.body);

        t.equal(parsed.version, '2.0.0');
        t.equal(parsed.fallback, '/fallback');
        t.equal(parsed.content, '/');
        t.equal(parsed.name, 'podletContent');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: false - should return default content of "content" url',
    async (t) => {
        const server = new Server({ development: false });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, 'en-US');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return context aware content of "content" url',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "content" url - development: true - should return development mode decorated content of "content" url',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address });

        t.equal(result.body, '## nb-NO ##');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "fallback" url - development: false - should return content of "fallback" url',
    async (t) => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({ address, pathname: '/fallback' });

        t.equal(result.body, 'fallback');

        await server.close();
        t.end();
    },
);

tap.test(
    'request "fallback" url - development: false - should return development mode decorated content of "fallback" url',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({ address, pathname: '/fallback' });

        t.equal(result.body, '## fallback ##');

        await server.close();
        t.end();
    },
);

tap.test('request "manifest" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/manifest.json' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "content" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test('request "fallback" url - should have version header', async (t) => {
    const server = new Server();
    const address = await server.listen();
    const result = await request({ address, pathname: '/fallback' });

    t.equal(result.headers['podlet-version'], '2.0.0');

    await server.close();
    t.end();
});

tap.test(
    'request "content" url - set a context parameter - should alter content of "content" url based on context',
    async (t) => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({
            address,
            headers: {
                'podium-locale': 'en-NZ',
            },
        });

        t.equal(result.body, 'en-NZ');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: false - should not proxy content',
    async (t) => {
        const server = new Server();
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.body, 'Not found');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: true - should proxy content',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.body, 'GET proxy target');

        await server.close();
        t.end();
    },
);

tap.test(
    'GET "proxy" url - development: true - should have version header',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request({
            address,
            pathname: '/podium-resource/podletContent/localApi',
        });

        t.equal(result.headers['podlet-version'], '2.0.0');

        await server.close();
        t.end();
    },
);

tap.test(
    'POST to "proxy" url - development: true - should proxy content',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request(
            {
                address,
                method: 'POST',
                pathname: '/podium-resource/podletContent/localApi',
            },
            'payload',
        );

        t.equal(result.body, 'POST proxy target');

        await server.close();
        t.end();
    },
);

tap.test(
    'PUT to "proxy" url - development: true - should proxy content',
    async (t) => {
        const server = new Server({ development: true });
        const address = await server.listen();
        const result = await request(
            {
                address,
                method: 'PUT',
                pathname: '/podium-resource/podletContent/localApi',
            },
            'payload',
        );

        t.equal(result.body, 'PUT proxy target');

        await server.close();
        t.end();
    },
);
