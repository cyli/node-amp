var buffertools = require('buffertools');


function AmpReceiver () {
    var self = this;
    self.box = {};
    self._unprocessed = null;
    self._nextKey = null;
}

AmpReceiver.prototype.dataReceived = function dataReceived (data) {
    var self = this;
    if (self._unprocessed === null) {
        self._unprocessed = buffertools.concat(data);
    } else {
        self._unprocessed = self._unprocessed.concat(data);
    }

    var offset = 0,
        nextOffset = 0;

    // we want to process one key or value at a time, so the buffer length
    // should be more than the length of a Big Endian 16 bit int
    while (self._unprocessed.length > offset + 2) {
        var length = self._unprocessed.readInt16BE(offset);
        offset += 2;
        nextOffset = offset + length;

        if (self._unprocessed.length < nextOffset) {
            // not enough data in the buffer - wait for more data
            return;
        }

        if (self._nextKey === null) {
            // no key yet - this is a key
            self._nextKey = self._unprocessed.toString(
                'utf8', offset, nextOffset);
        } else {
            // there is already a key, so this is the value
            self.box[self._nextKey] = self._unprocessed.slice(
                offset, nextOffset);
            self._nextKey = null;
        }
        offset = nextOffset;
    }

    if (offset > 0) {
        // remove that which is already processed from unprocessed
        self._unprocessed = self._unprocessed.slice(offset);
    }
};


exports.AmpReceiver = AmpReceiver;


// var server = net.createServer(function (socket) {
//     console.log('server connected');
//     ar = new AmpReceiver();
//     socket.on('end', function() {
//         console.log(ar.box);
//         console.log('server disconnected');
//     });
//     socket.on('data', function(data) {
//         ar.dataReceived(data);
//     });
// });

// server.listen(1234);
