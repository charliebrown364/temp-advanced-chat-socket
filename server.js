import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import Room from './room.js';

const app = createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Hello World!');
    res.end();
}).listen(3000);

const io = new Server(app);

const people = {};
const rooms = {};
const sockets = [];

io.on("connection", (socket) => {
    
    socket.on("join", (name) => {
        
        let roomID = null;
        people[socket.id] = {"name": name, "room": roomID};
        
        socket.emit("update", "You have connected to the server.");
        io.emit("update", `${people[socket.id].name} is online.`)
        io.emit("update-people", people);
        socket.emit("roomList", {rooms: rooms});

        sockets.push(socket);
    
    });

    socket.on('createRoom', (name) => {

        if (people[socket.id].room === null) {

            let id = uuidv4();
            
            let room = new Room(name, id, socket.id);
            rooms[id] = room;
            
            io.emit('roomList', { rooms: rooms });
            
            socket.room = name;
            socket.join(socket.room); 
            room.addPerson(socket.id);

            people[socket.id].room = id;
        
        } else {
            io.emit('update', 'You have already created a room.');
        }

    });

    socket.on('joinRoom', (id) => {

        const room = rooms[id];

        if (socket.id === room.owner) {
            socket.emit('update', 'You are the owner of this room and you have already been joined.');
        } else {

            room.people.contains(socket.id, (found) => {

                if (found) socket.emit('update', 'You have already joined this room.');
                
                else {
                    
                    if (people[socket.id].inroom !== null) {
                        socket.emit('update', `You are already in a room (${rooms[people[socket.id].inroom].name}), please leave it first to join another room.`);
                    } else {

                        room.addPerson(socket.id);
                        people[socket.id].inroom = id;
                        
                        socket.room = room.name;
                        socket.join(socket.room);
                        
                        io.in(socket.room).emit('update', `${people[socket.id].name} has connected to ${room.name} room.`);
                        socket.emit('update', `Welcome to ${room.name}.`);
                        socket.emit('sendRoomID', { id: id });

                    }

                }

            });
        }
    });

    socket.on('send', (msg) => {
        if (io.manager.roomClients[socket.id][`/${socket.room}`] !== undefined) {
            io.in(socket.room).emit('chat', people[socket.id], msg);
        } else {
            socket.emit('update', 'Please connect to a room.');
        }
    });

    socket.on('leaveRoom', (id) => {
        
        const room = rooms[id];
        
        if (socket.id === room.owner) {

            for (let i = 0; i < sockets.length; i++) {
                if (sockets[i].id == room.people[i]) {
                    people[sockets[i].id].inroom = null;
                    sockets[i].leave(room.name);
                }
            }
            
            delete rooms[id];
            people[room.owner].owns = null;
            
            io.emit('roomList', { rooms: rooms });
            io.in(socket.room).emit('update', `The owner (${user.name}) is leaving the room. The room is removed.`);

        } else {

            room.people.contains(socket.id, (found) => {
                if (found) {
                    room.people.splice(room.people.indexOf(socket.id), 1);
                    io.emit('update', `${people[socket.id].name} has left the room.`);
                    socket.leave(room.name);
                }
            });

        }

    });

    socket.on('removeRoom', (id) => {
        
        const room = rooms[id];
        
        if (room) {

            if (socket.id === room.owner) {
                            
                if (room.people.length > 2) {
                    console.log('there are still people in the room warning');
                } else if (socket.id === room.owner) {
                        
                    io.in(socket.room).emit('update', `The owner (${people[socket.id].name}) removed the room.`);
                    
                    for (let i = 0; i < sockets.length; i++) {
                        if (sockets[i].id === room.people[i]) {
                            people[sockets[i].id].inroom = null;
                            sockets[i].leave(room.name);
                        }
                    }

                    delete rooms[id];
                    people[room.owner].owns = null;
                    io.emit('roomList', { rooms: rooms });

                }

            } else {
                socket.emit('update', 'Only the owner can remove a room.');
            }
        }

    });

    socket.on('disconnect', () => {

        if (people[socket.id]) {

            if (people[socket.id].inroom === null) {

                io.emit('update', `${people[socket.id].name} has left the server.`);
                delete people[socket.id];
                io.emit('update-people', people);

            } else {
                
                if (people[socket.id].owns !== null) {

                    const room = rooms[people[socket.id].owns];

                    if (socket.id === room.owner) {
                        
                        for (let i = 0; i < sockets.length; i++) {
                            if (sockets[i].id === room.people[i]) {
                                people[sockets[i].id].inroom = null;
                                sockets[i].leave(room.name);
                            }
                        }

                        delete rooms[people[socket.id].owns];

                    }

                }

                io.emit('update', `${people[socket.id].name} has left the server.`);
                delete people[socket.id];
                io.emit('update-people', people);
                io.emit('roomList', { rooms: rooms });

            }
        }
    });
      
    
});

Array.prototype.contains = (k, callback) => {
    let self = this;
    return (function check(i) {
        if (i >= self.length) return callback(false);
        if (self[i] === k) return callback(true);
        return process.nextTick(check.bind(null, i + 1));
    })(0);
};

// https://tpiros.dev/blog/advanced-chat-using-node-js-and-socket-io-episode-1/