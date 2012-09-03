/*
These are utilities for sending and receiving AMP boxes on the wire, as
per http://amp-protocol.net:

On the wire, AMP is a protocol which uses 2-byte lengths to prefix keys and
values, and empty keys to separate messages::

    <2-byte length><key><2-byte length><value>
    <2-byte length><key><2-byte length><value>
    ...
    <2-byte length><key><2-byte length><value>
    <NUL><NUL>                  # Empty Key == End of Message

And so on.  Because it's tedious to refer to lengths and NULs constantly, the
documentation will refer to packets as if they were newline delimited, like
so::

    C: _command: sum
    C: _ask: ef639e5c892ccb54
    C: a: 13
    C: b: 81

    S: _answer: ef639e5c892ccb54
    S: total: 94

Note: an AMP box in this instance would be a dictionary whose keys are strings
but whose values are Buffers (should be serialized elsewhere)

Also note: the lengths should be encoded as 16 bit integers (2 octets) with
big endian format.
*/


// A BoxReceiver can receive boxes from the wire.  The default callback for a
// @param receiveBoxCallback {function} function that takes a completely
//      received box - if none is provided just prints the box to the console
function BoxReceiver (receiveBoxCallback) {
  var self = this;
  self.box = {};
  self._unprocessed = new Buffer(0);
  self._nextKey = null;
  self.receiveBox = receiveBoxCallback || function(box) { console.log(box); };
}


// Receive some data from the wire and process it - try to insert values into
// an existing box, or finish of an existing box and call self.receiveBox with
// the box
// @param data {Buffer} - new data
BoxReceiver.prototype.dataReceived = function (data) {
  var self = this;
  self._unprocessed = Buffer.concat([self._unprocessed, data]);

  var offset = 0;
  nextOffset = 0;

  // we want to process one key or value at a time, so the buffer length
  // should be more than the length of a Big Endian 16 bit int
  while (self._unprocessed.length >= offset + 2) {
    var length = self._unprocessed.readInt16BE(offset);
    offset += 2;
    nextOffset = offset + length;

    if (length === 0) {
      // 0 length - that means that this box has terminated.  Send it
      // off and start a new box
      self.receiveBox(self.box);
      self.box = {};
      continue;
    }

    if (self._unprocessed.length < nextOffset) {
      // there is not enough data in the buffer so wait for more data
      offset -= 2;  // undo the change in offset
      return;
    }

    if (self._nextKey === null) {
      // no key yet - this is a key
      self._nextKey = self._unprocessed.toString('utf8', offset, nextOffset);
    } else {
      // there is already a key, so this is the value
      self.box[self._nextKey] = self._unprocessed.slice(offset, nextOffset);
      self._nextKey = null;
    }
    offset = nextOffset;
  }

if (offset > 0) {
    // remove that which is already processed from unprocessed
    self._unprocessed = self._unprocessed.slice(offset);
  }
};


// Wire-encode an Amp Box (dictionary) as per the AMP protocol -
// dictionary should have buffers as values
// @return {string} as defined by the AMP protocol
function BoxSender (box) {
  var self = this;
  var keys;
  self.box = box;

  self._wireBuffers = []; // a bunch of buffers to be written

  function pushBuffer(buffer) {
    var idx = self._wireBuffers.length;
    self._wireBuffers.push(new Buffer(2));
    if (buffer.length > 0) {
        self._wireBuffers.push(buffer);
    }
    self._wireBuffers[idx].writeInt16BE(buffer.length, 0);
  }

  keys = Object.keys(self.box);
  for (var i=0; i<keys.length; i++) {
    pushBuffer(new Buffer(keys[i], 'utf8'));
    pushBuffer(self.box[keys[i]]);
  }
  // Empty key signifying the end of the box
  pushBuffer(new Buffer([]));
}


// Write the buffers to a transport
// @param transportWrite {function} a callback that takes a buffer and takes
//      a buffer and does something with it (like write it to a socket)
BoxSender.prototype.writeToTransport = function (transportWrite) {
  var self = this;
  for (var i=0; i<self._wireBuffers.length; i++) {
    transportWrite(self._wireBuffers[i]);
  }
};

exports.BoxReceiver = BoxReceiver;
exports.BoxSender = BoxSender;
