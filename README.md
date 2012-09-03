Node.js implementation of AMP. (http://amp-protocol.net)

[![Build Status](https://secure.travis-ci.org/cyli/node-amp.png)](http://travis-ci.org/cyli/node-amp)

Currently just provides functionality to receive an AMP box and send an AMP
box (an AMP box being defined as a dictionary with utf8 strings as keys and
Buffers as values).

###Server example:
Run "node examples/ampserver.js" and twisted's doc/core/examples/ampclient.py.
This just prints out the box received, but doesn't reply since the
serialization layer hasn't been implemented yet.

###Client example:
Run twisted's doc/core/examples/ampserver.py and "node examples/ampclient.js".
An AMP box is hacked togethe to do call Sum on two numbers on the amp server.
The reply from the server (in AMP box form) is printed to the console.


###TODO:
 - AMP serialization format
 - real sample server and client
