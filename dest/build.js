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

    app.startVariants = ['0|2|2_0|7_0|5_2|6_3|3_3|7|2_5|4_6|6_6|4_n|5']; // _+5

    var startPlacement = localStorage.getItem('last_game') || app.startVariants[0];

    app.readBest();

    app.game = new Game({start: startPlacement}); // {start: '04_04_02'}
})
function Digit(row, col, value, opened) {
    if(typeof row =='object') {
        this.value = row.value || 1;
        this.opened = row.opened || 0; // 0 - opened, 1 - semi-opened, 2 - closed
        this.r = row.r;
        this.c = row.c
    } else {
        this.value = value || 1;
        this.opened = opened || 0; // 0 - opened, 1 - semi-opened, 2 - closed
        this.r = row;
        this.c = col
    }



    this.view = function() {
        if(this.opened == 0) {
            return '<div data-digit="'+ this.value+'" class="cell-content numberCircle numberCircle_'+ this.value+'"></div>'
        } else {
            return '<div class="cell-content numberCircle numberCircle_hidden_'+ this.opened+'"></div>'
        }
    }

    this.class = function() {
        if(this.opened == 0) {
            return 'cell-content numberCircle numberCircle_'+ this.value;
        } else {
            return 'cell-content numberCircle numberCircle_hidden_'+ this.opened;
        }
    }
    
}


function Field(width, height) {
    this.width = width || 7;
    this.height = height || 7;
    this.map = [];
}

Field.prototype.initField = function(data, callback){
    if(data && data.random) {
        this.map = [];

        for(var i=0; i < this.width; i++) {
            this.map[i] = [];
            for(var j=0; j < this.height; j++) {
                this.map[i][j] = null;
            }
        }
    }

    if(callback) {
        callback(this);
    }
};

Field.prototype.serialize = function() {
    var str = '';
    this.eachCell(function(cell, x, y) {
        if(str.length > 0) str += '_';
        if(cell) str += x+'|'+cell.value.toString()+'|'+cell.opened.toString();
    });
    return str;
};

Field.prototype.pushDigit = function(digit, callback) {
    //digit.c
    for(var r = this.map[digit.c].length-1; r >= 0 ; r--) {
        if(this.map[digit.c][r] == null) {
            digit.r = r;
            this.map[digit.c][r] = new Digit(digit);
            break;
        }
    }

    if(callback) {
        callback(digit);
    }
};

Field.prototype.digitsForDrop = function() {
    var digits = [];
    var self = this;
    this.eachCell(function(cell) {
        var cross = self.neighbourCross(cell);

        if(cell.opened == 0 && (cross.hor == cell.value || cross.ver == cell.value)) {
            digits.push(new Digit(cell));
        }

    });

    return digits;
};

Field.prototype.getRandomDigit = function(data) {
    var digit = {
        r: typeof data.row != 'undefined' ? data.row : 1,
        c: typeof data.col != 'undefined' ? data.col : 1,
        value:  Math.round(Math.random()* 6 + 1), // Math.round(Math.random()* 6 + 1)
        opened: typeof data.opened != 'undefined' ? data.opened : Math.random() < 0.2 ? 2 : 0// default 0 //  Math.random() < 0.2 ? 2 : 0
    };

    return new Digit(digit);
};

Field.prototype.proceedNextLevelShift = function() {
    var shifted = [];
    var outOfBounds = [];
    var newDigits = [];

    var self = this;
    this.eachCell(function(cell, r, c) {
        // shift cell to top
        if(cell) {
            self.map[cell.c][cell.r] = null;
            cell.r = cell.r - 1;

            if(self.checkBounds(cell)) {
                self.map[cell.c][cell.r] = new Digit(cell);
                cell.r = cell.r + 1;
                shifted.push(cell);
            } else {
                outOfBounds.push(cell);
            }
        }

        if(r == self.width - 1) {
            var newDigit = self.getRandomDigit({col: c, row: r, opened: 2});
            self.map[newDigit.c][newDigit.r] = newDigit;
            newDigits.push(newDigit);
        }

    }, true, 'start');

    return {
        newDigits: newDigits,
        outOfBounds: outOfBounds,
        shifted: shifted
    }
};

