import { Socket } from 'socket.io';
import { Client, ClientChannel } from 'ssh2';
const conn = new Client();
export enum SOCKET_EVENTS {
    SSH_CONNECT = 'SSH_CONNECT',
    SSH_EMIT_RESIZE = 'SSH_EMIT_RESIZE',
    SSH_INPUT = 'SSH_INPUT',
    SSH_DATA = 'SSH_DATA',
    SSH_ERROR = 'SSH_ERROR',
    LOADING = 'LOADING',
    STATUS = 'STATUS',
}
let TerminalSize = {
    cols: 150,
    rows: 40
}
export const SSH_CONNECT = (socket: Socket) => {
    console.log("SSH Service Working")
    socket.on(SOCKET_EVENTS.SSH_CONNECT, function (data) {
        const host = data.host;
        const username = data.username;
        const sshOptions = data.authMethod === 'password' ? { password: data.password } : { privateKey: data.privateKey };
        conn.on('ready', () => {
            socket.emit(SOCKET_EVENTS.LOADING, false);
            conn.shell({ cols: TerminalSize.cols, rows: TerminalSize.rows, term: 'xterm-256color' }, (err: any, stream: ClientChannel) => {
                if (err) {
                    socket.emit(SOCKET_EVENTS.SSH_ERROR, 'Error opening shell.');
                    return;
                }
                socket.on(SOCKET_EVENTS.SSH_INPUT, (data: string) => {
                    stream.write(data);
                });
                socket.on(SOCKET_EVENTS.SSH_EMIT_RESIZE, (size: any) => {
                    TerminalSize.cols = size.cols;
                    TerminalSize.rows = size.rows;
                    stream.setWindow(size.cols, size.rows, 1280, 720)
                })

                stream.on('data', (data: any) => {
                    socket.emit(SOCKET_EVENTS.SSH_DATA, data.toString('utf-8'));
                });
                stream.on('close', () => {
                    conn.end();
                    socket.emit(SOCKET_EVENTS.STATUS, 'SSH connection closed.');
                });
            });
        }).connect({
            host,
            port: 22,
            username,
            ...sshOptions
        });
    })


    // Clean up the connection when the socket disconnects
    socket.on('disconnect', () => {
        if (conn) conn.end();
        console.log('Client disconnected');

    });
}