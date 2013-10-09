/* Includes */
var assert = require('assert');
var Collective = require('../index.js');

/* Config */
var host1 = {host: 'localhost', port: 8124};
var host2 = {host: '127.0.0.1', port: 8125}; // Same host interpreted as different just for tests.
var all_hosts = [host1, host2];

console.log('Working on it.');

var collective1 = new Collective(host1, all_hosts, function (collective1) {
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

    /* 5. Test set simple for math. */
    collective1.set('foo1', 7);
    assert.strictEqual(collective1.data.foo1, 7, ['Set simple for math with 1 host failed']);

    /* 6. Test set simple math addition. */
    collective1.set('foo1', 7, true);
    assert.strictEqual(collective1.data.foo1, 14, ['Set math addition with 1 host failed']);

    /* 7. Test set simple math substraction. */
    collective1.set('foo1', -7, true);
    assert.strictEqual(collective1.data.foo1, 7, ['Set math substraction with 1 host failed']);

    /* 8. Test reset to object simple. */
    collective1.set('foo1', {sample: true});
    assert.deepEqual(collective1.data.foo1,
        {sample: true},
        ['Reset simple to object with 1 host failed']);

    /* 9. Test get simple */
    var foo1 = collective1.get('foo1');
    assert.deepEqual(foo1, {sample: true}, ['Get simple with 1 host failed']);

    /* 10. Test set deep. */
    collective1.set('foo2.bar', 'quz');
    assert.strictEqual(collective1.data.foo2.bar,
        'quz',
        ['Set deep to object with 1 host failed']);

    /* 11. Test reset to object deep. */
    collective1.set('foo2.bar', {sample: true});
    assert.deepEqual(collective1.data.foo2.bar,
        {sample: true},
        ['Reset simple to object with 1 host failed']);

    /* 12. Test get simple */
    var foo2_bar = collective1.get('foo2.bar');
    assert.deepEqual(foo2_bar, {sample: true}, ['Get deep with 1 host failed']);

    var collective2 = new Collective(host2, all_hosts, function (collective2) {
        /* 13. Test 2 connection count. */
        assert.strictEqual(collective2.active, 1, ['Connection count with 2 hosts failed.']);

        /* 14. Test 2 connections. */
        var ident = '';
        var i = 0;
        for (ident in collective2.connections) {
            if (collective2.connections.hasOwnProperty(ident)) {
                i++;
            }
        }
        assert.strictEqual(i, 1, ['Connection test with 2 host failed.']);

        setTimeout(function () { // We wait for the back connection to be made.
            /* 15. Test 2 connection link count. */
            assert.strictEqual(collective1.active,
                collective2.active,
                ['Connection link count with 2 hosts failed.']);

            /* 16. Test 2 connection links. */
            var ident = '';
            var i = 0;
            var ii = 0;
            for (ident in collective1.connections) {
                if (collective1.connections.hasOwnProperty(ident)) {
                    i++;
                }
            }
            for (ident in collective2.connections) {
                if (collective2.connections.hasOwnProperty(ident)) {
                    ii++;
                }
            }
            assert.strictEqual(i, ii, ['Connection links with 2 hosts failed.']);

            /* 17. Test data synchronization */
            assert.deepEqual(collective1.data,
                collective2.data,
                ['Synchronization with 2 hosts failed.']);

            /* 18. Test set synchronization */
            collective1.set('foo3', 'bar');
            collective2.set('foo4', 'bar');
            setTimeout(function () { // We wait for the socket to flush the data.
                assert.deepEqual(collective1.data,
                    collective2.data,
                    ['Set synchronization with 2 hosts failed.']);

                /* 19. Test history synchronization */
                collective1.history.foo3 += 1500; // Fake delayed set.
                collective2.set('foo3', 'bar_newer');
                setTimeout(function () { // We wait for the socket to flush the data.
                    assert.deepEqual(collective1.data.foo3,
                        'bar',
                        ['History synchronization with 2 hosts failed.']);

                    /* 20. Test get for inexistant value */
                    assert.strictEqual(collective1.get('foo5'), undefined, ['foo5 is defined.']);

                    console.log('All tests passed.');

                    process.exit();
                }, 1000);
            }, 1000);
        }, 1000);
    });
});