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

