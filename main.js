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
        this.lineWidth = 3;
        this.sectionSize = 30;
        this.columns = {};
    }

    constructor(container, data) {
        if (typeof data !== 'object') return;
        this.init();
        this.container = container;

        this.canvas = TgChart.dom(this.container, 'canvas');
        this.buttons = TgChart.dom(this.container, 'div');

        this.ctx = this.canvas.getContext('2d');

        TgChart.refs.push(this);

        if (!TgChart.isListenerEnabled) {
            window.addEventListener('resize', this.onResize.bind(this));
            TgChart.isListenerEnabled = true;
        }

        console.log(data);

        this.data = data;
        this.data.columns.forEach(col => {
            this.columns[col[0]] = {
                value: col.slice(1),
                shown: true,
            };
        });

        this.setStartEnd(0, this.sectionSize);
        this.setStyles();
        this.createButtons();
        this.calculateSize();
        this.draw();

        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onMouseMove(e) {
        if (!this.trackVP) return;
        if (!(e.offsetX >= this.trackVP.x0 && e.offsetX <= this.trackVP.x1 &&
                e.offsetY >= this.trackVP.y0 && e.offsetY <= this.trackVP.y1)) {
            this.canvas.style.setProperty('cursor', 'default');
            return;
        }
        this.canvas.style.setProperty('cursor', 'pointer');
        if (e.buttons !== 1) return;

        const offset = this.onePixelIndex * e.movementX;
        this.setStartEnd(Math.round(this.x0 + offset), Math.round(this.x1 + offset));
        this.draw();
    }

    createButtons() {
        Object.keys(this.data.names).forEach(key => {
            const label = TgChart.dom(this.buttons, 'label')
            label.className = 'tg-chart-buttons__item';

            const checkbox = TgChart.dom(label, 'input');
            checkbox.className = 'tg-chart-checkbox'
            checkbox.setAttribute('type', 'checkbox');

            const cbIndicator = TgChart.dom(label, 'span');
            cbIndicator.className = 'tg-chart-checkbox-indicator';
            cbIndicator.style.setProperty('background-color', this.data.colors[key]);

            const cbText = TgChart.dom(label, 'span');
            cbText.innerText = this.data.names[key];
            cbText.className = 'tg-chart-checkbox-text';

            const ripple = TgChart.dom(label, 'span');
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

        this.onePixelIndex = this.pointsCount / this.canvas.width;
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
        if (x0 < 0 || x1 >= this.pointsCount - 1) return;
        // const offset = x0 % 1;
        // if (offset > 0) this.xOffset += offset;
        // else this.xOffset = 0;
        // TODO: continue lerp

        this.x0 = x0;
        this.x1 = x1;
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
        this.drawLines(0, this.pointsCount - 1, this.maxY, this.timeLineVP);
        this.drawTimelineTrack();
    }

    drawGrid() {
        const normalizer = Math.pow(10, this.maxYForSelection.toString().length - 2);
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

    drawLines(startX = this.x0, endX = this.x1, max = this.maxYForSelection, vp = this.chartVP) {
        this.ctx.lineWidth = this.lineWidth;
        let x0, y0, x1, y1;
        for (let i = startX; i < endX - 1; i += 1) {
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

    drawTimelineTrack() {
        this.trackVP = {
            x0: this.getX(this.columns['x'].value[this.x0], 0, this.pointsCount - 1),
            y0: this.timeLineVP.y0,
            x1: this.getX(this.columns['x'].value[this.x0 + this.sectionSize], 0, this.pointsCount - 1),
            y1: this.timeLineVP.y1,
            width: function () {
                return this.x1 - this.x0;
            },
            height: function () {
                return this.y1 - this.y0;
            },
        };

        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(0,100,200,.075)';
        this.ctx.rect(this.trackVP.x0, this.trackVP.y0, this.trackVP.width(), this.trackVP.height());
        this.ctx.fill();
    }

    clear(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
        this.ctx.clearRect(x, y, w, h);
    }

    getX(value, x0 = this.x0, x1 = this.x1) {
        return (value - this.columns['x'].value[x0]) * this.canvas.width /
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
TgChart.dom = function (parent, element) {
    const el = document.createElement(element);
    parent.appendChild(el);
    return el;
}