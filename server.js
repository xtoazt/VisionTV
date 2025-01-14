const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let channels = { 1: null, 2: null };

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a channel
    socket.on('joinChannel', (channel, callback) => {
        if (!channels[channel]) {
            channels[channel] = socket.id;
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Channel is occupied.' });
        }
    });

    // Handle leaving a channel
    socket.on('leaveChannel', (channel) => {
        if (channels[channel] === socket.id) {
            channels[channel] = null;
        }
    });

    // Handle signaling data
    socket.on('signal', (data) => {
        const { to, signal } = data;
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        const { channel, message } = data;
        io.emit(`chat-${channel}`, { user: socket.id, message });
    });

    socket.on('disconnect', () => {
        Object.keys(channels).forEach((channel) => {
            if (channels[channel] === socket.id) {
                channels[channel] = null;
            }
        });
        console.log('A user disconnected:', socket.id);
    });
});

app.use(express.static('public'));
server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
