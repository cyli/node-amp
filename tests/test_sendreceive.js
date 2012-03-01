var sendreceive = require('../lib/sendreceive');

exports['test_dataReceived_atomicBuffers'] = function(test, assert) {
    var br = new sendreceive.BoxReceiver(),
        buffers = [
            new Buffer(2), // a length - we'll write to it later
            new Buffer('key1'),
            new Buffer(2), // a length - we'll write to it later
            new Buffer('value1'),
            new Buffer(2), // a length - we'll write to it later
            new Buffer('key2'),
            new Buffer(2), // a length - we'll write to it later
            new Buffer('value2')
        ];
    var i;

    for (i=0; i<buffers.length; i++) {
        if (i % 2 === 0) { // 0, 2, 4, and 6
            buffers[i].writeInt16BE(buffers[i + 1].length, 0);
        }
        br.dataReceived(buffers[i]);
    }

    assert.length(Object.keys(br.box), 2, 'There should be 2 key/value pairs');
    for (i=1; i<3; i++) {
        assert.isDefined(br.box['key' + i], 'Key is "key' + i + '"');
        assert.equal(Buffer.isBuffer(br.box['key' + i]), true,
            "The value should be a Buffer");
    }
    test.finish();
};


exports['test_writeToReceiver'] = function(test, assert) {
    var box = {
            'key1': new Buffer('value1'),
            'key2': new Buffer('value2')
        },
        bs = new sendreceive.BoxSender(box),
        br = new sendreceive.BoxReceiver(),
        output = [];

    bs.writeToTransport(function(d) { br.dataReceived(d); });

    assert.eql(br.box, box, "Sent box should be same as received box");
    test.finish();
};
