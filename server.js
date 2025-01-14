const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Channel and users state
let channel = null; // Holds the broadcaster's socket ID
let chatMessages = []; // Stores chat history for the session
let userCount = 0; // Tracks the number of users for naming purposes
let users = {}; // Maps socket IDs to user names

io.on('connection', (socket) => {
    userCount++;
    const userName = `User ${userCount}`;
    users[socket.id] = userName;
    console.log(`${userName} connected:`, socket.id);

    // Send chat history and user name to the newly connected user
    socket.emit('chatHistory', { chatMessages, userName });

    // Handle channel join request
    socket.on('joinChannel', (callback) => {
        if (!channel) {
            channel = socket.id; // Assign the channel to this user
            callback({ success: true, role: 'broadcaster' });
        } else {
            callback({ success: true, role: 'viewer', broadcaster: channel });
        }
    });

    // Handle signaling data for WebRTC
    socket.on('signal', (data) => {
        const { to, signal } = data;
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Handle chat messages
    socket.on('chatMessage', (message) => {
        const chatEntry = { user: users[socket.id], message };
        chatMessages.push(chatEntry); // Save message to session history
        io.emit('chat', chatEntry); // Broadcast the chat message to all users
    });

    // Cleanup when a user disconnects
    socket.on('disconnect', () => {
        console.log(`${users[socket.id]} disconnected:`, socket.id);

        if (channel === socket.id) {
            channel = null; // Clear the channel if the broadcaster disconnects
            console.log('Broadcaster left. Channel is now free.');
        }

        delete users[socket.id]; // Remove user from the list
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