Field.prototype.isColumnsInBounds = function() {
    var s = this.columnsStat();
    for(var i=0; i < s.length; i++) {
        if(s[i] > 7) return false;
    }
    return true;
};

Field.prototype.columnsStat = function( ) {
    var c = [];
    var counter = 0;
    var currentC = 0;
    var self = this;
    this.eachCell(function(cell, x, y) {
        if(currentC != x) {
            currentC = x;
            counter = 0;
        }
        if(cell) counter++;
        if(self.width-1 == y) {
            c.push(counter);
        }
    }, true)
    return c;
};

Field.prototype.havePossibleTurns =function( ) {
    var t = this.possibleTurns();
    return t.length > 0;
};

Field.prototype.possibleTurns = function() {
    var t = [];
    this.eachCell(function(cell, x, y) {
        if(!cell) t.push({x: x, y: y});
    }, true);
    return t;
};

Field.prototype.proceedGravity = function() {
    var self = this;
    var cells = [];

    this.eachCell(function(cell) {

        var old = new Digit(cell);
        self.map[cell.c][cell.r] = null;
        self.pushDigit(cell, function(digit) {
            cells.push({
                old: old,
                new: new Digit(digit)
            });
        });

    })
    return cells;
}

Field.prototype.neighbourCross = function(cell) {
    var hor = 0;
    var ver = 0;
    var self = this;


    if(cell && cell.opened == 0) {
        for(var i = cell.c - cell.value; i < cell.c + cell.value + 1; i++) {
            if(this.checkBounds({c: i, r: cell.r})) {
                var m = this.map[i][cell.r];
                if(m) {
                    hor++;
                } else {
                    if(i > cell.c) {
                        break;
                    } else {
                        hor = 0;
                    }
                }
            }
        }

        for(var j = cell.r - cell.value; j < cell.r + cell.value + 1; j++) {
            if(this.checkBounds({c: cell.c, r: j})) {
                var m = this.map[cell.c][j];
                if(m) {
                    ver++;
                } else {
                    if(j > cell.r) {
                        break;
                    } else {
                        ver = 0;
                    }
                }
            }
        }

    }
    return { hor: hor, ver: ver };
};

Field.prototype.checkBounds = function(c) {
    return c && c.r < this.width && c.r >= 0 && c.c < this.height && c.c >= 0;
};

Field.prototype.isFullColumn = function(c) {
  return this.where({c: c}).length == this.height;
};

Field.prototype.where = function(data) {
    var arr = [];
    this.eachCell(function(cell){
        var allEqual = true;
        var keys = Object.keys(data);

        if(cell != null) {
            for(var k in keys) {
                if(data.hasOwnProperty(keys[k])) {

                    if(cell[keys[k]] != data[keys[k]]) {
                        allEqual = false;
                    }
                }
            }

            if(allEqual) {
                arr.push(cell);
            }
        }


    });
    return arr;
}

Field.prototype.eachCell = function(callback, includeNull, order) {
    includeNull = typeof includeNull != 'undefined' ? includeNull : false;
    order =  typeof order!= 'undefined'? order : 'bubble';

    for(var i=0; i < this.width; i++) {
        if(order == 'bubble') {
            for(var j=this.height-1; j >= 0; j--) {
                var cell = this.map[i][j];
                if( (cell && callback) || (includeNull && callback)) {
                    callback(cell, i, j);
                }
            }
        } else if(order == 'start') {
            for(var j=0; j < this.height; j++) {
                var cell = this.map[i][j];
                if( (cell && callback) || (includeNull && callback)) {
                    callback(cell, i, j);
                }
            }
        }

    }
}
function Game(data) {
    this.field = new Field();
    this.score = 0;
    this.level = 1;
    this.turns = 0;

    this.turnOn = true;
    this.state = 'in_game'; // in_game game_over
    this.score = data.score || 0;

    this.promiseState = 'waiting';
    this.startPosition = data.start;
    this.nextDigit = null;

    this.view = new GameView(this);
    this.newGame();
};

