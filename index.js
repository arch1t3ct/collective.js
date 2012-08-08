var net = require('net');

function Collective(local, all, callback) {
    var self = this;

    self.TYPES = ['New', 'Accept', 'Data'];
    self.DELIMITER = '\n';

    self.local = local;
    self.remote = self.parseHosts(all);
    self.connections = {};
    self.active = 0;
    self.data = {};
    self.history = {};

    var server = net.createServer({allowHalfOpen: true}).listen(self.local.port, self.local.host);

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

        if ('undefined' !== typeof self.connections[ident]) {
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

    var options = {allowHalfOpen: true, host: host, port: port};
    var connection = net.connect(options);
    var ident = self.makeIdent(host, port);

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

    connection.on('error', function (error) {
        self.removeConnection(ident, function () {
            callback();
        });
    });
};

Collective.prototype.addConnection = function (ident, connection, callback) {
    var self = this;

    self.connections[ident] = connection;
    self.active++;

    callback();
};

Collective.prototype.removeConnection = function (ident, callback) {
    var self = this;

    if ('undefined' !== typeof self.connections[ident]) {
        delete self.connections[ident];
        self.active--;
    }

    callback();
};

Collective.prototype.notifyConnections = function (callback) {
    var self = this;

    var ident = '';
    var command = [self.local.host, self.local.port, false];
    var i = 0;
    var random_connection = Math.floor(Math.random() * self.active);

    for (ident in self.connections) {
        if (self.connections.hasOwnProperty(ident)) {
            command[2] = false;

            if (i === random_connection) {
                command[2] = true;
            }

            self.sendMessage(ident, 0, command);

            i++;
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

Collective.prototype.get = function (key) {
    var self = this;

    var reference = self.traverse(key);

    return reference[0][reference[1]];
};

Collective.prototype.set = function (key, value, math) {
    var self = this;

    math = math || false;

    var time = +new Date();

    self.assign(key, value, math, time);

    var ident = '';

    for (ident in self.connections) {
        if (self.connections.hasOwnProperty(ident)) {
            self.sendMessage(ident, 2, [key, value, math, time]);
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

        if ('undefined' === typeof object[i]) {
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

Collective.prototype.assign = function (key, value, math, time) {
    var self = this;

    var reference = self.traverse(key);

    if (true === math) {
        if ('undefined' === typeof reference[0][reference[1]]) {
            reference[0][reference[1]] = 0;
        }

        reference[0][reference[1]] += value;
    } else {
        if ('undefined' === typeof self.history[key]) {
            self.history[key] = time;
        }

        if (self.history[key] <= time) {
            reference[0][reference[1]] = value;
        }
    }
};

module.exports = Collective;