'use strict';

var net = require('net');

function Collective(local, all, callback) {
    var self = this;

    self.TYPES = ['New', 'Accept', 'Data'];
    self.OPERATIONS = {SET: 0, INCREMENT: 1, DELETE: 2};
    self.DELIMITER = '\n';

    self.local = local;
    self.remote = self.parseHosts(all);
    self.connections = {};
    self.active = 0;
    self.active_remote = 0;
    self.data = {};
    self.history = {};

    var server = net.createServer().listen(self.local.port, self.local.host);

    server.on('connection', function (connection) {
        self.listenData(connection);
    });

    server.on('listening', function () {
        self.makeConnections(function () {
            callback(self);
        });
    });
}

Collective.prototype.parseHosts = function (all) {
    var self = this;

    var i = 0;
    var remote = [];

    for (i = 0; i < all.length; i++) {
        if (all[i].host !== self.local.host || all[i].port !== self.local.port) {
            remote.push(all[i]);
        }
    }

    return remote;
};

Collective.prototype.listenData = function (connection) {
    var self = this;

    var buffer = '';

    connection.on('data', function (data) {
        buffer += data;

        var position = -1;
        var command = {};

        do {
            position = buffer.indexOf(self.DELIMITER);

            if (-1 !== position) {
                command = JSON.parse(buffer.substr(0, position));

                buffer = buffer.substr(position + 1);

                self['parse' + self.TYPES[command[0]]](command);
            }
        } while (-1 !== position && '' !== buffer);
    });
};

Collective.prototype.parseNew = function (command) {
    var self = this;

    self.makeConnection(command[1][0], command[1][1], function () {
        var ident = self.makeIdent(command[1][0], command[1][1]);

        if (undefined !== self.connections[ident]) {
            var local_data = null;

            if (true === command[1][2]) {
                local_data = self.data;
            }

            self.sendMessage(ident, 1, local_data);
        }
    });
};

Collective.prototype.parseData = function (command) {
    var self = this;

    self.assign(command[1][0], command[1][1], command[1][2], command[1][3]);
};

Collective.prototype.parseAccept = function (command) {
    var self = this;

    if (null !== command[1]) {
        self.data = command[1];
    }
};

Collective.prototype.makeConnections = function (callback) {
    var self = this;

    var x = self.remote.length;

	if (x === 0) {
		callback();
		return;
	}

    self.remote.forEach(function (item) {
        self.makeConnection(item.host, item.port, function () {
            x--;

            if (0 === x) {
                self.notifyConnections(function () {
                    callback();
                });
            }
        });
    });
};

Collective.prototype.makeConnection = function (host, port, callback) {
    var self = this;

    var ident = self.makeIdent(host, port);

    if (undefined === self.connections[ident]) {
        var options = {host: host, port: port};
        var connection = net.connect(options);

        connection.setKeepAlive(true);

        connection.on('connect', function () {
            self.addConnection(ident, connection, function () {
                callback();
            });
        });

        connection.on('end', function () {
            self.removeConnection(ident, function () {
                callback();
            });
        });

        connection.on('error', function () {
            self.removeConnection(ident, function () {
                callback();
            });
        });
    }
};

Collective.prototype.addConnection = function (ident, connection, callback) {
    var self = this;

    self.connections[ident] = connection;
    self.active++;

    var host = self.extractHost(ident);

    if (host !== self.local.host) {
        self.active_remote++;
    }

    callback();
};

Collective.prototype.removeConnection = function (ident, callback) {
    var self = this;

    if (undefined !== self.connections[ident]) {
        delete self.connections[ident];
        self.active--;

        var host = self.extractHost(ident);

        if (host !== self.local.host) {
            self.active_remote--;
        }
    }

    callback();
};

Collective.prototype.notifyConnections = function (callback) {
    var self = this;

    var ident = '';
    var command = [self.local.host, self.local.port, false];
    var i = 0;
    var random_connection = Math.floor(Math.random() * self.active_remote);
    var host = '';

    for (ident in self.connections) {
        if (self.connections.hasOwnProperty(ident)) {
            command[2] = false;

            host = self.extractHost(ident);

            if (host !== self.local.host || 0 === self.active_remote) {
                if (i === random_connection) {
                    command[2] = true;
                }

                i++;
            }

            self.sendMessage(ident, 0, command);
        }
    }

    callback();
};

Collective.prototype.sendMessage = function (ident, type, data) {
    var self = this;

    self.connections[ident].write(JSON.stringify([type, data]) + self.DELIMITER);
};

Collective.prototype.makeIdent = function (host, port) {
    return host + ':' + port;
};

Collective.prototype.extractHost = function (ident) {
    return ident.split(':')[0];
};

Collective.prototype.get = function (key) {
    var self = this;

    var notations = key.split('.');
    var object = self.data;

    while ('object' === typeof object && 0 < notations.length) {
        object = object[notations.shift()];
    }

    return object;
};

Collective.prototype.set = function (key, value, operation) {
    var self = this;

    operation = operation || self.OPERATIONS.SET;

    var time = +new Date();

    self.assign(key, time, value, operation);

    var ident = '';

    for (ident in self.connections) {
        if (self.connections.hasOwnProperty(ident)) {
            self.sendMessage(ident, 2, [key, time, value, operation]);
        }
    }
};

Collective.prototype.traverse = function (key) {
    var self = this;

    var notations = key.split('.');
    var i = '';
    var object = self.data;
    var tmp = '';

    while (1 < notations.length) {
        i = notations.shift();

        if (undefined === object[i]) {
            object[i] = {};
        }

        if ('object' !== typeof object[i]) {
            tmp = object[i];
            object[i] = {};
            object[i][tmp] = {};
        }

        object = object[i];
    }

    return [object, notations.shift()];
};

Collective.prototype.assign = function (key, time, value, operation) {
    var self = this;

    var reference = self.traverse(key);

    if (self.OPERATIONS.INCREMENT === operation) {
        if (undefined === reference[0][reference[1]]) {
            reference[0][reference[1]] = 0;
        }

        reference[0][reference[1]] += value;
    } else if (self.OPERATIONS.DELETE === operation) {
        if (undefined === self.history[key]) {
            self.history[key] = time;
        }

        if (self.history[key] <= time) {
            delete self.history[key];
            delete reference[0][reference[1]];
        }
    } else {
        if (undefined === self.history[key]) {
            self.history[key] = time;
        }

        if (self.history[key] <= time) {
            reference[0][reference[1]] = value;
        }
    }
};

module.exports = Collective;
