//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

var messages = [];
var sockets = [];


//Valida a requisição
router.get('/webhook', function (req, res) {
  if(req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'GoGama10') {
    console.log('Validção OK!');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.log('Validção falhou');
    res.sendStatus(403);
  }
  
})


//criar o caminho para o POST
router.post('/webhook', function(req, res) {

  var data = req.body;
  
  if (data && data.object === 'page') {
    //Percorrer todas as entradas entry
    data.entry.forEach(function (entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;
      
      //Percorrer todas as mensagens
      entry.messaging.forEach(function (event) {
        if (event.message) {
          trataMensagem(event);
        }
      })
    })
    
    //Enviar resposta de volta ao facebook para que a aplicação não seja desabilitada
    res.sendStatus(200);
    
  }
})


function trataMensagem (event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  console.log("Mensagem recebida do usuário %d pela página %d", senderID, recipientID);
  
  var messageID = message.mid;
  var messageText = message.text;
  var attachments = message.attachments;
  
  // if (messageText) {
  //   switch (messageText) {
  //     case '1';
  //       //responder com outro oi
        
  //       break;
  //     case '2';
  //       //responder com outro tchau;
  //       break;
  //     default:
  //     //Enviar uma mensagem padrão;
      
  //   }
  // } else if (attachments) {
  //   //tratamento dos anexos
  //   console.log("Este é um anexo")
  // }
}



function callSendAPI (messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages'
  })
}





io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
