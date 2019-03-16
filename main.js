function dom(parent, element) {
    const el = document.createElement(element);
    parent.appendChild(el);
    return el;
}

class TgChart {

    get pointsCount() {
        return this.columns['x'].value.length;
    }

    init() {
        this.chartVP = {};
        this.timeLineVP = {};
        this.xAxisVP = {};
        this.timeLineHeight = 80;
        this.gridColor = '#A9ABAD';
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.x0 = 0;
        this.x1 = 0;
        this.maxYForSelection = 0;
        this.maxY = 0;
        this.step = 1;
        this.lineWidth = 3;
        this.sectionSize = 30;
        this.columns = {};
    }

    constructor(container, data) {
        this.init();
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

        this.timeLineVP = {
            x0: 0,
            y0: this.canvas.height - this.timeLineHeight,
            x1: this.canvas.width,
            y1: this.canvas.height,
            height: function () {
                return this.y1 - this.y0;
            }
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
            el.calculateSize();
            el.draw();
        });
    }

    setStartEnd(x0, x1) {
        this.x0 = x0;
        this.x1 = x1 > this.pointsCount ? this.pointsCount : x1;
        this.calculateMaxY();
    }

    calculateMaxY() {
        let maxY = 0;
        let maxYForSelection = 0;

        Object.keys(this.columns)
            .filter(k => this.isLineCol(k) && this.columns[k].shown)
            .map(k => this.columns[k].value)
            .forEach(cols => {
                cols.forEach((point, i) => {
                    if (point > maxY) maxY = point;
                    if (point > maxYForSelection && i >= this.x0 && i <= this.x1) maxYForSelection = point;
                });
            });

        this.maxY = maxY;
        this.maxYForSelection = maxYForSelection;
    }

    // DRAWING
    draw() {
        this.clear();
        this.drawGrid();
        this.drawLines();
        this.drawNumbers();
        this.drawXAxis();
        this.drawLines(0, this.pointsCount - 1, this.maxY, this.timeLineVP, 1);
    }

    drawGrid() {
        let normalizer = Math.pow(10, this.maxYForSelection.toString().length - 2);

        const sectionValue = Math.floor(Math.round(this.maxYForSelection / 5 / normalizer) * normalizer);

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
        const normalizer = Math.pow(10, this.maxYForSelection.toString().length - 2);
        const sectionValue = Math.floor(Math.round(this.maxYForSelection / 5 / normalizer) * normalizer);

        this.ctx.fillStyle = this.gridColor;
        this.ctx.font = '12px sans-serif';

        let y;
        for (let i = 0; i < 6; i++) {
            y = this.getY(sectionValue * i, sectionValue * 5);
            this.ctx.fillText(sectionValue * i, 5, y - 8);
        }
    }

    drawLines(startX = this.x0, endX = this.x1, max = this.maxYForSelection, vp = this.chartVP, step = this.step) {
        this.ctx.lineWidth = this.lineWidth;
        let x0, y0, x1, y1;
        // this.ctx.beginPath();
        // this.ctx.rect(vp.x0, vp.y0, vp.x1, vp.y1);
        // this.ctx.stroke();
        for (let i = startX; i < endX - 1; i += step) {
            x0 = this.getX(this.columns['x'].value[i], startX, endX);
            x1 = this.getX(this.columns['x'].value[i + 1], startX, endX);

            for (const key of Object.keys(this.columns).filter(k => this.isLineCol(k) && this.columns[k].shown)) {
                y0 = this.getY(this.columns[key].value[i], max, vp);
                y1 = this.getY(this.columns[key].value[i + 1], max, vp);

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

    getX(value, x0 = this.x0, x1 = this.x1) {
        return (value - this.columns['x'].value[this.x0]) * this.canvas.width /
            (this.columns['x'].value[x1] - this.columns['x'].value[x0]);
    }

    getY(value, max = this.maxYForSelection, vp = this.chartVP) {
        const h = vp.height();
        return h - value * h / max + vp.y0;
    }

    isLineCol(key) {
        return this.data.types[key] === 'line';
    }
}

TgChart.refs = [];
TgChart.isListenerEnabled = false;