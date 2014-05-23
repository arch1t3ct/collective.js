'use strict';

/* Includes */
var assert = require('assert');
var Collective = require('../index.js');

/* Config */
var host1 = {host: 'localhost', port: 8124};
var host2 = {host: '127.0.0.1', port: 8125}; // Same host interpreted as different just for tests.
var host3 = {host: '127.0.0.1', port: 8126}; // Same host interpreted as different just for tests.
var all_hosts = [host1, host2];
var collective1 = null;
var collective2 = null;

console.log('Working on it.');

collective1 = new Collective(host1, all_hosts, function (collective1) {
    /* 1. Test 1 connection count. */
    assert.strictEqual(collective1.active, 0, ['Connection count with 1 host failed.']);

    /* 2. Test 1 connection. */
    var ident = '';
    var i = 0;
    for (ident in collective1.connections) {
        if (collective1.connections.hasOwnProperty(ident)) {
            i++;
        }
    }
    assert.strictEqual(i, 0, ['Connection test with 1 host failed.']);

    /* 3. Test 1 connection returns. */
    assert.strictEqual(collective1.active, 0, ['Connection return with 1 host failed.']);

    /* 4. Test set simple string. */
    collective1.set('foo1', 'bar');
    assert.strictEqual(collective1.data.foo1, 'bar', ['Set simple string with 1 host failed']);

    /* 5. Test set simple for increment. */
    collective1.set('foo1', 7);
    assert.strictEqual(collective1.data.foo1, 7, ['Set simple for increment with 1 host failed']);

    /* 6. Test set simple increment addition. */
    collective1.set('foo1', 7, collective1.OPERATIONS.INCREMENT);
    assert.strictEqual(collective1.data.foo1, 14, ['Set increment addition with 1 host failed']);

    /* 7. Test set simple increment substraction. */
    collective1.set('foo1', -7, collective1.OPERATIONS.INCREMENT);
    assert.strictEqual(collective1.data.foo1, 7, ['Set increment substraction with 1 host failed']);

    /* 8. Test reset to object simple. */
    collective1.set('foo1', {sample: true});
    assert.deepEqual(collective1.data.foo1,
        {sample: true},
        ['Reset simple to object with 1 host failed']);

    /* 9. Test get simple */
    var foo1 = collective1.get('foo1');
    assert.deepEqual(foo1, {sample: true}, ['Get simple with 1 host failed']);

    /* 10. Test delete simple */
    collective1.set('foo1', null, collective1.OPERATIONS.DELETE);
    assert.deepEqual(collective1.data.foo1, undefined, ['Delete simple with 1 host failed']);

    /* 11. Test set deep. */
    collective1.set('foo2.bar', 'quz');
    assert.strictEqual(collective1.data.foo2.bar, 'quz', ['Set deep to object with 1 host failed']);

    /* 12. Test reset to object deep. */
    collective1.set('foo2.bar', {sample: true});
    assert.deepEqual(collective1.data.foo2.bar,
        {sample: true},
        ['Reset simple to object with 1 host failed']);

    /* 13. Test get deep */
    var foo2_bar = collective1.get('foo2.bar');
    assert.deepEqual(foo2_bar, {sample: true}, ['Get deep with 1 host failed']);

    /* 14. Test delete deep */
    collective1.set('foo2.bar', null, collective1.OPERATIONS.DELETE);
    assert.deepEqual(collective1.data.foo2.bar, undefined, ['Delete deep with 1 host failed']);

    collective2 = new Collective(host2, all_hosts, function (collective2) {
        /* 15. Test 2 connection count. */
        assert.strictEqual(collective2.active, 1, ['Connection count with 2 hosts failed.']);

        /* 16. Test 2 connections. */
        var ident2 = '';
        var i2 = 0;
        for (ident2 in collective2.connections) {
            if (collective2.connections.hasOwnProperty(ident2)) {
                i2++;
            }
        }
        assert.strictEqual(i2, 1, ['Connection test with 2 host failed.']);

        setTimeout(function () { // We wait for the back connection to be made.
            /* 17. Test 2 connection link count. */
            assert.strictEqual(collective1.active,
                collective2.active,
                ['Connection link count with 2 hosts failed.']);

            /* 18. Test 2 connection links. */
            var ident3 = '';
            var i3 = 0;
            var ii3 = 0;
            for (ident3 in collective1.connections) {
                if (collective1.connections.hasOwnProperty(ident3)) {
                    i3++;
                }
            }
            for (ident3 in collective2.connections) {
                if (collective2.connections.hasOwnProperty(ident3)) {
                    ii3++;
                }
            }
            assert.strictEqual(i3, ii3, ['Connection links with 2 hosts failed.']);

            /* 19. Test data synchronization */
            assert.deepEqual(collective1.data,
                collective2.data,
                ['Synchronization with 2 hosts failed.']);

            /* 20. Test set synchronization */
            collective1.set('foo3', 'bar');
            collective2.set('foo4', 'bar');
            setTimeout(function () { // We wait for the socket to flush the data.
                assert.deepEqual(collective1.data,
                    collective2.data,
                    ['Set synchronization with 2 hosts failed.']);

                /* 21. Test history synchronization */
                collective1.history.foo3 += 1500; // Fake delayed set.
                collective2.history.foo3 += 1500; // Fake delayed set.
                collective2.set('foo3', 'bar_newer');
                setTimeout(function () { // We wait for the socket to flush the data.
                    assert.deepEqual(collective1.data.foo3,
                        'bar',
                        ['History synchronization with 2 hosts failed.']);

                    /* 22. Test get for inexistant value */
                    assert.strictEqual(collective1.get('foo5'), undefined, ['foo5 is defined.']);

                    /* 23. Test delete synchronization */
                    collective1.set('foo2', null, collective1.OPERATIONS.DELETE);
                    collective1.set('foo4', null, collective1.OPERATIONS.DELETE);
                    setTimeout(function () { // We wait for the socket to flush the data.

                        assert.deepEqual(collective1.data,
                            collective2.data,
                            ['Delete synchronization with 2 hosts failed.']);

						var callback_run;
						var collective3 = new Collective(host3, [host3], function (collective3) {
							assert.ok(true, ['Callback runs when there is only one host']);
							console.log('All tests passed.');
							process.exit();
						});
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    });
});
