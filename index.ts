import * as pty from 'node-pty';
import * as os from 'os';
import * as wsSocket from 'socket.io'
import express from 'express'
import http from 'http';
import { SSH_CONNECT } from './ssh';
import { createHandlers } from '@enjoys/exception'
const app = express();
const server = http.createServer(app);
const { UnhandledRoutes, ExceptionHandler } = createHandlers()
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
        SSH_CONNECT(socket)
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 200,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env,
        });
        socket.on("@@SSH_EMIT_RESIZE", (size: any) => ptyProcess.resize(size.cols, size.rows))

        socket.on("@@SEND_COMMAND", data => ptyProcess.write(data))
        ptyProcess.onData((data) => socket.emit("@@RECIEVE_COMMAND", data));
        socket.on("disconnect", () => {
            ptyProcess.kill();
        });
    });

    server.listen(PORT);
    console.log('Terminal server is running on http://localhost:' + PORT);
    return io
}
app.get("*", (req, res) => {
    res.send("Hello")
})
app.use(UnhandledRoutes)
app.use(ExceptionHandler)
SocketServer()
