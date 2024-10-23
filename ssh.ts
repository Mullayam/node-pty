import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Client } from 'ssh2';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity
  },
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log('Client connected');

  let conn: Client | null = null;

  socket.on('ssh-connect', (data) => {
    const { host, port, username, password } = data;
    conn = new Client();

    conn
      .on('ready', () => {
        socket.emit('ssh-data', 'Connected to SSH server\n');

        conn.shell({ cols: 80, rows: 24, term: 'xterm-256color' },(err, stream) => {
          if (err) {
            socket.emit('ssh-error', 'Error opening shell: ' + err.message);
            return;
          }

          // Stream SSH output to the client
          stream.on('data', (data) => {
            socket.emit('ssh-data', data.toString());
          });

          // Listen for terminal input from client
          socket.on('ssh-input', (input) => {
            stream.write(input);
          });

          stream.on('close', () => {
            socket.emit('ssh-data', 'SSH session closed');
            conn?.end();
          });
        });
      })
      .on('error', (err) => {
        socket.emit('ssh-error', 'SSH connection error: ' + err.message);
      })
      .connect({
        host,
        port,
        username,
        password,
      });
  });
  setInterval(()=>{
    socket.emit("ISCONNECTED",  new Date().toISOString)
  },1500)
  socket.on('disconnecting', () => {  
    console.log('disconnecting');
  });
  socket.on('disconnect', () => {
    conn?.end();    
    console.log('Client disconnected');
  });
});

server.listen(3200, () => {
  console.log('Server listening on port 3200');
});
