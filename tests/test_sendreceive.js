var AmpReceiver = require('../lib/sendreceive').AmpReceiver;

exports['test_dataReceived_atomicBuffers'] = function(test, assert) {
    var ar = new AmpReceiver(),
        buffers = [
            new Buffer(2), // a length - we'll write to it later
            new Buffer('key'),
            new Buffer(2), // a length - we'll write to it later
            new Buffer('value')
        ],
        i;

    for (i=0; i<buffers.length; i++) {
        if (i % 2 === 0) { //0 and 2
            buffers[i].writeInt16BE(buffers[i + 1].length, 0);
        }
        ar.dataReceived(buffers[i]);
    }

    assert.length(Object.keys(ar.box), 1, 'There should be 1 key/val pair');
    assert.isDefined(ar.box['key'], 'Key is "key"');
    assert.equal(Buffer.isBuffer(ar.box['key']), true,
        "The value should be a Buffer");
    test.finish();
};
