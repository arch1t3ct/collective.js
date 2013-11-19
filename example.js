/* Load necessary modules */
var cluster = require('cluster');
var Collective = require('./index.js');

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