/* Tests for sending and receiving AMP boxes */

var sendreceive = require('../lib/sendreceive');


// helper function to assemble a list of buffers to be passed to dataReceived
function _buildBuffers(arrayOfStrings) {
  var arrayOfBuffers = [];
  var emptyLength = new Buffer(2);

  arrayOfStrings.forEach(function(string) {
    var strLength = new Buffer(2);
    // write the length of the string
    strLength.writeInt16BE(string.length, 0);
    arrayOfBuffers.push(strLength);
    // then write the string
    arrayOfBuffers.push(new Buffer(string));
  });

  emptyLength.writeInt16BE(0, 0);
  arrayOfBuffers.push(emptyLength);

  return arrayOfBuffers;
}


// Tests the case where there is 1 completed box with numkeys key/value
// pairs, each being 'keyX': 'valueX'
_assertCompleteBox = function(test, numKeys) {
  var self = this;
  var i;
  test.deepEqual(Object.keys(self.br.box), [],
                 'There should be no partially-complete boxes');
  test.equal(self.completed.length, 1, 'There should be 1 completed box');
  test.equal(Object.keys(self.completed[0]).length, numKeys,
             'There should be ' + numKeys + ' key/value pairs');
  for (i=1; i<=numKeys; i++) {
    test.notEqual(self.completed[0]['key' + i], undefined,
                  'Key is "key' + i + '"');
    test.ok(Buffer.isBuffer(self.completed[0]['key' + i]),
            "The value should be a Buffer");
  }
};


module.exports = {
  BoxReceiver: {
    setUp: function(cb) {
      var self = this;
      self.completed = [];

      // Makes a new BoxReceiver that pushes complete AMP boxes into a
      // completed boxes array
      self.br = new sendreceive.BoxReceiver(function(aBox) {
        self.completed.push(aBox);
      });

      cb();
    },

    // Receiver can assemble an AMP box from data sent as one big chunk
    testReceivedOneBigBuffer: function(test) {
      var self = this;
      var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']);

      self.br.dataReceived(Buffer.concat(buffers));
      _assertCompleteBox.bind(self)(test, 2);
      test.done();
    },

    // Receiver can assemble an AMP box from data sent in separate, atomic
    // chunks (length, then key, then length, then value, etc.)
    test_dataReceived_atomicBuffers: function(test) {
      var self = this;
      var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']);

      buffers.forEach(function(oneBuffer) {
        self.br.dataReceived(oneBuffer);
      });
      _assertCompleteBox.bind(self)(test, 2);
      test.done();
    },

    // Receiver can assemble an AMP box from data sent in separate, non-atomic
    // chunks(length, key, values, etc. may be split across differet buffers)
    test_dataReceived_nonAtomicBuffers: function(test) {
      var self = this;
      var buffers = _buildBuffers(['key1', 'value1', 'key2', 'value2']);

      // split the buffers so that the first octet is not with the rest
      buffers.forEach(function(oneBuffer) {
        self.br.dataReceived(oneBuffer.slice(0, 1));  // first octet
        self.br.dataReceived(oneBuffer.slice(1));     // the rest
      });

      _assertCompleteBox.bind(self)(test, 2);
      test.done();
    },

    // Receiver completes a box only when an end of message is received
    // (a 0-length key)
    testBoxOnEndOfMessage: function(test) {
      var self = this;
      var buffers = _buildBuffers(['key1', 'value']);

      buffers.forEach(function(oneBuffer, idx) {
        if (idx < buffers.length - 1) {
          self.br.dataReceived(oneBuffer);
        }
      });

      test.equal(self.completed.length, 0,
                 'Without EoM, there should be no completed boxes');
      test.ok(Object.keys(self.br.box).length > 0,
              'There should be a partially-complete box in the receiver');

      self.br.dataReceived(buffers[buffers.length-1]);

      _assertCompleteBox.bind(self)(test, 1);
      test.done();
    }
  },

  BoxSender: {
    setUp: function(cb) {
      var self = this;
      self.completed = [];

      // Makes a new BoxReceiver that pushes complete AMP boxes into a
      // completed boxes array
      self.br = new sendreceive.BoxReceiver(function(aBox) {
        self.completed.push(aBox);
      });

      cb();
    },

    // BoxSender's writeToTransport writes data that can be converted back into
    // an AMP box.
    testWrittenBoxIsReceivable: function(test, assert) {
      var self = this;
      var box = {
        'key1': new Buffer('value1'),
        'key2': new Buffer('value2')
      };
      var bs = new sendreceive.BoxSender(box);
      bs.writeToTransport(function(data) { self.br.dataReceived(data); });

      // test.equal(self.completed.length, 1, 'Should be a complete box');
      _assertCompleteBox.bind(self)(test, 2);
      test.deepEqual(self.completed[0], box,
                     "Sent box should be same as received box");
      test.done();
    }
  }
};
