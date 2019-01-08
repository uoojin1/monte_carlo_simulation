/* eslint-disable no-restricted-globals */
export default () => {
    self.importScripts('https://unpkg.com/mathjs@5.4.0/dist/math.min.js') // importing math to webworker
    self.canvas = null;
    self.ctx = null;
    self.timer = null;
    self.interval = 1;
    self.y_scale = 1;
    self.expr = null;
    self.addEventListener('message', (e) => {
        let message = e.data.message;
        switch (message) {
            case 'init':
                initialize(e)
                break;
            case 'init_integral':
                initializeIntegral()
                break;
            case 'run':
                run()
                timeout(e)
                break;
            case 'run_integral':
                runIntegral();
                timeout(e);
                break;
            case 'pause':
                pause();
                break;
            case 'reset':
                reset()
                break;
            case 'update_interval':
                updateInterval(e)
                break;
            case 'draw_equation':
                drawEquation(e)
                break;
            default:
                break;
        }
    });

    let clearRunnerAndTimer = () => {
        clearTimeout(self.runner)
        clearTimeout(self.timer)
    }
    let initialize = (e) => {
        self.canvas = e.data.canvas;
        self.ctx = self.canvas.getContext('2d')
        clearRunnerAndTimer();
        drawShape('circle', self.canvas.width/2, self.canvas.height/2, self.canvas.width/2)
    }
    let initializeIntegral = () => {
        clearRunnerAndTimer()
        self.ctx.clearRect(0,0,self.canvas.width,self.canvas.height)
    }
    let timeout = (e) => {
        let duration = e.data.timeout
        if (duration) {
            self.timer = setTimeout(pause, duration*1000) // seconds
        }
    }
    let runIntegral = () => {
        const performAnimation = () => {
            let coords = generateCoordinate();
            let scalingFactor = self.canvas.width;
            let isInside = isInsideCurve(coords.x, coords.y);
            let color = isInside ? 'blue' : 'red';
            postMessage({message: 'new_point', isInside}) // return this information to the original thread so that it can update the scoreboard
            drawShape('dot', coords.x*scalingFactor, 500-coords.y*scalingFactor, 2, 0, color)
            self.runner = setTimeout(performAnimation, 1000/self.interval)
        }
        let area = self.x_distance * self.y_distance;
        postMessage({message: 'starting_integral', area})
        self.runner = setTimeout(performAnimation, 1000/self.interval)
    }
    let run = () => {
        const performAnimation = () => {
            let coords = generateCoordinate();
            let scalingFactor = self.canvas.width;
            let isInside = isInsideCircle(coords.x*2-1, coords.y*2-1)
            postMessage({message: 'new_point', isInside}) // return this information to the original thread so that it can update the scoreboard
            let color = isInside ? 'blue' : 'red';
            drawShape('dot', coords.x*scalingFactor, coords.y*scalingFactor, 2, 0, color)
            self.runner = setTimeout(performAnimation, 1000/self.interval);
        }
        self.runner = setTimeout(performAnimation, 1000/self.interval);
    }
    let pause = () => {
        clearRunnerAndTimer();
        postMessage({message: 'paused'})
    }
    let reset = () => {
        clearRunnerAndTimer();
        self.interval = 1;
        self.ctx.clearRect(0,0,self.canvas.width,self.canvas.height)
        drawShape('circle', self.canvas.width/2, self.canvas.height/2, self.canvas.width/2)
    }
    let updateInterval = (e) => {
        self.interval = e.data.interval
    }

    // canvas related functions
    let isInsideCircle = (x,y) => { // x and y should be between -1 and 1 so that the circle inside is a unit circle
        return Math.pow(x,2) + Math.pow(y,2) <= 1 ? true : false
    }
    let isInsideCurve = (x,y) => {
        let scaled_x = x * self.x_distance + self.x_min;
        let scaled_y = y * self.y_distance + self.y_min
        let func = self.math.parse(self.expr).compile()
        let generated_y = func.eval({x: scaled_x})
        if (generated_y > 0) {
            return scaled_y <= generated_y && scaled_y >=0 ? true: false;
        } else {
            return scaled_y >= generated_y && scaled_y < 0 ? true: false;
        }
    } 
    let generateCoordinate = () => {
        let x = Math.random(); // ranges from 0 to 1
        let y = Math.random();
        return {x, y}
    }
    let drawShape = (type='rect', x=0, y=0, w_or_r=0, h=0, color='black') => {
        let canvas = self.canvas;
        let ctx = self.ctx;
        if (!canvas) return;
        switch (type) {
            case 'rect':
                if (ctx) ctx.fillRect(x,y,w_or_r,h,color)
                break;
            case 'circle':
                if (ctx) {
                    ctx.beginPath();
                    ctx.arc(x, y, w_or_r, 0, 2*Math.PI);
                    ctx.stroke()
                }
                break;
            case 'dot':
                if (ctx) {
                    ctx.beginPath();
                    ctx.arc(x, y, w_or_r, 0, Math.PI*2);
                    ctx.fillStyle = color
                    ctx.fill();
                    ctx.closePath();
                    ctx.fillStyle = 'black'
                }
                break;
            default:
                break;
        }
    }
    let drawEquation = e => {
        self.expr = e.data.expr
        let number_of_points = e.data.number_of_points;
        let x_start = e.data.x_start ? e.data.x_start : 0;
        let x_end = e.data.x_end ? e.data.x_end : 10;
        self.x_distance = x_end - x_start;
        self.x_min = x_start;
        let dx = (self.x_distance)/number_of_points;
        let canvas_max = self.canvas.width;
        let func = self.math.parse(self.expr).compile()
        let y_max = 0;
        let y_min = 0;
        self.ctx.beginPath()
        self.ctx.moveTo(0, canvas_max)
        // need to find the minimum and maximum values of y to scale the drawing accordingly
        // using derivative would be more time efficient
        for (let i=0; i<=number_of_points; i++) {
            let y = func.eval({x: self.x_min + i*dx})
            if (y > y_max) y_max = y;
            if (y < y_min) y_min = y;
        }
        self.y_distance = y_max - y_min;
        self.y_scale = canvas_max/(self.y_distance);
        self.y_min = y_min;
        for (let i=0; i<=number_of_points; i++) { // actually draw the line (correctly scaled)
            let y = func.eval({x: x_start + i*dx})
            let canvas_x = canvas_max/number_of_points * i; // now drawing on canvas with correct scale
            self.ctx.lineTo(canvas_x, canvas_max-(y*self.y_scale - y_min*self.y_scale)) // scaling the y coordinate so that min y and max y fit on canvas
        }
        self.ctx.stroke()
        if (y_min < 0) { // if function value goes under 0, I'll need to show a horizontal line representing the x-axis
            self.ctx.moveTo(0,canvas_max - (-1*y_min)*self.y_scale)
            self.ctx.lineTo(canvas_max,canvas_max - (-1*y_min)*self.y_scale)
            self.ctx.setLineDash([5, 3]);
            self.ctx.stroke()
            self.ctx.setLineDash([]);
        }
    }
}