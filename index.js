/*jslint unparam: true, regexp: true, nomen: true, plusplus: true, es5: true */
/*global require, __dirname, console, process */

var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var rooms = [];

app.use(express.static(__dirname + '/public'));

app.get('/favicon.ico', function (req, res) {
    'use strict';
    res.writeHead(200, {'Content-Type': 'image/x-icon'});
    res.end();
    return;
});

app.get('/:var(home)?', function (req, res) {
    'use strict';
    res.sendFile(__dirname + '/welcome.html');
});

app.get('/:room', function (req, res) {
    'use strict';
    res.sendFile(__dirname + '/room.html');
});

// Helper Functions
function updateRooms(room, userId) {
    'use strict';
    if (rooms.length === 0) {
        rooms.push({id: room, revealed: false, type: 'poker', users: [{id: userId, vote: null}]});
    } else {
        var i;
        for (i = rooms.length - 1; i >= 0; i--) {
            if (room === rooms[i].id) {
                rooms[i].users.push({id: userId, vote: null});
                return;
            }
            if (i === 0) {
                rooms.push({id: room, revealed: false, type: 'poker', users: [{id: userId, vote: null}]});
            }
        }
    }
}

function removeRoom(room) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            rooms.splice(i, 1);
        }
    }
}

function setRoomType(room, type) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            rooms[i].type = type;
        }
    }
}

function getRoomType(room) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            return rooms[i].type;
        }
    }
}

function getRoomCount(room) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            return rooms[i].users.length;
        }
    }
}

function getRoomVoters(room) {
    'use strict';
    var i, j, users, voters;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            voters = [];
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].vote) {
                    voters.push(users[j].id);
                }
            }
            return voters;
        }
    }
}

function removeRoomUsers(room, userId) {
    'use strict';
    var i, j, users;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].id === userId) {
                    rooms[i].users.splice(j, 1);
                }
            }
        }
    }
}

function inRoom(room, userId) {
    'use strict';
    var i, j, users;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].id === userId) {
                    return true;
                }
            }
            return false;
        }
    }
}

function setVote(room, userId, vote) {
    'use strict';
    var i, j, users;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].id === userId) {
                    rooms[i].users[j].vote = vote;
                }
            }
        }
    }
}

function removeVote(room, userId) {
    'use strict';
    setVote(room, userId, null);
}

function removeVotes(room) {
    'use strict';
    var i, j, users;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            for (j = users.length - 1; j >= 0; j--) {
                rooms[i].users[j].vote = null;
            }
        }
    }
}

function allVoted(room) {
    'use strict';
    var i, j, users, voters;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            voters = [];
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].vote) {
                    voters.push(users[j].id);
                }
            }
            return users.length === voters.length;
        }
    }
}

function setRevealed(room, setter) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            rooms[i].revealed = setter;
        }
    }
}

function getRevealed(room) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            return rooms[i].revealed;
        }
    }
}

function getUsers(room) {
    'use strict';
    var i;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            return rooms[i].users;
        }
    }
}

function emitToExcept(io, room, userId, message) {
    'use strict';
    var i, j, users;
    for (i = rooms.length - 1; i >= 0; i--) {
        if (room === rooms[i].id) {
            users = rooms[i].users;
            for (j = users.length - 1; j >= 0; j--) {
                if (users[j].id !== userId) {
                    io.to(users[j].id).emit(message);
                }
            }
        }
    }
}

io.on('connection', function (socket) {
    'use strict';

    io.set("heartbeat timeout", 10000);
    io.set("heartbeat interval", 5000);

    // Gets room number from URL
    var room = socket.handshake.headers.referer.split('/').slice(-1)[0].toLowerCase();

    socket.join(room);

    updateRooms(room, socket.id);
    setRevealed(room, false);

    // emit roominfo
    io.to(socket.id).emit('roominfo', {number: room, type: getRoomType(room), userCount: getRoomCount(room), voters: getRoomVoters(room)});
    // emit joined
    emitToExcept(io, room, socket.id, 'joined');

    socket.on('create', function () {
        room = Math.floor(Math.random() * 90000) + 10000;
        // redirect to url/:room
    });

    socket.on('disconnect', function () {
        removeRoomUsers(room, socket.id);
        io.to(room).emit('left', {userId: socket.id});
        if (getRoomCount(room) === 0) {
            removeRoom(room);
        } else {
            if (allVoted(room)) {
                // only reveal once
                if (!getRevealed(room)) {
                    io.to(room).emit('reveal', {votes: getUsers(room)});
                }
                setRevealed(room, true);
            }
        }
    });

    socket.on('addVote', function (vote) {
        setVote(room, socket.id, vote);
        // emit vote and id
        io.to(room).emit('voted', {userId: socket.id});

        // if everyone voted, reveal
        if (allVoted(room)) {
            // only reveal once
            if (!getRevealed(room)) {
                io.to(room).emit('reveal', {votes: getUsers(room)});
            }
            setRevealed(room, true);
        }
    });

    socket.on('removeVote', function () {
        removeVote(room, socket.id);
        io.to(room).emit('removeVote', {userId: socket.id});
    });

    socket.on('reset', function () {
        removeVotes(room);
        setRevealed(room, false);
        io.to(room).emit('removeVotes');
    });

    socket.on('reveal', function () {
        io.to(room).emit('reveal', {votes: getUsers(room)});
    });

    socket.on('change', function (data) {
        setRoomType(room, data);
        removeVotes(room);
        setRevealed(room, false);
        io.to(room).emit('removeVotes');
        io.to(room).emit('change', getRoomType(room));
    });
});
var port = process.env.PORT || 3000;
http.listen(port, function () {
    'use strict';
    console.log('listening on *:' + port);
});
