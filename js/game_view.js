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

    $(document).on('mouseout', '.gameField .cell', function() {
        //$('.activeCellSmall').removeClass('activeCellSmall');
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

        /*
        $('.cell[data-x='+digit.r+'][data-y='+digit.c+'] .cell-content')
            .addClass('numberCircle numberCircle_'+digit.value)
            .attr('data-digit', digit.value)
            .animateCss('bounceInDown');
            */
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

            //$('<div class="droppedScore">+'+data.digitScore+'</div>').insertAfter($target);
            //$target.html('<div class="droppedScore">+'+data.digitScore+'</div>');
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
            /*
            var $source = $('.cell[data-x='+data.old.r+'][data-y='+data.old.c+'] .cell-content');
            var $target = $('.cell[data-x='+data.new.r+'][data-y='+data.new.c+']');
            $target.empty();
            $source.clone().appendTo( $target).animateCss('bounceInDown');
            $source.parent().html(this.emptyContent);
            */

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

