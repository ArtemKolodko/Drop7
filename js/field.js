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