Game.prototype.serialize = function() {
    var s = this.field.serialize();
    if(this.nextDigit) s += '_n|'+this.nextDigit.value+this.nextDigit.opened;
    s += '_s|'+this.score;
    s += '_l|'+this.level;
    s += '_t|'+this.turns;
    return s;
};

Game.prototype.onCellClicked = function(data) {
    if(!this.field.isFullColumn(data.c)) {
        this.turnOn = false;
        this.setTurns(this.turns + 1);
        this.createChainOnTurn(data);
    }
};

Game.prototype.setScore = function(score) {
    this.score += score;

    if(this.score > app.best.score) {
        app.setBest('score', this.score);
    }

    this.view.updateScore(this.score, app.best.score);
};

Game.prototype.setTurns = function(t) {
    this.turns = t;

    this.view.updateTurns({
        turns: this.turns,
        level: this.level,
        maxTurnsOnLevel: this.getMaxTurnsOnLevel()
    });
};

Game.prototype.isGameOver = function() {
    var haveTurns = this.field.havePossibleTurns();
    var columnsInBounds = this.field.isColumnsInBounds();
    return !haveTurns || !columnsInBounds;
};

Game.prototype.actionsAfterChain = function() {
    return {
        nextLevel: !this.isGameOver() && this.getMaxTurnsOnLevel() == this.turns,
        haveTurns: !this.isGameOver(),
        emptyField: this.field.possibleTurns().length == this.field.width * this.field.height
    }
};

Game.prototype.getMaxTurnsOnLevel = function() {
    if(this.level < 23) return 30 - this.level; // 30
    else return 7;
};

Game.prototype.createChainOnTurn = function(data) {
    var self = this;
    var nextDigit = new Digit(this.nextDigit);
    nextDigit.c = data.c;

    this.field.pushDigit(nextDigit, function(digit) {
        self.view.pushDigit(digit, true, function() {
            self.chainPromise();
        });
    });
};

Game.prototype.onDigitDrop = function(digit, hidden, chain) {
    var kMultiplier = this.level < 10 ? 2 : 3;
    var multiplier = Math.pow(7, kMultiplier);
    var digitScore = (chain-1)*multiplier + 7 * this.level;
    this.setScore(digitScore);

    this.view.digitAction('drop', {
        digit: digit,
        hidden: hidden,
        digitScore: digitScore,
        chain: chain
    });
};

Game.prototype.chainPromise = function() {
    // app.game.field.map[c][r]
    var sequence = [];
    var self = this;

    while(this.field.digitsForDrop().length > 0) {
        sequence.push(this.proceedStep());
    }
    //

    var p = new Promise(function(resolve, reject) {
        setTimeout(function() {
            console.log('start');
            resolve();
        }, START_TIMEOUT)
    });

    for(var i=0; i < sequence.length; i++) {

        var drop = (function(i) {
            return function() {
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        for(var j in sequence[i].drop) {
                            self.onDigitDrop(sequence[i].drop[j], sequence[i].hidden, i+1);
                        }
                        resolve()
                    }, DROP_TIMEOUT);
                });
            };
        })(i);

        var gravity = (function(i) {
            return function() {
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        for(var j in sequence[i].gravity) {
                            var g = sequence[i].gravity[j];
                            if(g.old.r != g.new.r || g.old.c != g.new.c) {
                                self.view.digitAction('gravity', g);
                            }
                        }

                        resolve()
                    }, GRAVITY_TIMEOUT)
                });
            };
        })(i);

        p = p.then(drop);
        p = p.then(gravity);

        if(sequence.length > 0 && i < sequence.length-1) {
            p = p.then(function( ){
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        resolve();
                    }, NEXT_CHAIN_TIMEOUT)
                })
            });
        }
    }

    var afterChain = this.actionsAfterChain();

    if (afterChain.nextLevel) {

        var shiftedCells = this.field.proceedNextLevelShift();

        // GAME OVER
        if(shiftedCells.outOfBounds.length > 0) { //shiftedCells.outOfBounds.length > 0

            p = p.then(function() {
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        self.view.shiftBottomOnChangeLevel(shiftedCells);
                        self.goToNextLevel(false);
                        self.setGameOver();
                        resolve();
                    }, GAME_OVER_TIMEOUT);
                });
            });
            return;
        } else {
            p = p.then(function() {
                return new Promise(function(resolve, reject) {

                    setTimeout(function() {

                        self.goToNextLevel(true);
                        self.view.shiftBottomOnChangeLevel(shiftedCells);

                        if(self.field.digitsForDrop().length > 0) {
                            setTimeout(function() {
                                self.chainPromise();
                            }, NEXT_CHAIN_TIMEOUT);
                            reject('Another chain after move Up');
                            return;
                        }

                        resolve();
                    }, NEXT_LEVEL_TIMEOUT)
                });
            });
        }
    } else if(!afterChain.haveTurns) {
        p = p.then(function() {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    self.setGameOver();
                    resolve();
                }, GAME_OVER_TIMEOUT);

            });
        });

        return;
    } else if(afterChain.emptyField) {

    }

    p = p.then(function() {
        self.setNextDigit();
        self.turnOn = true;
        //self.view.render({action: 'new', map: self.field.map});
    })
        .catch(function(err) {
            console.log('In promise', err);
        });

    //this.view.render({action: 'new', map: this.field.map});
};

