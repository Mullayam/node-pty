import { Socket } from 'socket.io';
import { Client } from 'ssh2';
const conn = new Client();
export enum SOCKET_EVENTS {
    SSH_CONNECT = 'SSH_CONNECT',
    SSH_INPUT = 'SSH_INPUT',
    SSH_DATA = 'SSH_DATA',
    SSH_ERROR = 'SSH_ERROR',
    LOADING = 'LOADING',
    STATUS = 'STATUS',
}
 export const SSH_CONNECT = (socket:Socket)=>{
console.log("SSH Service Working")
    socket.on(SOCKET_EVENTS.SSH_CONNECT, function (data) {
        const host = data.host;
        const username = data.username;
        const sshOptions = data.authMethod === 'password' ? { password: data.password } : { privateKey: data.privateKey };
        conn.on('ready', () => {
            socket.emit(SOCKET_EVENTS.LOADING, false);
            conn.shell({ cols: 150, rows: 40, term: 'xterm-256color' }, (err: any, stream: any) => {
                if (err) {
                    socket.emit(SOCKET_EVENTS.SSH_ERROR, 'Error opening shell.');
                    return;
                }              
                socket.on(SOCKET_EVENTS.SSH_INPUT, (data: string) => {
                    stream.write(data);
                });
               
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