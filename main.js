class TgChart {

    get pointsCount() {
        return this.columns['x'].value.length;
    }

    init() {
        this.timeLineHeight = 80;
        this.gridColor = '#A9ABAD';
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.maxY = 0;
        this.lineWidth = 3;
        this.sectionSize = 30; // %
    }

    constructor(container, data) {
        console.log(data);
        if (typeof data !== 'object') return;
        this.data = data;
        this.container = container;
        this.init();

        // create elements
        this.canvas = TgChart.dom(this.container, 'canvas');
        this.buttons = TgChart.dom(this.container, 'div');
        this.ctx = this.canvas.getContext('2d');
        // elements styles
        this.container.classList.add('tg-chart-wrapper');
        this.buttons.className = 'tg-chart-buttons';
        // create buttons
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
        // data mapping
        this.columns = this.data.columns.reduce((acc, col) => {
            acc[col[0]] = {
                shown: true,
                value: col.slice(1),
                key: col[0],
            };
            return acc;
        }, {});

        this.calculateMaxY();
        this.setViewports();

        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        TgChart.refs.push(this);
        if (!TgChart.isListenerEnabled) {
            window.addEventListener('resize', () => this.setViewports());
            TgChart.isListenerEnabled = true;
        }
    }

    makeViewport(x0, y0, x1, y1) {
        return {
            x0,
            y0,
            x1,
            y1,
            width: function () {
                return Math.abs(this.x1 - this.x0);
            },
            height: function () {
                return Math.abs(this.y1 - this.y0);
            }
        };
    }

    onMouseMove(e) {
        if (!(e.offsetX >= this.trackVP.x0 && e.offsetX <= this.trackVP.x1 &&
                e.offsetY >= this.trackVP.y0 && e.offsetY <= this.trackVP.y1)) {
            this.canvas.style.setProperty('cursor', 'default');
            return;
        }

        this.canvas.style.setProperty('cursor', 'pointer');
        if (e.buttons !== 1) return;

        this.move(e.movementX);
        this.draw();
    }



    onBtnClick(e, key) {
        this.columns[key].shown = !e.target.checked;
        this.calculateMaxY();

        this.draw();
    }

    setViewports() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = 400;

        this.canvas.width = this.container.clientWidth;
        this.timeLineVP = this.makeViewport(0, this.canvas.height - this.timeLineHeight, this.canvas.width, this.canvas.height);
        this.xAxisVP = this.makeViewport(0, this.timeLineVP.y0 - 30, this.canvas.width, this.timeLineVP.y0 - 1);
        this.chartVP = this.makeViewport(0, 30, this.canvas.width * 100 / this.sectionSize, this.xAxisVP.y0 - 1);

        if (!this.trackVP) {
            this.trackVP = {
                ...this.makeViewport(0,
                    this.timeLineVP.y0,
                    this.sectionSize * this.canvas.width / 100,
                    this.timeLineVP.y1
                ),
            }
        }

        this.draw();
    }

    move(offset) {
        if (this.trackVP.x1 + offset > this.canvas.width || this.trackVP.x0 + offset < 0) return;
        this.trackVP.x0 += offset;
        this.trackVP.x1 += offset;
        this.chartVP.offset = this.trackVP.x0 * 100 / this.sectionSize;
    }

    calculateMaxY() {
        this.maxY = Object.keys(this.columns).reduce((max, k) => {
            if (!this.isLineCol(k) || !this.columns[k].shown) return max;
            const m = Math.max(...this.columns[k].value);
            return m > max ? m : max;
        }, 0);
    }

    // DRAWING
    draw() {
        this.clear();
        this.drawGrid();
        this.drawLines();
        this.drawNumbers();
        this.drawXAxis();
        this.drawLines(this.timeLineVP);
        this.drawTrack();
    }

    drawGrid() {
        const normalizer = Math.pow(10, this.maxY.toString().length - 2);
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

    drawLines(vp = this.chartVP, startX = 0, endX = this.pointsCount - 1) {
        this.ctx.lineWidth = this.lineWidth;
        let x0, y0, x1, y1;
        for (let i = startX; i < endX; i += 1) {
            x0 = this.getX(this.columns['x'].value[i], vp) - (vp.offset || 0);
            x1 = this.getX(this.columns['x'].value[i + 1], vp) - (vp.offset || 0);
            // if (x0 < 0 || x1 > vp.x1) continue;

            for (const key of Object.keys(this.columns).filter(k => this.isLineCol(k) && this.columns[k].shown)) {
                y0 = this.getY(this.columns[key].value[i], this.maxY, vp);
                y1 = this.getY(this.columns[key].value[i + 1], this.maxY, vp);

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
        const step = Math.floor(this.pointsCount / sectionsCount);
        const xSectorSize = this.canvas.width / sectionsCount;
        let iteration = 0;
        for (let i = 0; i < this.pointsCount; i += step) {
            const date = new Date(this.columns['x'].value[i]);
            const text = `${this.months[date.getMonth()]} ${date.getDate()}`;
            this.ctx.fillText(text,
                xSectorSize * iteration + xSectorSize / 3,
                this.xAxisVP.y0 + 16);
            iteration++;
        }
    }

    drawTrack() {
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(0,100,200,.075)';
        this.ctx.rect(this.trackVP.x0, this.trackVP.y0, this.trackVP.width(), this.trackVP.height());
        this.ctx.fill();
    }

    clear(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
        this.ctx.clearRect(x, y, w, h);
    }

    getX(value, vp = this.chartVP) {
        return (value - this.columns['x'].value[0]) * vp.width() /
            (this.columns['x'].value[this.pointsCount - 1] - this.columns['x'].value[0]);
    }

    getY(value, max = this.maxY, vp = this.chartVP) {
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

function test(func, expect, ...args) {
    const res = func(...args);
    console.log(`expect ${res} === ${expect} ::: ${res === expect}`);
}