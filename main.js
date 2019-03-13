function dom(parent, element) {
    const el = document.createElement(element);
    parent.appendChild(el);
    return el;
}

class TgChart {

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
        this.draw();
    }

    setStyles() {
        this.container.classList.add('tg-chart-wrapper');
        this.buttons.className = 'tg-chart-buttons';
    }

    calculateSize() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = 400;
    }

    onResize() {
        TgChart.refs.forEach(el => {
            el.canvas.width = 0;
            el.canvas.height = 0;
            setTimeout(() => {
                el.canvas.width = el.container.clientWidth;
                el.canvas.height = 400;
            }, 0);
        });
    }

    setStartEnd(x0, x1) {
        this.x0 = x0;
        this.x1 = x1 > this.pointsCount ? this.pointsCount : x1;

        this.maxY = this.data.columns
            .filter(col => this.data.types[col[0]] === 'line')
            .reduce((acc, cur) => {
                const max = Math.max(...cur.slice(x0, x1));
                return max > acc ? max : acc;
            }, 0);
    }

    // DRAWING
    draw() {
        this.clear();
        this.drawLines();
    }

    drawLines() {
        this.ctx.lineWidth = this.lineWidth;
        let x0, y0, x1, y1;

        for (let i = this.x0; i < this.x1 - 1; i += this.step) {
            const date = new Date(this.columns['x'].value[i]);
            x0 = this.getX(i);
            x1 = this.getX(i + 1);

            for (const key of Object.keys(this.columns).filter(k => this.isLineCol(k) && this.columns[k].shown)) {
                const line = this.columns[key].value;
                y0 = this.canvas.height - line[i] * this.canvas.height / this.maxY;
                y1 = this.canvas.height - line[i + 1] * this.canvas.height / this.maxY;

                this.ctx.beginPath();
                this.ctx.strokeStyle = this.data.colors[key];
                this.ctx.moveTo(x0, y0);
                this.ctx.lineTo(x1, y1);
                this.ctx.stroke();
            }
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getX(index) {
        return (this.columns['x'].value[index] - this.columns['x'].value[this.x0]) * this.canvas.width /
            (this.columns['x'].value[this.x1] - this.columns['x'].value[this.x0]);
    }

    isLineCol(key) {
        return this.data.types[key] === 'line';
    }

    static refs = [];
    static isListenerEnabled = false;
}