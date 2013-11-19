[![build status](https://secure.travis-ci.org/arch1t3ct/collective.js.png)](http://travis-ci.org/arch1t3ct/collective.js)
#collective.js

A simple tool for synchronizing data across multiple [Node.js](http://nodejs.org/) instances. 
Creates dual one-way tcp connections to each remote instance. Every data change is asynchronously 
sent to all of those instances. Very useful when using with 
[Cluster](http://nodejs.org/api/cluster.html) module, multiple servers, cloud instances, or any 
other multi [Node.js](http://nodejs.org/) configuration.

_Experimental. Use at your own risk. Is not suitable for systems which require 100% precision and 
synchronous data updates._

## Installation

```
npm install collective
```

## Basic Usage (full example)

A fully working demonstration on how to use this with single or multiple servers where 
[Cluster](http://nodejs.org/api/cluster.html) is used for [Node.js](http://nodejs.org/) scaling.

Every [Node.js](http://nodejs.org/) process has the same configuration with the exception of 
`localhost` variable which should be selected per server basis (if multiple servers are used):


```js
/* Load necessary modules */
var cluster = require('cluster');
var Collective = require('collective');

/* Config. Edit to suit your needs */
var cpu_count = require('os').cpus().length; // A good practice to use all of availabe processors.
var hosts = ['127.0.0.1'/*, host2, host3, etc */]; // Depends on how many servers you have.
var localhost = hosts[0]; // Select a proper host from hosts pool for the current server.
var port = 9000; // Starting port. Arbitrary, really.

/**
 *  Populate with all possible hosts based on cpu count. WARNING: This will not work if your servers
 *  have different cpu counts. If that's the case - create all_hosts array manually.
 */
var all_hosts = [];
for (var i = 0; i < hosts.length; i++) {
    for (var j = 0; j < cpu_count; j++) {
        all_hosts.push({host: hosts[i], port: port + j});
    }
}

/* Bootup cluster */
if (true === cluster.isMaster) {
    /* Additional mapping is required in order to preserve worker ids when they are restarted. */
    var map = {};

    function forkWorker(worker_id) {
        var worker = cluster.fork({worker_id: worker_id});

        map[worker.id] = worker_id;
    }

    for (var i = 0; i < cpu_count; i++) {
        forkWorker(i);
    }

    /* You should do some error logging here (left out for the sake of simplicity) */
    cluster.on('exit', function (worker, code, signal) {
        var old_worker_id = map[worker.id];

        delete map[worker.id];

        forkWorker(old_worker_id);
    });
} else {
    /* Set a local host and a port for collective to use. Based on worker id. */
    var local = {host: localhost, port: port + parseInt(process.env.worker_id, 10)};

    /* Start collective. */
    var collective = new Collective(local, all_hosts, function (collective) {
        /**
         *  All done! This is where you start your normal coding. Lines below are just a
         *  demonstration of collective.js set/increment/delete synchronization capabilities.
         */

        collective.set('over.nine.thousand', 0);

        /* Timeouts are for demonstration purposes only, just to wait for the final result. */
        setTimeout(function () {
            console.log('Hey, I am ' + collective.local.host + ':' + collective.local.port
                + ' and my \'over.nine.thousand\' key has a value of: '
                + collective.get('over.nine.thousand'));

            setTimeout(function () {
                collective.set('over.nine.thousand', 9000, collective.OPERATIONS.INCREMENT);

                setTimeout(function () {
                    console.log('Hey, it\'s me again, ' + collective.local.host + ':'
                        + collective.local.port
                        + ', and my \'over.nine.thousand\' key after 9000 x '
                        + all_hosts.length + ' hosts increment operations has a value of: '
                        + collective.get('over.nine.thousand'));

                    setTimeout(function () {
                        collective.set('over.nine.thousand', null, collective.OPERATIONS.DELETE);

                        setTimeout(function () {
                            console.log('Hey, once more it\'s me, ' + collective.local.host + ':'
                                + collective.local.port
                                +', and my \'over.nine.thousand\' key after delete operation has a '
                                + 'value of: ' + collective.get('over.nine.thousand'));
                        }, 1000);
                    }, 100);
                }, 1000);
            }, 100);
        }, 100);
    });
}
```

## Features

  * Non-blocking data synchronization across multiple [Node.js](http://nodejs.org/) processes and servers.
  * Deep object notation sets and gets ('foo.bar.quz.etc...'). 
  * Seamless scaling. Add a host to `hosts` variable and restart [Node.js](http://nodejs.org/). That's it.
  * Blazing fast! Data is stored in-memory (javascript variable).
  * SET, INCREMENT, DELETE your data.

## API
#### collective.set(key, value, operation);

###### Arguments
`key` - **String** location where to store a value. Dots (this.is.my.var) are supported which will result in 4 level deep object.  
`value` - **Mixed** anything you want to store. Internally values are converted to JSON string so no need to do that beforehand.  
`operation` - **Integer** what you want to do. Currently 3 operations are supported: SET (default), INCREMENT, DELETE.
```js
collective.set('this.is.my.var', 9000); // Sets a value. Creates if doesn't exist, replaces if does.
collective.set('this.is.my.var', 1, collective.OPERATIONS.INCREMENT); // Increments a value. Should be 9001 after this.
collective.set('this.is.my.var', null, collective.OPERATIONS.DELETE); // Deletes last part of the key (var in this case). Value is ignored.
```

#### collective.get(key);

###### Arguments
`key` - **String** location from which to retrieve a value.
```js
collective.get('this.is.my.var'); // Results in: 9001
collective.get('this.is.my'); // Results in: {var: 9001}
```

## Testing and JSlint

Running the tests:
```
node test/index.js
```

Checking code standards:
```
./build/jslint.sh
```

## More information

Article (a bit outdated) about the inner workings and concepts can be found on my [blog/portfolio](http://a.ndri.us/blog/collective-js-increase-your-node-js-application-performance-even-more).


To this date, this library has been tested with 3 servers, 8 processes each, with 3 level object nesting and a total 
of about 2 000 000 keys with up to 100 SET operations per second.

For better understanding I would also recommend looking at `test/index.js` file.

## License

Copyright (c) 2012-2013 Andrius Virbičianskas <a@ndri.us> (http://a.ndri.us/)

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