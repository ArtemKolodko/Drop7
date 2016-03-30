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

