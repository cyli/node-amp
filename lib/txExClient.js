var net = require('net');
var sendreceive = require('./sendreceive');

var client = net.createConnection(1234, '127.0.0.1', function () {
    console.log('client connected');

    // call Sum (see twisted amp server example)
    var br = new sendreceive.BoxReceiver(),
        sumCall = {
            '_ask': new Buffer(2),
            '_command': new Buffer('Sum', 'utf8'),
            'a': new Buffer('13'),
            'b': new Buffer('81')
        },
        bx;
    sumCall._ask.writeInt16BE(15, 0);
    bx = new sendreceive.BoxSender(sumCall);

    console.log('sending AMP box');
    bx.writeToTransport(function(d) { client.write(d.toString('utf8')); });

    client.on('data', function(data) {
        br.dataReceived(data);
    });

    client.on('end', function() {
        console.log(br.box);
        console.log('server disconnected');
    });
});
