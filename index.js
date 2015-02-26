var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var rooms = [];

app.use(express.static(__dirname + '/public'));

app.get('/favicon.ico', function(req, res){
  res.writeHead(200, {'Content-Type': 'image/x-icon'} );
  res.end();
  return;
});

app.get('/:var(home)?', function(req, res){
  res.sendFile(__dirname + '/welcome.html');
});

app.get('/:room', function(req, res){
  res.sendFile(__dirname + '/room.html');
});

function updateRooms(room, userId){
  if (rooms.length == 0) {
    rooms.push({id:room, revealed:false, users:[{id:userId, vote:null}]});
  } else {
    for (var i = rooms.length - 1; i >= 0; i--) {
      if ( room == rooms[i].id){
        rooms[i].users.push({id:userId, vote:null});
        return;
      } else {
        if (i == 0) {
          rooms.push({id:room, revealed:false, users:[{id:userId, vote:null}]});
        }
      }
    }
  }
}

function removeRoomUsers(room, userId){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].id == userId) {
          rooms[i].users.splice(j,1);
        }
      };
    }
  }
};

function getRoomCount(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      return rooms[i].users.length;
    }
  }
}

function getRoomVoters(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      var voters = [];
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].vote) {
          voters.push(users[j].id);
        }
      };
      return voters;
    }
  }
}

function addVote(room, userId, vote){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].id == userId) {
          rooms[i].users[j].vote = vote;
        }
      };
    }
  }
}

function removeVote(room, userId){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
        rooms[i].users[j].vote = null;
      };
    }
  }
}

function removeVotes(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
          rooms[i].users[j].vote = null;
      };
    }
  }
}

function inRoom(room, userId){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].id == userId) {
          return true;
        }
      };
      return false;
    }
  }
}

function setRevealed(room, setter){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      rooms[i].revealed = setter;
    }
  }
}

function getRevealed(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      return rooms[i].revealed;
    }
  }
}

function getUsers(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      return rooms[i].users;
    }
  }
}

function allVoted(room){
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      var voters = [];
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].vote) {
          voters.push(users[j].id);
        }
      };
      return users.length == voters.length;
    }
  }
}

function emitToExcept(io, room, userId) {
  for (var i = rooms.length - 1; i >= 0; i--) {
    if ( room == rooms[i].id){
      var users = rooms[i].users;
      for (var j = users.length - 1; j >= 0; j--) {
        if (users[j].id != userId) {
          io.to(users[j].id).emit('joined');
        }
      };
    }
  }
}

io.on('connection', function(socket){
  var url = socket.handshake.headers.referer;
  var room = url.split('/').slice(-1)[0];
  // join room
  socket.join(room);

  updateRooms(room, socket.id);
  setRevealed(room, false);

  // emit roominfo
  io.to(socket.id).emit('roominfo', {number: room, userCount: getRoomCount(room), voters: getRoomVoters(room)});
  // emit joined
  emitToExcept(io, room, socket.id);

  socket.on('create', function(){
    room = Math.floor(Math.random()*90000) + 10000;
    // redirect to url/:room
  });

  socket.on('disconnect', function(){
    removeRoomUsers(room, socket.id);
    io.to(room).emit('left', {userId: socket.id});
    if (allVoted(room)){
      // only reveal once
      if (!getRevealed(room)){
        io.to(room).emit('reveal', {votes: getUsers(room)});
      }
      setRevealed(room, true);
    }
  });

  socket.on('addVote', function(vote){
    addVote(room, socket.id, vote);
    // emit vote and id
    io.to(room).emit('voted', {userId: socket.id});

    // if everyone voted, reveal
    if (allVoted(room)){
      // only reveal once
      if (!getRevealed(room)){
        io.to(room).emit('reveal', {votes: getUsers(room)});
      }
      setRevealed(room, true);
    }
  });

  socket.on('removeVote', function(){
    removeVote(room, socket.id);
    // remove vote and id
    io.to(room).emit('removeVote', {userId: socket.id});
  });

  socket.on('reset', function(){
    removeVotes(room);
    setRevealed(room, false);
    io.to(room).emit('removeVotes');
  });

  socket.on('reveal', function(){
    io.to(room).emit('reveal', {votes: getUsers(room)});
  });
});
var port = process.env.PORT || 3000;
http.listen(port, function(){
  console.log('listening on *:' + port);
});
