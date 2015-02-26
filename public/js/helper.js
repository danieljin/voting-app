/*jslint unparam: true, regexp: true, nomen: true, plusplus: true */
/*global io, $, document, addHiddenVote, removeVoter, removeVote, removeVotes, revealVotes, hideVotes, flip */

// Socket functions
var socket = io();

socket.on('roominfo', function (data) {
    'use strict';
    $("#loading").fadeOut("slow");
    var i, len;
    for (i = 0, len = data.userCount; i < len; i++) {
        if (i === 0) {
            $('#hidden .usershape').first().clone().addClass('me').appendTo('#container').show();
        } else {
            $('#hidden .usershape').first().clone().appendTo('#container').show();
        }
    }
    $('#roomNumber').html(data.number);
    if (data.voters.length > 0) {
        for (i = 0, len = data.voters.length; i < len; i++) {
            addHiddenVote(data.voters[i]);
        }
    }
});
socket.on('joined', function () {
    'use strict';
    $('#hidden .usershape').first().clone().appendTo('#container').fadeIn();
    hideVotes();
});
socket.on('left', function (data) {
    'use strict';
    removeVoter(data.userId);
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

// Helper Functions

// this can be improved to not loop through unvoted cards
function addHiddenVote(userId) {
    'use strict';
    if (socket.id === userId) {
        $('.usershape.me').data('userId', userId).addClass('voted');
        flip($('.usershape.me'), 'back');
        $('.usershape.me .back a').removeClass('hidden');
        $('.usershape.me .close').click(function (e) {
            socket.emit('removeVote');
        });
        return false;
    }
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            return false;
        }
        if ($('#container .usershape').length - 1 === index) {
            var chosenOne = $('#container .usershape:not(.voted):not(.me)').first();
            chosenOne.data('userId', userId).addClass('voted');
            flip(chosenOne, 'back');
        }
    });
}

function removeVoter(userId) {
    'use strict';
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).remove();
            return false;
        }
        if ($('#container .usershape').length - 1 === index) {
            $('#container .usershape:not(.voted):not(.me)').last().remove();
        }
    });
}

function removeVote(userId) {
    'use strict';
    $('#container .usershape').each(function (index) {
        if ($(this).data('userId') === userId) {
            $(this).removeData('userId').removeClass('voted');
            flip(this, 'front');
            if (socket.id === userId) {
                $(this).find('a').addClass('hidden');
                $('#buttons .item').removeClass('active');
            }
        }
    });
}

function removeVotes() {
    'use strict';
    $('#container .usershape').each(function (index) {
        $(this).removeData('userId').removeClass('voted').find('h3').html('');
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
                $(this).find('h3').html(votes[i].vote);
                flip(this, 'front');
            }
        }
    });

    $('.item').addClass('disabled');
    $('#reveal').addClass('disabled');
}

function flip(selector, side) {
    'use strict';
    if (!$(selector).find('.active').hasClass(side)) {
        $(selector).find('.' + side).show().addClass('active').siblings().hide().removeClass('active');
    }
}

// On Page Load
$(function () {
    'use strict';
    $('.item').click(function (e) {
        e.stopImmediatePropagation();
        socket.emit('addVote', $(this).html());
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
});
