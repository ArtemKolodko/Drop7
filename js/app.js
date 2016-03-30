var app = app || {};

var DROP_TIMEOUT = 200; //300
var GRAVITY_TIMEOUT = 600; //500 - 900
var NEXT_CHAIN_TIMEOUT = 400; // 500
var START_TIMEOUT = 100; // 800
var NEXT_LEVEL_TIMEOUT = 700; // 800
var GAME_OVER_TIMEOUT = 1000;
var CLOSED_DIGIT_CHANCE = 0.27;

$.fn.extend({
    animateCss: function (animationName, animationEndCallback, data) {
        var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
        $(this).addClass('animated ' + animationName).one(animationEnd, function() {
            $(this).removeClass('animated ' + animationName);
            if(animationEndCallback) {
                animationEndCallback($(this), data);
            }
        });
    }
});

$(document).ready(function() {

    app.best = {
        score: 0
    };

    app.setBest = function(type, data) {
        switch(type) {
            case 'score': app.best.score = data; break;
            default: break;
        }
        localStorage.setItem('best_'+type, data);
    };

    app.readBest = function() {
        if(localStorage.getItem('best_score')) {
            app.best.score = parseInt(localStorage.getItem('best_score'));
        }
    };

    app.startVariants = ['0|2_0|7_0|5_2|6_3|3_3|7_5|4_6|6_6|4_n|5']; // _+5

    var startPlacement = localStorage.getItem('last_game') || app.startVariants[0];

    app.readBest();

    app.game = new Game({start: startPlacement}); // {start: '04_04_02'}
})