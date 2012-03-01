var net = require('net');
var sendreceive = require('./sendreceive');

var server = net.createServer(function (socket) {
    console.log('server connected');
    br = new sendreceive.BoxReceiver();

    socket.on('end', function() {
        console.log(br.box);
        console.log('server disconnected');
    });
    socket.on('data', function(data) {
        br.dataReceived(data);
    });
});

server.listen(1234);