Game.prototype.setGameOver = function() {

    this.state = 'game_over'; // in_game game_over
    localStorage.removeItem('last_game');
    this.view.onBoardMessage({type: 'game_over', score: this.score, best: app.best});
};

Game.prototype.saveGame = function() {
    localStorage.setItem('last_game', this.serialize());
};

Game.prototype.goToNextLevel = function(addScore) {
    this.level++;
    this.setTurns(0);

    if(addScore) {
        this.setScore(7000*(this.level-1));
        this.view.onBoardMessage({type: 'new_level_bonus'});
    }

};

Game.prototype.setNextDigit = function(d, opened) {
    if(typeof opened == 'undefined') {
        opened = 0;
    }
    var digit = {
        row: null,
        col: 2,
        value:  d ? d : Math.round(Math.random()* 6 + 1), // Math.round(Math.random()* 6 + 1)
        opened: d ? opened : Math.random() < CLOSED_DIGIT_CHANCE ? 2 : 0
    };
    this.nextDigit = new Digit(digit);

    this.saveGame();

    this.view.setNewDigit(this.nextDigit);
};

// function called every time when we have digits for drop
// create SEQUENCE of turns
Game.prototype.proceedStep = function() {
    var forDrop = this.field.digitsForDrop();
    var cross = [[-1,0], [0,-1], [1,0], [0,1]];
    var hidden = [];

    for(var i in forDrop) {
        var d = forDrop[i];
        this.field.map[d.c][d.r] = null;

        for(var c in cross) {
            var cCross = d.c + cross[c][0];
            var rCross = d.r + cross[c][1];
            if(this.field.checkBounds({c: cCross, r: rCross})){
                var n = this.field.map[cCross][rCross];
                if(n && n.opened > 0) {

                    // Find and delete useless hidden value
                    if(n.opened === 1) {
                        for(var j=0; j < hidden.length; j++) {
                            var h = hidden[j];
                            if(h.r === n.r && h.c === n.c && h.value === n.value) {
                                hidden.splice(j, 1);
                            }
                        }
                    }


                    this.field.map[cCross][rCross].opened--;
                    hidden.push(new Digit(n));
                }
            }
        }
    }

    var gravity = this.field.proceedGravity();

    return {
        drop: forDrop,
        gravity: gravity,
        hidden: hidden,
        map: JSON.stringify(this.field.map)
    }
};

Game.prototype.restartGame = function() {
    this.startPosition = app.startVariants[0];
    this.newGame();
    this.turnOn = true;
};

