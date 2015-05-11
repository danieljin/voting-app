/*jslint unparam: true, regexp: true, nomen: true, plusplus: true */
/*global io, $, document, location, addHiddenVote, removeVoter, removeVote, removeVotes, revealVotes, hideVotes, changeVoteType, flip */

var socket = io(), adminOnly = false;

// Socket functions
socket.on('roominfo', function (data) {
    'use strict';
    $('#loading').fadeOut('slow');
    var i, len;
    for (i = 0, len = data.users.length; i < len; i++) {
        if (data.users[i].id == socket.id) {
            $('#hidden .usershape').first().clone().addClass('me').data('userId', socket.id).appendTo('#container').show();
            var localName = localStorage.getItem('name');
            if (localName) {
                setName(socket.id, localName);
                socket.emit('setName', localName);
            }
            $('.me .name').prop('contenteditable', true).blur(function(e) {
                socket.emit('setName', $(e.target).html());
                localStorage.setItem("name", $(e.target).html());
            });
            $(".me .name").keyup(function(e) {
                if (e.keyCode == 13) {
                    $(".me .name").blur();
                };
            });
        } else {
            $('#hidden .usershape').first().clone().data('userId', data.users[i].id).appendTo('#container').show();
            if (data.users[i].vote) {
                addHiddenVote(data.users[i].id);
            }
            if (data.users[i].name) {
                setName(data.users[i].id, data.users[i].name);
            }
        }
    }

    if (data.users.length === 1 || adminOnly === false) {
        $('#reset').removeClass('hidden');
        $('#reveal').removeClass('hidden');
        $('.toggle').removeClass('hidden');
    }

    $('#roomNumber').html(decodeURIComponent(data.number));

    changeVoteType(data.type);
});
socket.on('reconnecting', function () {
    'use strict';
    socket.io.reconnection(false);
    location.reload();
});
socket.on('joined', function (data) {
    'use strict';
    if (data.userId !== socket.id) {
        $('#hidden .usershape').first().clone().data('userId', data.userId).appendTo('#container').fadeIn();
        hideVotes();
    }
});
socket.on('left', function (data) {
    'use strict';
    removeUser(data.userId);
});
socket.on('voted', function (data) {
    'use strict';
    addHiddenVote(data.userId);
});
socket.on('removeVote', function (data) {
    'use strict';
    removeVote(data.userId);
});
socket.on('removeVotes', function (data) {
    'use strict';
    removeVotes();
});
socket.on('reveal', function (data) {
    'use strict';
    revealVotes(data.votes);
});
socket.on('change', function (data) {
    'use strict';
    changeVoteType(data);
});

socket.on('ping', function(data){
  socket.emit('pong', {beat: 1});
});

socket.on('named', function(data){
  setName(data.userId, data.name);
});

// Helper Functions

// this can be improved to not loop through unvoted cards
function addHiddenVote(userId) {
    'use strict';
    if (socket.id === userId) {
        $('.usershape.me').addClass('voted');
        flip($('.usershape.me'), 'back');
        $('.usershape.me .back a').removeClass('hidden');
        $('.usershape.me .corner').click(function (e) {
            socket.emit('removeVote');
        });
        return false;
    }
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).addClass('voted');
            flip($(this), 'back');
        }
    });
}

function removeUser(userId) {
    'use strict';
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).remove();
        }
    });
}

function removeVote(userId) {
    'use strict';
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).removeClass('voted');
            flip(this, 'front');
            if (socket.id === userId) {
                $(this).find('a').addClass('hidden');
                $('.item').removeClass('active');
            }
        }
    });
}

function removeVotes() {
    'use strict';
    $('#container .usershape').each(function (index) {
        $(this).removeClass('voted').find('h3').html('');
        flip(this, 'front');
        $('.item').removeClass('disabled active');
        $('#reveal').removeClass('disabled');
    });
}

function hideVotes() {
    'use strict';
    $('#container .usershape').each(function (index) {
        $(this).find('h3').html('');
        if ($(this).hasClass('voted')) {
            flip(this, 'back');
        } else {
            flip(this, 'front');
        }
        $('.item').removeClass('disabled active');
        $('#reveal').removeClass('disabled');
    });
}

function revealVotes(votes) {
    'use strict';
    var i;
    $('.usershape:data(userId)').each(function () {
        for (i = votes.length - 1; i >= 0; i--) {
            if ($(this).data('userId') === votes[i].id) {
                if (votes[i].vote === 'up') {
                    $(this).find('h3').html("<i class='thumbs outline up icon'></i>");
                } else if (votes[i].vote === 'sideways') {
                    $(this).find('h3').html("<i class='counterclockwise rotated thumbs outline down icon'></i>");
                } else if (votes[i].vote === 'down') {
                    $(this).find('h3').html("<i class='thumbs outline down icon'></i>");
                } else {
                    $(this).find('h3').html(votes[i].vote);
                }
                flip(this, 'front');
            }
        }
    });

    $('.item').addClass('disabled');
    $('#reveal').addClass('disabled');
}

function changeVoteType(type) {
    'use strict';
    if (type === 'poker') {
        $('#roman').addClass('hidden');
        $('#poker').removeClass('hidden');
        $('input#toggle').prop("checked", false);
    } else {
        $('#poker').addClass('hidden');
        $('#roman').removeClass('hidden');
        $('input#toggle').prop("checked", true);
    }
}

function flip(selector, side) {
    'use strict';
    if (!$(selector).find('.active').hasClass(side)) {
        $(selector).find('.' + side).show().addClass('active').siblings().hide().removeClass('active');
    }
}

function setName(userId, name) {
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).find('.name').html(name);
        }
    });
}

// On Page Load
$(function () {
    'use strict';
    $('#poker .item').click(function (e) {
        socket.emit('addVote', $(this).html());
        $(this).addClass('active').siblings().removeClass('active');
    });
    $('#roman .item').click(function (e) {
        var icon = $(this).find('i');
        if (icon.hasClass('up')) {
            socket.emit('addVote', 'up');
        } else if (icon.hasClass('rotated')) {
            socket.emit('addVote', 'sideways');
        } else {
            socket.emit('addVote', 'down');
        }
        $(this).addClass('active').siblings().removeClass('active');
    });
    $('#reset').click(function (e) {
        socket.emit('reset');
    });
    $('#reveal').click(function (e) {
        socket.emit('reveal');
    });
    $('i.reply').click(function () {
        document.location.href = '/home';
    });
    $('.ui.checkbox').checkbox();

    $('#toggle').change(function (e) {
        if ($(this).is(':checked')) { // check if the radio is checked
            socket.emit('change', 'roman');
        } else {
            socket.emit('change', 'poker');
        }
    });
});
