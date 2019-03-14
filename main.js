function dom(parent, element) {
    const el = document.createElement(element);
    parent.appendChild(el);
    return el;
}

class TgChart {

    chartVP;
    timeLineVP;
    xAxisVP;
    timeLineHeight = 80;
    gridColor = '#A9ABAD';
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    x0 = 0;
    x1 = 0;
    maxY = 0;
    step = 1;
    lineWidth = 3;
    sectionSize = 30;
    columns = {};

    get pointsCount() {
        return this.data.columns[0].length;
    }

    constructor(container, data) {
        this.container = container;

        this.canvas = dom(this.container, 'canvas');
        this.buttons = dom(this.container, 'div');

        this.ctx = this.canvas.getContext('2d');

        TgChart.refs.push(this);

        if (!TgChart.isListenerEnabled) {
            window.addEventListener('resize', this.onResize.bind(this));
            TgChart.isListenerEnabled = true;
        }

        if (typeof data === 'object') {
            console.log(data);

            this.data = data;
            this.data.columns.forEach(col => {
                this.columns[col[0]] = {
                    value: col.slice(1),
                    shown: true,
                };
            });

            this.setStartEnd(1, this.sectionSize);
            this.setStyles();
            this.createButtons();
            this.calculateSize();
            this.draw();
        }
    }

    createButtons() {
        Object.keys(this.data.names).forEach(key => {
            const label = dom(this.buttons, 'label')
            label.className = 'tg-chart-buttons__item';

            const checkbox = dom(label, 'input');
            checkbox.className = 'tg-chart-checkbox'
            checkbox.setAttribute('type', 'checkbox');

            const cbIndicator = dom(label, 'span');
            cbIndicator.className = 'tg-chart-checkbox-indicator';
            cbIndicator.style.setProperty('background-color', this.data.colors[key]);

            const cbText = dom(label, 'span');
            cbText.innerText = this.data.names[key];
            cbText.className = 'tg-chart-checkbox-text';

            const ripple = dom(label, 'span');
            ripple.className = 'tg-chart-checkbox-ripple';

            checkbox.addEventListener('change', e => this.onBtnClick(e, key));
        });
    }

    onBtnClick(e, key) {
        this.columns[key].shown = !e.target.checked;
        this.calculateMaxY();
        this.draw();
    }

    setStyles() {
        this.container.classList.add('tg-chart-wrapper');
        this.buttons.className = 'tg-chart-buttons';
    }

    calculateSize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = 400;

        // this.chartVP = {x: 0, y 30, w: this.canvas.width, h: this.canvas.height - }
        this.timeLineVP = {
            x0: 0,
            y0: this.canvas.height - this.timeLineHeight,
            x1: this.canvas.width,
            y1: this.canvas.height,
        };

        this.xAxisVP = {
            x0: 0,
            y0: this.timeLineVP.y0 - 30,
            x1: this.canvas.width,
            y1: this.timeLineVP.y0 - 1,
        };

        this.chartVP = {
            x0: 0,
            y0: 30,
            x1: this.canvas.width,
            y1: this.xAxisVP.y0 - 1,
            height: function () {
                return this.y1 - this.y0;
            }
        };
    }

    onResize() {
        TgChart.refs.forEach(el => {
            el.canvas.width = el.container.clientWidth;
            el.canvas.height = 400;
            this.calculateSize();
            el.draw();
        });
    }

    setStartEnd(x0, x1) {
        this.x0 = x0;
        this.x1 = x1 > this.pointsCount ? this.pointsCount : x1;
        this.calculateMaxY();
    }

    calculateMaxY() {
        this.maxY = this.data.columns
            .filter(col => this.isLineCol(col[0]) && this.columns[col[0]].shown)
            .reduce((acc, cur) => {
                const max = Math.max(...cur.slice(this.x0, this.x1));
                return max > acc ? max : acc;
            }, 0);
    }

    // DRAWING
    draw() {
        console.log(this);
        
        this.clear();
        this.drawGrid();
        this.drawLines();
        this.drawNumbers();
        this.drawXAxis();
    }

    drawGrid() {
        let normalizer = Math.pow(10, this.maxY.toString().length - 2);

        const sectionValue = Math.floor(Math.round(this.maxY / 5 / normalizer) * normalizer);

        this.ctx.lineWidth = 0.2;
        this.ctx.strokeStyle = this.gridColor;
        let y;
        for (let i = 0; i < 6; i++) {
            y = this.getY(sectionValue * i, sectionValue * 5);
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    drawNumbers() {
        const normalizer = Math.pow(10, this.maxY.toString().length - 2);
        const sectionValue = Math.floor(Math.round(this.maxY / 5 / normalizer) * normalizer);

        this.ctx.fillStyle = this.gridColor;
        this.ctx.font = '12px sans-serif';

        let y;
        for (let i = 0; i < 6; i++) {
            y = this.getY(sectionValue * i, sectionValue * 5);
            this.ctx.fillText(sectionValue * i, 5, y - 8);
        }
    }

    drawLines() {
        this.ctx.lineWidth = this.lineWidth;
        let x0, y0, x1, y1;

        for (let i = this.x0; i < this.x1 - 1; i += this.step) {
            x0 = this.getX(this.columns['x'].value[i]);
            x1 = this.getX(this.columns['x'].value[i + 1]);

            for (const key of Object.keys(this.columns).filter(k => this.isLineCol(k) && this.columns[k].shown)) {
                y0 = this.getY(this.columns[key].value[i]);
                y1 = this.getY(this.columns[key].value[i + 1]);

                this.ctx.beginPath();
                this.ctx.strokeStyle = this.data.colors[key];
                this.ctx.moveTo(x0, y0);
                this.ctx.lineTo(x1, y1);
                this.ctx.stroke();
            }
        }
    }

    drawXAxis() {
        this.ctx.fillStyle = this.gridColor;
        this.ctx.font = '12px sans-serif';
        const sectionsCount = Math.floor(this.canvas.width / 100);
        const step = Math.floor((this.x1 - this.x0) / sectionsCount);
        const xSectorSize = this.canvas.width / sectionsCount;
        let iteration = 0;
        for (let i = this.x0; i < this.x1; i += step) {
            const date = new Date(this.columns['x'].value[i]);
            const text = `${this.months[date.getMonth()]} ${date.getDate()}`;
            this.ctx.fillText(text,
                xSectorSize * iteration + xSectorSize / 3,
                this.xAxisVP.y0 + 16);
            iteration++;
        }
    }

    clear(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
        this.ctx.clearRect(x, y, w, h);
    }

    getX(value) {
        return (value - this.columns['x'].value[this.x0]) * this.canvas.width /
            (this.columns['x'].value[this.x1] - this.columns['x'].value[this.x0]);
    }

    getY(value, max = this.maxY) {
        return this.chartVP.height() - value * this.chartVP.height() / max + this.chartVP.y0;
    }

    isLineCol(key) {
        return this.data.types[key] === 'line';
    }

    static refs = [];
    static isListenerEnabled = false;
}