#collective.js

A simple tool for synchronizing data across multiple [Node.js](http://nodejs.org/) instances*. 
Creates dual one-way tcp connections to each remote instance. Every data change is asynchronously 
sent to all of those instances. Very useful when using with 
[Cluster](http://nodejs.org/api/cluster.html) module, multiple servers, cloud instances, or any 
other multi [Node.js](http://nodejs.org/) configuration.

*_Experimental. Use at your own risk. Is not suitable for systems which require 100% precision and 
synchronous data updates._

## Installation

```
npm install collective
```

## Usage

Every [Node.js](http://nodejs.org/) instance has the same configuration with the exception of first 
parameter which must be unique.

### Node.js instance #1

```js
var Collective = require('collective');

var all_hosts = [{host: 'localhost', port: 8124}, 
    {host: 'localhost', port: 8125}
    // additional hosts #n
];

var collective = new Collective({host: 'localhost', port: 8124}, all_hosts, function (collective) {
    collective.set('foo.bar', 7);
    var foo_bar = collective.get('foo.bar'); // = 7;
});
```

### Node.js instance #2

```js
// Same as above.

var collective = new Collective({host: 'localhost', port: 8125}, all_hosts, function (collective) {
    collective.set('foo.bar', 7, true); // Instead of replace we use addition. Works with negative too.
    var foo_bar = collective.get('foo.bar'); // = 14
});
```

### Node.js instance #n*

```js
// Same as above.

var collective = new Collective({host: '#n.host', port: '#n.port'}, all_hosts, function (collective) {
    collective.set('foo.bar', 'quz'); // A simple replace command.
    var foo_bar = collective.get('foo.bar'); // = quz
});
```

*_Any (sane) amount of instances should work fine._

## Features

  * Non-blocking data synchronization across multiple [Node.js](http://nodejs.org/) instances.
  * Deep object notation sets and gets ('foo.bar.quz.etc...'). 
  * Seamless scaling. One change in hosts configuration plus a restart and everything is up.
  * Virtually no slowdown due to data storage in javascript variable.
  * REPLACE and ADDITION (for simple math) set command types.

## Roadmap (v0.3.0)

  * Traffic reduction optimizations. 
  * Some benchmarks (any suggestions?). 

## Caveats

  * In order to prevent possible race conditions, timestamps are used, thus requiring servers to have
synchronized time. Large differences may give unexpected results.

## Testing and JSlint

Running the tests:
```
node tests/index.js
```

Checking code standards:
```
./build/jslint.sh
```

## More information

Article about the inner workings and concepts can be found on my [blog/portfolio](http://a.ndri.us/blog/collective-js-increase-your-node-js-application-performance-even-more).

## License

Copyright (c) 2012 Andrius Virbičianskas <a@ndri.us> (http://a.ndri.us/)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and 
associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, 
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial 
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT 
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES 
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.