Game.prototype.newGame = function(options) {
    this.state = 'in_game';
    var self = this;
    var startCombination = [];
    var nextDigit = null;
    var nextDigitOpened = 0;
    var score = 0;
    var turns = 0;
    var level = 1;

    this.startPosition.split('_').forEach(function(el) {

        var d = el.split('|');

        switch(d[0]) {
            case 'n': nextDigit = parseInt(d[1][0]); nextDigitOpened = parseInt(d[1][1]); break;
            case 's': score = parseInt(d[1]); break;
            case 't': turns = parseInt(d[1]); break;
            case 'l': level = parseInt(d[1]); break;
            default:
                if(!isNaN(parseInt(d[0]))) {
                    startCombination.push({c: parseInt(d[0]), value: parseInt(d[1]), opened: parseInt(d[2])});
                }
                break;
        }

    });

    this.level = level;
    this.setTurns(turns);
    this.score = score ? score :  0;

    this.view.updateScore(this.score);

    this.field.initField({
        random: true
    }, function(field) {
        self.view.render({
            action: 'new',
            map: field.map
        });

        var digits = startCombination;

        for(var i in digits) {
            self.field.pushDigit(new Digit(digits[i]), function(digit) {
                self.view.pushDigit(digit);
            });
        }

        self.setNextDigit(nextDigit, nextDigitOpened);
    });

}


function GameView(game) {
    this.game = game;
    this.current = null;
    this.emptyContent = '<div class="cell-content"></div>';
    this.bindActions();
};

GameView.prototype.bindActions = function() {
    var self = this;
    $(document).on('mouseup', '.gameField .cell', function(e) {
        if(self.game.turnOn && e.which == 1) {
            self.game.onCellClicked({
                c: parseInt($(this).attr('data-y'))
            });
        }
    });

    $(document).on('click', '.restart-button', function() {
        if(self.game.turnOn || self.game.state == 'game_over') {
            app.game.restartGame();
        }
    })

    /*
    $(document).on('mousemove', function(e) {
        // offsetX offsetY
    });
    */

    $(document).on('mouseover', '.gameField .cell', function() {
        if(self.game.turnOn) {
            //$('.gameField .cell[data-y="'+$(this).attr('data-y')+'"]').addClass('activeCellSmall');
        }
    });
};

GameView.prototype.pushDigit = function(digit, fromUser, callback) {

    var self = this;
    if(fromUser) {

        $('.gameField .cell[data-y="'+digit.c+'"]').addClass('activeCell');

        $('.nextDigit .cell-content').animateCss('top_down top_down_'+digit.c+'_'+digit.r, function(e) {
            $('.cell.activeCell').removeClass('activeCell');

            var $target = $('.cell[data-x='+digit.r+'][data-y='+digit.c+'] .cell-content');
            $target
                .addClass(digit.class());

            if(digit.opened == 0) {
                $target.attr('data-digit', digit.value);
            }

            e.parent().html(self.emptyContent);

            if(callback) {
                callback(digit, e);
            }
        });

    } else {

        $('.cell[data-x='+digit.r+'][data-y='+digit.c+']')
            .html(digit.view())
            .find('.cell-content')
            .animateCss('bounceInDown')
    }
};

GameView.prototype.setNewDigit = function(d){
    $('.nextDigit.cell').html(d.view()).find('.cell-content').animateCss('bounceIn');
};

GameView.prototype.updateScore = function(score, best) {
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    $('.score .scoreSum').text(numberWithCommas(score));
};

GameView.prototype.updateTurns = function(data) {
    // re-init view

    var str = '';
    for(var i=0; i < data.maxTurnsOnLevel; i++) {
        str += '<div class="smallTurn"></div>';
    }
    $('.turnsIndicator').html(str);


    if(data.turns > 0) {
        $('.turnsIndicator .smallTurn:not(.wasted)').slice(-data.turns).addClass('wasted');
    }


    $('.levelNumber').text(data.level);
};

GameView.prototype.shiftBottomOnChangeLevel = function(data) {
    var gameOver = data.outOfBounds.length > 0;

    if(gameOver) {
        var cells = [].concat(data.shifted, data.outOfBounds);
    } else {
        cells = data.shifted;
    }

    for(var s in cells) {
        var shifted = cells[s];

        $('.cell[data-x='+shifted.r+'][data-y='+shifted.c+']').html(this.emptyContent);


        if(shifted.r >= 0) {
            $('.cell[data-x='+parseInt(shifted.r - 1)+'][data-y='+shifted.c+']').html(shifted.view())
                .find('.cell-content').animateCss('moveUp', function(e) {
                    e.removeClass('moveUp');
                });
        } else {
            $('.cell[data-x='+parseInt(shifted.r+1)+'][data-y='+shifted.c+']').css('position', 'relative').append(shifted.view())
                .find('.cell-content:last').css({
                    position: 'absolute',
                    top: '-50px'
                }).animateCss('moveUp', function(e) {
                    e.removeClass('moveUp');
                });
        }

    }

    for(var d in data.newDigits) {
        var newDigit = data.newDigits[d];
        $('.cell[data-x='+parseInt(newDigit.r)+'][data-y='+newDigit.c+']').html(newDigit.view())
            .find('.cell-content').animateCss('moveUp', function(e) {
                e.removeClass('moveUp');
            });
    }
};

