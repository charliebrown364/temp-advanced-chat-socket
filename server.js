var io = require('socket.io');
var socket = io.listen(8000, '1.2.3.4');
var Room = require('./room.js');
var uuid = require('node-uuid');

socket.set('log level', 1);
var people = {};
var rooms = {};
var clients = [];

socket.on("connection", (client) => {
    client.on("join", (name) => {
        let roomID = null;
        people[client.id] = {"name" : name, "room" : roomID};
        client.emit("update", "You have connected to the server.");
        socket.sockets.emit("update", people[client.id].name + " is online.")
        socket.sockets.emit("update-people", people);
        client.emit("roomList", {rooms: rooms});
        clients.push(client); // populate the clients array with the client object
    });
})

// https://tpiros.dev/blog/advanced-chat-using-node-js-and-socket-io-episode-1/