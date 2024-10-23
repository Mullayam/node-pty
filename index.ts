import * as pty from 'node-pty';
import * as os from 'os';
import * as wsSocket from 'socket.io'

const PORT = 7555
export let io: wsSocket.Server

const SocketServer = async () => {
    io = new wsSocket.Server({
        // transports:["polling"],
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
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

    io.listen(PORT);
    console.log('sTerm server is running on ws://localhost:'+PORT);
    return io
}
SocketServer()