GameView.prototype.digitAction = function(name, data) {
    var self = this;
    switch(name) {
        case 'drop':
            var $target = $('.cell[data-x='+data.digit.r+'][data-y='+data.digit.c+'] .cell-content');

            //console.log('Drop ', data.digit)

            // add rising points
            var offset = $target.position();
            var colors = [' #66a1ee', '#30e849', '#e83a30', '#e5d1fa'];
            var c = colors[Math.round(Math.random()*colors.length)];
            var rising = '<div class="tempRising" style="position: absolute;top:'+offset.top+'px; left:'+offset.left+'px; color: '+c+';">+'+data.digitScore+'</div>';
            $(rising).appendTo('.animationWrapper').animateCss('risingPoint', function(e){
                e.remove();
            });

            $target.animateCss('zoomIn', function(e) {
                e.parent().html(self.emptyContent);
            });


            for(var i in data.hidden) {
                var h = data.hidden[parseInt(i)];
                var $targetHidden = $('.cell[data-x='+h.r+'][data-y='+h.c+'] .cell-content');
                $targetHidden.animateCss('openDigit openDigit_'+ h.opened, function(e, data) {
                    e.parent().html(data.view()).find('.cell-content').animateCss('tremors');
                }, h);
            }

            break;
        case 'gravity':
            var $source = $('.cell[data-x='+data.old.r+'][data-y='+data.old.c+'] .cell-content');
            $source.animateCss('in_field_down in_field_down_'+parseInt(data.new.r - data.old.r - 1), function(e, d) {
                var $target = $('.cell[data-x='+d.new.r+'][data-y='+d.new.c+']');
                $target.empty();
                e.clone().appendTo($target); // bounceInDown in_field_down
                e.parent().html(self.emptyContent);
            }, data);

            break;
        default: break;
    }

    if(data.chain) {
        if(data.chain > 1) {
            $('.nextDigit .cell-content').text('CHAIN x'+data.chain);
        }
    }
};

GameView.prototype.onBoardMessage = function(data) {
    switch(data.type) {
        case 'new_level_bonus': text = '<div class="onBoardMessage">New level bonus +7000</div>'; break;
        case 'game_over':
            text = '<div class="onBoardMessage onBoardMessage__gameOver"><p><strong>Game over</strong></p>' +
            '<p>Your score: '+ data.score +'</p>'+
            '<p>Best score: '+ data.best.score +'</p>'+
            '</div>';
            $('.nextDigit .cell-content').text('');
            break;
        default: var text = '';
    }

    $('.onBoardMessage').remove();

    $('.gameField').prepend(text);
    $('.onBoardMessage').animateCss('lightSpeedIn', function(e) {
        if(data.type == 'new_level_bonus') {
            setTimeout(function() {
                $('.onBoardMessage').animateCss('lightSpeedOut', function() {
                    $('.onBoardMessage').remove();
                })
            }, 1150);
        }

    });
};

GameView.prototype.render = function(data) {
    switch(data.action) {
        case 'new':
            $('.gameField').empty();
            var str = '';

            for(var i in data.map) {
                str +='<div class="row"></div>';
                for(var j in data.map[i]) {
                    var cell = data.map[j][i];
                    if(cell) {
                        var content = '<div data-digit="'+cell.value+'" class="cell-content numberCircle numberCircle_'+cell.value+'"></div>';
                    } else {
                        content = this.emptyContent;
                    }
                    str +='<div class="cell" data-x="'+i+'" data-y="'+j+'">'+content+'</div>';
                }
            }

            $('.gameField').html(str);
            break;
        default: break;
    }
};

