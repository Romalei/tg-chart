class TgChart {

    get pointsCount() {
        return this.columns.x.value.length;
    }

    init() {
        this.timeLineHeight = 80;
        this.gridColor = '#A9ABAD';
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        this.days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        this.maxY = 0;
        this.lineWidth = 3;
        this.trackSize = 30; // %
        this.minTrackSize = 20; // %
    }

    constructor(container, data, theme = 'light') {
        if (typeof data !== 'object') return;
        this.data = data;
        this.container = container;
        this.init();
        this.theme = theme;

        // create elements
        this.canvas = TgChart.dom(this.container, 'canvas');
        this.buttons = TgChart.dom(this.container, 'div', 'tg-chart-buttons');
        this.tooltip = TgChart.dom(this.container, 'div', 'tg-chart-tooltip');

        this.ctx = this.canvas.getContext('2d');
        // elements styles
        this.container.classList.add('tg-chart-wrapper');
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
                name: this.data.names[col[0]],
            };
            return acc;
        }, {});

        this.calculateMaxY();
        this.setViewports();

        this.canvas.addEventListener('mousedown', this.onMouseDownOrTouchStart.bind(this));
        document.addEventListener('mousemove', this.prepareToMove.bind(this));
        this.canvas.addEventListener('touchstart', this.onMouseDownOrTouchStart.bind(this));
        document.addEventListener('touchmove', this.prepareToMove.bind(this));

        TgChart.refs.push(this);
        if (!TgChart.isListenerEnabled) {
            window.addEventListener('resize', TgChart.onWindowResize);
            TgChart.isListenerEnabled = true;
        }

        setTimeout(() => {
            this.resize(0);
        }, 0);
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

    onMouseDownOrTouchStart(e) {
        if (!this.canvas.contains(e.target)) return;
        this.isTouched = true;
        document.addEventListener('touchend', e => {
            this.isTouched = false;
            this.mode = null;
            document.removeEventListener('touchend', arguments.callee);
        })
    }

    prepareToMove(e) {
        if (!this.canvas.contains(e.target)) {
            this.setTooltip(false);
            return;
        }
        let isTouched, movementX, offsetY, offsetX;
        const rect = this.canvas.getBoundingClientRect();

        if (e instanceof MouseEvent) {
            isTouched = e.buttons === 1;
            offsetX = e.pageX - rect.left;
            offsetY = e.offsetY;
            movementX = e.movementX;
        } else if (e instanceof TouchEvent) {
            isTouched = !!e.touches.length;
            offsetX = e.touches[0].pageX - rect.left;
            offsetY = e.touches[0].pageY - rect.top;
            movementX = this.lastTouchX ? e.touches[0].pageX - this.lastTouchX : 0;
            this.lastTouchX = e.touches[0].pageX;
        }
        
        log(offsetY);

        this.onTouchOrMouseMove(movementX, isTouched, offsetX, offsetY);
    }

    onTouchOrMouseMove(movementX, isTouched, offsetX, offsetY) {

        if (!this.mode && !(offsetX >= this.timeLineVP.x0 && offsetX <= this.timeLineVP.x1 &&
                offsetY >= this.timeLineVP.y0 && offsetY <= this.timeLineVP.y1)) {
            this.canvas.style.setProperty('cursor', 'default');
            this.setTooltip(offsetX);
            return;
        }

        this.setTooltip(false);

        if (!this.mode) {
            if (offsetX <= this.trackVP.x0 + this.trackVP.resizer) {
                this.mode = 'resizing-l';
                this.canvas.style.setProperty('cursor', 'ew-resize');
            } else if (this.trackVP.x1 - this.trackVP.resizer <= offsetX) {
                this.mode = 'resizing-r';
                this.canvas.style.setProperty('cursor', 'ew-resize');
            } else {
                this.mode = 'moving';
                this.canvas.style.setProperty('cursor', 'pointer');
            }
        }

        if (!isTouched || !this.isTouched) {
            this.mode = null;
            this.isTouched = false;
            return;
        }

        switch (this.mode) {
            case 'resizing-l':
            case 'resizing-r':
                this.resize(movementX);
                this.setTrack();
                break;
            case 'moving':
                this.move(movementX);
                break;
        }
        this.draw();
    }

    setTooltip(x) {
        if (x === false) {
            this.tooltip.classList.remove('tg-chart-tooltip_shown');
            return;
        }
        const index = this.getItemIndexByX(x + this.chartVP.offset);
        if (index == null) {
            this.setTooltip(false);
            return;
        }
        const values = Object.keys(this.columns)
            .filter(key => this.columns[key].shown)
            .map(key => {
                return {
                    value: this.columns[key].value[index],
                    name: this.columns[key].name,
                    key,
                };
            });

        if (!values) {
            this.tooltip.classList.remove('tg-chart-tooltip_shown');
        }

        const xValue = values.find(v => !this.isLineCol(v.key)).value;
        const x0 = this.getX(xValue);
        const date = new Date(x0);
        const domNodes = values
            .filter(v => this.isLineCol(v.key))
            .map(v => {
                return `<div class="tg-chart-tooltip__item" style="color:${this.data.colors[v.key]}">
                    <span style="font-weight:bold">${v.value}</span>
                    <span>${v.name}</span>
                </div>`;
            })
            .join('');

        this.tooltip.classList.add('tg-chart-tooltip_shown');
        this.tooltip.style.setProperty('left', `${x + 10}px`);

        this.tooltip.innerHTML = `
        <span class="tg-chart-tooltip__title">${this.days[date.getDay()]}, ${this.months[date.getMonth()]} ${date.getDate()}</span>
        ${domNodes}`;
    }

    onBtnClick(e, key) {
        this.columns[key].shown = !e.target.checked;
        this.calculateMaxY();

        this.draw();
    }

    setViewports() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = 400;

        this.timeLineVP = this.makeViewport(0, this.canvas.height - this.timeLineHeight, this.canvas.width, this.canvas.height);
        this.xAxisVP = this.makeViewport(0, this.timeLineVP.y0 - 30, this.canvas.width, this.timeLineVP.y0 - 1);
        this.chartVP = this.makeViewport(0, 30, this.canvas.width * 100 / this.trackSize, this.xAxisVP.y0 - 1);
        this.setTrack();
        this.move(0);

        this.draw();
    }

    setTrack() {
        const trackX0 = this.trackVP ? this.trackVP.x0 : 0;
        const trackX1 = trackX0 + this.trackSize * this.canvas.width / 100;
        this.trackVP = {
            ...this.makeViewport(trackX0, this.timeLineVP.y0, trackX1, this.timeLineVP.y1),
            resizer: 10,
        };
    }

    move(offset) {
        if (this.trackVP.x1 + offset > this.canvas.width || this.trackVP.x0 + offset < 0) return;
        this.trackVP.x0 += offset;
        this.trackVP.x1 += offset;
        this.chartVP.offset = this.trackVP.x0 * 100 / this.trackSize;
    }

    resize(offset) {
        const value = offset * 100 / this.canvas.width;
        let newSize;
        switch (this.mode) {
            case 'resizing-l':
                const x0 = this.trackVP.x0 + offset;
                newSize = this.trackSize - value;
                if (newSize >= this.minTrackSize && x0 >= 0) {
                    this.trackSize = newSize;
                    this.trackVP.x0 += offset;
                }
                break;
            case 'resizing-r':
                const x1 = this.trackVP.x1 + offset;
                newSize = this.trackSize + value;
                if (newSize >= this.minTrackSize && x1 <= this.canvas.width) this.trackSize += value;
                break;
        }
        this.setViewports();
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
        this.drawLines(this.chartVP, true);
        this.drawNumbers();
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

        this.ctx.fillStyle = this.getTextColor();
        this.ctx.font = '12px sans-serif';

        let y;
        for (let i = 0; i < 6; i++) {
            y = this.getY(sectionValue * i, sectionValue * 5);
            this.ctx.fillText(sectionValue * i, 5, y - 8);
        }
    }

    drawLines(vp = this.chartVP, drawX = false) {
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.fillStyle = this.getTextColor();
        this.ctx.font = '12px sans-serif';

        let x0, y0, x1, y1;
        const sectionsCount = vp.width() / 100;
        const sectionSize = Math.floor(this.pointsCount / sectionsCount);
        const sectionWidth = vp.width() / (sectionsCount + 1);
        let sectionNumber = 0;

        for (var i = 0; i < this.pointsCount - 1; i += 1) {
            x0 = this.getX(this.columns.x.value[i], vp) - (vp.offset || 0);
            x1 = this.getX(this.columns.x.value[i + 1], vp) - (vp.offset || 0);
            if (x0 < -50 || x1 > this.canvas.width + 50) continue;

            for (const key of Object.keys(this.columns).filter(k => this.isLineCol(k) && this.columns[k].shown)) {
                y0 = this.getY(this.columns[key].value[i], this.maxY, vp);
                y1 = this.getY(this.columns[key].value[i + 1], this.maxY, vp);

                this.ctx.beginPath();
                this.ctx.strokeStyle = this.data.colors[key];
                this.ctx.moveTo(x0, y0);
                this.ctx.lineTo(x1, y1);
                this.ctx.stroke();
            }

            if (!drawX || i % sectionSize !== 0) continue;

            const date = new Date(this.columns.x.value[i]);
            const text = `${this.months[date.getMonth()]} ${date.getDate()}`;
            this.ctx.fillText(text,
                sectionWidth * sectionNumber++ + sectionWidth / 6,
                this.xAxisVP.y0 + 16);
        }

    }

    drawTrack() {
        // overlay
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(0,100,200,.075)';
        this.ctx.rect(this.timeLineVP.x0, this.trackVP.y0, this.trackVP.x0, this.trackVP.y1);
        this.ctx.rect(this.trackVP.x1, this.trackVP.y0, this.timeLineVP.x1, this.trackVP.y1);
        this.ctx.fill();
        // track
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0,100,200,.2)';
        this.ctx.fillStyle = 'rgba(0,100,200,.2)';
        // left border
        this.ctx.rect(this.trackVP.x0, this.trackVP.y0, this.trackVP.resizer, this.trackVP.height());
        // right border
        this.ctx.rect(this.trackVP.x0 + this.trackVP.width() - this.trackVP.resizer, this.trackVP.y0, this.trackVP.resizer, this.trackVP.height());
        // top border
        this.ctx.rect(this.trackVP.x0 + this.trackVP.resizer, this.trackVP.y0, this.trackVP.width() - this.trackVP.resizer, 3);
        // bottom border
        this.ctx.rect(this.trackVP.x0 + this.trackVP.resizer, this.trackVP.y1 - 3, this.trackVP.width() - this.trackVP.resizer, 3);
        this.ctx.fill();
    }

    clear(x = 0, y = 0, w = this.canvas.width, h = this.canvas.height) {
        this.ctx.clearRect(x, y, w, h);
    }

    getX(value, vp = this.chartVP) {
        return (value - this.columns.x.value[0]) * vp.width() /
            (this.columns.x.value[this.pointsCount - 1] - this.columns.x.value[0]);
    }

    getY(value, max = this.maxY, vp = this.chartVP) {
        const h = vp.height();
        return h - value * h / max + vp.y0;
    }

    getItemIndexByX(x) {
        const endX = this.getX(this.columns.x.value[this.pointsCount - 1]);
        const startX = this.getX(this.columns.x.value[0]);
        const xPercent = x * 100 / (endX - startX);
        const index = Math.floor(xPercent * this.pointsCount / 100);
        return index;
    }

    isLineCol(key) {
        return this.data.types[key] === 'line';
    }

    findClosestIndex(value) {
        let index = -1;
        this.columns.x.value.reduce((minDifference, cur, i) => {
            const diff = Math.abs(cur - value);
            if (diff < minDifference) {
                index = i;
                return diff;
            } else return minDifference;
        }, 0);
        return index;
    }

    setTheme(theme) {
        this.container.classList.remove(`tg-chart-wrapper_${this.theme}`);
        this.container.classList.add(`tg-chart-wrapper_${theme}`);
        this.theme = theme;
        this.draw();
    }

    getTextColor() {
        return this.theme === 'dark' ? '#fff' : '#444';
    }

    getBgColor() {
        return this.theme === 'dark' ? '#242F3E' : '#fff';
    }
}

TgChart.refs = [];
TgChart.isListenerEnabled = false;
TgChart.dom = function (parent, element, className) {
    const el = document.createElement(element);
    parent.appendChild(el);
    if (className) el.className = className;
    return el;
}
TgChart.onWindowResize = function () {
    TgChart.refs.forEach(ref => ref.setViewports());
}

function log(text) {
    if (!window.lalala) {
        window.lalala = TgChart.dom(document.body, 'div');
        window.lalala.style.setProperty('position', 'fixed');
        window.lalala.style.setProperty('left', '0');
        window.lalala.style.setProperty('top', '0');
        window.lalala.style.setProperty('padding', '15px');
        window.lalala.style.setProperty('z-index', '100');
    }
    window.lalala.innerText = text;
}