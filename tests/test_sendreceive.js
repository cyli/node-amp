/* Tests for sending and receiving AMP boxes */

var buffertools = require('buffertools');

var sendreceive = require('../lib/sendreceive');


// helper function to assemble a list of buffers to be passed to dataReceived
function _buildBuffers(arrayOfStrings) {
    var newArray = [];

    for (var i=0; i<=arrayOfStrings.length; i++) {
        newArray.push(new Buffer(2)); // the length
        if (i < arrayOfStrings.length) {  // the string
            newArray.push(new Buffer(arrayOfStrings[i]));
        }
        newArray[2*i].writeInt16BE( // set the length
            // if this is the end of message, length should be 0
            (i === arrayOfStrings.length ? 0 : newArray[2*i+1].length),
            0);
    }

    return newArray;
}

// Makes a new BoxReceiver that pushes complete AMP boxes into a completed
// boxes array in the BoxReceiver
function _setupBR() {
    var br = new sendreceive.BoxReceiver(
        function(aBox) { br.completed.push(aBox); }
    );
    br.completed = [];
    return br;
}


// Tests the case where there is 1 completed box with numkeys key/value pairs,
// each being 'keyX': 'valueX'
function _testCompelteBox(br, assert, numKeys) {
    assert.length(Object.keys(br.box), 0,
        'There should be no partially-complete boxes');
    assert.length(br.completed, 1, 'There should be 1 completed box');
    assert.length(Object.keys(br.completed[0]), numKeys,
        'There should be ' + numKeys + ' key/value pairs');
    for (i=1; i<=numKeys; i++) {
        assert.isDefined(br.completed[0]['key' + i], 'Key is "key' + i + '"');
        assert.equal(Buffer.isBuffer(br.completed[0]['key' + i]), true,
            "The value should be a Buffer");
    }
}


// Ensures that sending as one big chunk does not impede the receiver's ability
// to put together an AMP box
exports['test_dataReceived_oneBuffer'] = function(test, assert) {
    var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']),
        bigBuffer = buffertools.concat(buffers[0]),
        br = _setupBR();

    for (var i=1; i<buffers.length; i++) {
        bigBuffer = bigBuffer.concat(buffers[i]);
    }

    br.dataReceived(bigBuffer);

    _testCompelteBox(br, assert, 2);
    test.finish();
};


// Ensures that sending each chunk separately but atomically (length, then key,
// then length, then value, etc.) does not impede the receiver's ability to put
// together an AMP box
exports['test_dataReceived_atomicBuffers'] = function(test, assert) {
    var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']),
        br = _setupBR();

    for (i=0; i<buffers.length; i++) {
        br.dataReceived(buffers[i]);
    }

    _testCompelteBox(br, assert, 2);
    test.finish();
};


// Ensures that sending each chunk separately but not atomically (length, key,
// values, etc. may be split across differet buffers) does not impede the
// receiver's ability to put together an AMP box
exports['test_dataReceived_nonAtomicBuffers'] = function(test, assert) {
    var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']),
        brokenBuffers = [new Buffer([])],
        br = _setupBR();

    var i;

    // split the buffers so that the first octet is not with the rest
    for (i=0; i<buffers.length; i++) {
        brokenBuffers[i] = buffertools.concat(
            brokenBuffers[i],
            buffers[i].slice(0, 1));
        brokenBuffers.push(buffers[i].slice(1));
    }

    for (i=0; i<brokenBuffers.length; i++) {
        br.dataReceived(brokenBuffers[i]);
    }

    _testCompelteBox(br, assert, 2);
    test.finish();
};


// Ensures that a box will not be finished unless an end of message is received
// (a 0-length key)
exports['test_dataReceived_endOfMessage'] = function(test, assert) {
    var buffers = _buildBuffers(['key', 'value']),
        br = _setupBR();

    for (var i=0; i<buffers.length-1; i++) {
        br.dataReceived(buffers[i]);
    }

    assert.length(br.completed, 0,
        'Without the end of message, there should be no completed boxes');
    assert.equal(Object.keys(br.box).length > 0, true,
        'There should be a partially-complete box in the receiver');

    br.dataReceived(buffers[buffers.length-1]);

    assert.length(br.completed, 1,
        'With the end of message, there should be 1 completed box');
    assert.equal(Object.keys(br.box).length === 0, true,
        'There should be no partially-complete box in the receiver');

    test.finish();
};


// Ensures that BoxSender's writeToTransport will write data that can be
// converted back into an AMP box - we are not testing how many atomic buffers
// it BoxSender produces, because that implementation can change so long as
// writeToTransport will effectively write the same data
exports['test_writeToTransport'] = function(test, assert) {
    var box = {
            'key1': new Buffer('value1'),
            'key2': new Buffer('value2')
        },
        bs = new sendreceive.BoxSender(box),
        br = _setupBR();

    bs.writeToTransport(function(d) { br.dataReceived(d); });

    assert.length(br.completed, 1, 'Should be a complete box');
    assert.eql(br.completed[0], box,
        "Sent box should be same as received box");
    test.finish();
};
