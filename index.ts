import * as pty from 'node-pty';
import * as os from 'os';
import * as wsSocket from 'socket.io'
import express from 'express'
import http from 'http';

const app = express();
const server = http.createServer(app);

const PORT = 7555
export let io: wsSocket.Server


const SocketServer = async () => {
    io = new wsSocket.Server(server, {
        transports: ["polling"],
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket: wsSocket.Socket) => {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });
        ptyProcess.onData((data) => {
            socket.emit("@@RECIEVE_COMMAND", data);
        });
        socket.on("@@SEND_COMMAND", data => ptyProcess.write(data))
        socket.on("disconnect", () => {
            ptyProcess.kill();
        });
    });
    app.get("*", (req, res) => {
        res.send("Hello")
    })
    server.listen(PORT);
    console.log('Terminal server is running on http://localhost:' + PORT);
    return io
}
SocketServer()
