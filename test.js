var express = require('express');
var http = require('http');
var socketIO = require('socket.io');
var Client = require('ssh2').Client;
var cors = require('cors');
var fs = require('fs');

var app = express();
var server = http.createServer(app);
var io = socketIO(server, {
  cors: {
    origin: '*',  // Allow all origins for simplicity
  }
});

app.use(cors());  // Enable CORS
app.use(express.json());

io.on('connection', function (socket) {
  console.log('Client connected');

  var conn = null;

  socket.on('ssh-connect', function (data) {
    var host = data.host;
    var port = data.port || 22;  // Default SSH port
    var username = data.username;
    var privateKeyPath = data.privateKeyPath;

    // Read the private key from the specified file
    var privateKey = privateKeyPath;

    conn = new Client();

    conn
      .on('ready', function () {
        socket.emit('ssh-data', 'Connected to SSH server\n');

        conn.shell(function (err, stream) {
          if (err) {
            socket.emit('ssh-error', 'Error opening shell: ' + err.message);
            return;
          }

          // Stream SSH output to the client
          stream.on('data', function (data) {
            socket.emit('ssh-data', data.toString());
          });

          // Listen for terminal input from client
          socket.on('ssh-input', function (input) {
            stream.write(input);
          });

          stream.on('close', function () {
            socket.emit('ssh-data', 'SSH session closed');
            conn.end();
          });
        });
      })
      .on('error', function (err) {
        socket.emit('ssh-error', 'SSH connection error: ' + err.message);
      })
      .connect({
        host: host,
        port: port,
        username: username,
        privateKey: privateKey,
      });
  });

  socket.on('disconnect', function () {
    if (conn) conn.end();
    console.log('Client disconnected');
  });
});

server.listen(3000, function () {
  console.log('Server listening on port 3000');
});
