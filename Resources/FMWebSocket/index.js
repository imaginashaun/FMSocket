//new solution
//upgrade port for http use...
//ref: https://programmer.group/in-nodejs-http-protocol-and-ws-protocol-reuse-the-same-port.html
var express = require("express");
const WS_MODULE = require("ws");
const http = require("http");

const app = express();
app.use(express.static(__dirname + '/public'));
const port = 3000;


app.get("/hello", (req, res) => {

  res.send("hello world");

});

const server = http.createServer(app);

ws = new WS_MODULE.Server({server});

server.listen(port, () => {
  console.log("Server turned on, port number:" + port);
});
//new solution

var serverID = 'undefined';
var serverWS = null;
const clients = new Map();

function uuidv4()
{
  // return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  //   var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
  //   return v.toString(16);
  // });

  function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
  return s4() + s4() + '-' + s4();
}

function ByteToInt32(_byte, _offset)
{
    return (_byte[_offset] & 255) + ((_byte[_offset + 1] & 255) << 8) + ((_byte[_offset + 2] & 255) << 16) + ((_byte[_offset + 3] & 255) << 24);
}
function ByteToInt16(_byte, _offset)
{
    return (_byte[_offset] & 255) + ((_byte[_offset + 1] & 255) << 8);
}

ws.on('connection', function connection(ws) {


      const wsid = uuidv4();
      const networkType = 'undefined';
//      const allocatedTo = 'undefined';
      const metadata = { ws, networkType, wsid };

      if(!clients.has(wsid))
      {
        ws.id = wsid;

        clients.set(wsid, metadata);
        console.log("connection count: " + clients.size + " : " + wsid);

        ws.send("OnReceivedWSIDEvent(" + wsid +")");
      }


  function heartbeat()
  {
    if (!ws) return;
    if (ws.readyState !== 1) return;
    if (serverID !== 'undefined')
    {
      ws.send("heartbeat");
    }
    else
    {
      ws.send("WaitingUnityServer");
    }
    setTimeout(heartbeat, 500);
  }

  //onOpen
  heartbeat();

  ws.on('close', function close() {
    //on user disconnected
    if(wsid === serverID)
    {
      //on server disconnected

      serverID = 'undefined';
      serverWS = null;
      console.log("Disconnected [Server]: " + wsid);

      for (let i = clients.size - 1; i >= 0; i--)
      {
        var clientWSID = [...clients][i][0];
        if(clientWSID !== serverID)
        {
          [...clients][i][1].ws.send("OnLostServerEvent(" + wsid + ")");
          [...clients][i][1].ws.close();
          clients.delete([...clients][i][0]);
        }
      }
    }
    else
    {
      //on client disconnected
      console.log("Disconnected [Client]: " + wsid);
      if(serverWS !== null) serverWS.send("OnClientDisconnectedEvent(" + wsid + ")");
    }

    clients.delete(wsid);
    console.log("connection count: " + clients.size);
  });

  ws.on('message', function incoming(message) {
    //var decodeString = new String(message);
    //console.log("messageis "+message);
   // console.log("messageis "+message);
  /*  var message = data;
    if(data instanceof Buffer) {
      // The ID is the first 14 bytes of the data.
      const id = data.slice(0, 14).toString();

      // The message data begins after the 14th byte.
       message = data.slice(14);
      console.log('WebSocket ID:', id); // Will output: 7fd82b73-28b5

    }*/
   // console.log('Message Data:', message.toString());

    //check registration
    if(message.length === 4)
    {
     // console.log("WOOOP")
      if(message[0] === 0 && message[1] === 0 && message[2] === 9 && message[3] === 3)
      {
        serverID = wsid;
        serverWS = ws;
        console.log("regServer: " + wsid + "[Server] " + serverID);
        clients.get(wsid).networkType = 'server';

        for (let i = 0; i < clients.size; i++) {
          var clientWSID = [...clients][i][0];
          if(clientWSID !== wsid)
          {
            [...clients][i][1].ws.send("OnFoundServerEvent(" + wsid + ")");
          }
          if(clientWSID !== serverID) serverWS.send("OnClientConnectedEvent(" + clientWSID + ")");
        }
      }
      else if(message[0] === 0 && message[1] === 0 && message[2] === 9 && message[3] === 4)
      {
        console.log("regClient: " + wsid + "[Server] " + serverID);


        clients.get(wsid).networkType = 'client';
        //clients.get(wsid).allocatedTo = serverID
        //clients.get(serverID).allocatedTo = wsid

        //using a websocket connection. send a message to a specific cocket
        if(serverWS !== null)
        {
          //tell server about the new connected client
          serverWS.send("OnClientConnectedEvent(" + wsid + ")");

          //tell client about the existing server
          ws.send("OnFoundServerEvent(" + serverID + ")");
        }
      }
    }

    // if(message.length > 4 && message[0] === 0)
    if(message.length > 4)
    {
//      console.log("WAAAP")

      if (serverID !== 'undefined')
      {
          switch(message[1])
          {
              //emit type: all;
              case 0:
                for (let i = 0; i < clients.size; i++) {
                  var clientWSID = [...clients][i][0];
                  if(clientWSID !== serverID)
                  {
                    [...clients][i][1].ws.send(message);
                    console.log("EMITED: "+clientWSID)
                  }
                }
                console.log("EMITED2: ZZZ")

                //stream serverWS as the last one
                serverWS.send(message);
                break;
              //emit type: server;
              case 1:
                console.log("EMITED2: WWW")

                serverWS.send(message);
                break;
              //emit type: others;
              case 2:
                //sending to user
               // console.log("EMITED2: GRR")

                for (let i = 0; i < clients.size; i++) {
                  var clientWSID = [...clients][i][0];
                  if(clientWSID !== wsid)
                  {
                    [...clients][i][1].ws.send(message);
                    console.log("EMITED2: "+clientWSID)

                  }
                }
                break;
              case 3:
                //send to target
                  var _wsidByteLength = ByteToInt16(message, 4);
                  //_wsidByteLength
                  var _wsidByte = message.slice(6, 6 + _wsidByteLength);

                 // console.log("LENGTH IS:"+_wsidByteLength);

                  var _wsid = String.fromCharCode(..._wsidByte);
               // console.log("EMITED 3: "+_wsid)

/*
                if (clients.has(_wsid)) {
                  console.log("EMITED 4: " + _wsid)

                  if (clients.get(_wsid).networkType === "server") {
                    console.log("EMITED 4: " + _wsid)

                  }
                }else{


                   _wsidByteLength = ByteToInt16(message, 4);
                  //_wsidByteLength
                   _wsidByte = message.slice(4, 17);

                  // console.log("LENGTH IS:"+_wsidByteLength);

                   _wsid = String.fromCharCode(..._wsidByte);
                  console.log("EMITED 5: " + _wsid)

                  if (clients.get(_wsid).networkType === "server") {
                    console.log("EMITED 5-: " + _wsid)

                  }
                }

                */
              //  message = message.slice(6 + _wsidByteLength, message.length);

                // const sent_message = message.slice((6 + _wsidByteLength));
                //  console.log("EMITED 4: "+_wsid)

                if(_wsid.includes("left") || _wsid.includes("right") || _wsid.includes("up") || _wsid.includes("down") || _wsid.includes("ick-")){

                  _wsidByteLength = ByteToInt16(message, 4);
                  //_wsidByteLength
                  _wsidByte = message.slice(-13);

                  message = message.slice(0, -13);


                  // console.log("LENGTH IS:"+_wsidByteLength);

                   _wsid = String.fromCharCode(..._wsidByte);

                  console.log("GOT IT1: "+_wsid)

                  console.log("GOT IT0: "+clients.get(_wsid).networkType)


              //    clients.get(_wsid).ws.send(message);

/*
                  for (let i = 0; i < clients.size; i++) {
                     clientWSID = [...clients][i][0];

                      [...clients][i][1].ws.send(message);
                      console.log("EMITEDXX: "+clientWSID)


                  }

                  for (let i = 0; i < clients.size; i++) {
                     clientWSID = [...clients][i][0];

                      [...clients][i][1].ws.send(message);
                      console.log("EMITEDZZ: "+clientWSID)

                  }
                  */

                }

                try{

                  clients.get(_wsid).ws.send(message);

                } catch{

                  console.log("FAILLLL FOR: "+_wsid);
                }
                  break;
          }
      } else {
          console.log('cannot find any active server');
      }
    }
  });
});
