# @podium/hapi-podlet

Hapi plugin for @podium/podlet.

[![Dependencies](https://img.shields.io/david/podium-lib/hapi-podlet.svg?style=flat-square)](https://david-dm.org/podium-lib/hapi-podlet)
[![Build Status](https://travis-ci.org/podium-lib/hapi-podlet.svg?branch=master&style=flat-square)](https://travis-ci.org/podium-lib/hapi-podlet)
[![Greenkeeper badge](https://badges.greenkeeper.io/podium-lib/hapi-podlet.svg?style=flat-square)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/podium-lib/hapi-podlet/badge.svg?style=flat-square)](https://snyk.io/test/github/podium-lib/hapi-podlet)

Module for building [@podium/podlet] servers with [hapi]. For writing podlets,
please see the [Podium documentation].

## Installation

```bash
$ npm install @podium/hapi-podlet
```

## Simple usage

Build a simple podlet server:

```js
const HapiPodlet = require('@podium/hapi-podlet');
const Podlet = require('@podium/podlet');
const Hapi = require('hapi');

const app = Hapi.Server({
    host: 'localhost',
    port: 7100,
});

const podlet = new Podlet({
    pathname: '/',
    version: '2.0.0',
    name: 'podletContent',
});

app.register({
    plugin: new HapiPodlet(),
    options: podlet,
});

app.route({
    method: 'GET',
    path: podlet.content(),
    handler: (request, h) => {
        if (request.app.podium.context.locale === 'nb-NO') {
            return h.podiumSend('<h2>Hei verden</h2>');
        }
        return h.podiumSend('<h2>Hello world</h2>');
    },
});

app.route({
    method: 'GET',
    path: podlet.manifest(),
    handler: (request, h) => JSON.stringify(podlet),
});

app.start();
```

## Register plugin

The plugin is registered by passing an instance of this plugin to the [hapi]
server `.register()` method together with an instance of the [@podium/podlet]
class.

```js
app.register({
    plugin: new HapiPodlet(),
    options: new Podlet(),
});
```

## Request params

On each request [@podium/podlet] will run a set of operations, such as
deserialization of the [@podium/context], on the request. When doing so
[@podium/podlet] will write parameters to `request.app.podium` which is
accessible inside a request handelers.

```js
app.route({
    method: 'GET',
    path: podlet.content(),
    handler: (request, h) => {
        if (request.app.podium.context.locale === 'nb-NO') {
            return h.podiumSend('<h2>Hei verden</h2>');
        }
        return h.podiumSend('<h2>Hello world</h2>');
    },
});
```

## h.podiumSend(fragment)

When in development mode this method will wrap the provided fragment in a
default HTML document before dispatching. When not in development mode, this
method will just dispatch the fragment.

See [development mode] for further information.

## License

Copyright (c) 2019 FINN.no

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[development mode]: https://github.com/podium-lib/podlet/blob/master/README.md#development-mode 'Development mode'
[@podium/context locale parser]: https://github.com/podium-lib/context#locale-1 '@podium/context locale parser'
[Podium documentation]: https://podium-lib.io/ 'Podium documentation'
[@podium/context]: https://github.com/podium-lib/context '@podium/context'
[@podium/podlet]: https://github.com/podium-lib/podlet '@podium/podlet'
[hapi]: https://hapijs.com/ 'Hapi'
