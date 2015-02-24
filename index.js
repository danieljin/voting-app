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

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/:room', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function updateRooms(room, userId){
  if (rooms.length == 0) {
    rooms.push({id:room, users:[{id:userId, vote:null}]});
  } else {
    for (var i = rooms.length - 1; i >= 0; i--) {
      if ( room == rooms[i].id){
        rooms[i].users.push({id:userId, vote:null});
      } else {
        if (i == 0) {
          rooms.push({id:room, users:[{id:userId, vote:null}]});
        }
      }
    }
  }
};

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
};

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
};

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
};

io.on('connection', function(socket){
  var url = socket.handshake.headers.referer;
  var room = url.split('/').slice(-1)[0];

  updateRooms(room, socket.id);

  // join room
  socket.join(room);
  // emit roominfo
  io.to(socket.id).emit('roominfo', {number: room, userCount: getRoomCount(room) - 1, voters: getRoomVoters(room)});
  // emit joined
  io.to(room).emit('joined');

  socket.on('create', function(){
    room = Math.floor(Math.random()*90000) + 10000;
    // redirect to url/:room
  });

  socket.on('disconnect', function(){
    io.to(room).emit('left', {userId: socket.id});
    removeRoomUsers(room, socket.id);
  });

  socket.on('addVote', function(data){
    addVote(room, socket.id, data);
    // emit vote and id
    io.to(room).emit('voted', {userId: socket.id});

    // if everyone voted, reveal
  });

  socket.on('removeVote', function(data){
    addVote(room, socket.id, data);
    // emit vote and id
    io.to(room).emit('voted', {userId: socket.id, vote: 'add'});

    // if everyone voted, reveal
  });

  socket.on('reveal', function(){
    // emit all votes
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
