import React, { Component } from 'react';
import './style/App.css';
import c from './constants.js';
import EstimateDisplay from './components/estimate_display';
import IntegralForm from './components/integral_form';
import WebWorker from './worker/WebWorker.js';
import canvas_worker from './worker/canvas_worker.js';
import * as math from 'mathjs';

class App extends Component {
  constructor() {
    super();
    this.state = {
      estimating_pi: true, // true: estimating PI with circle, false: estimating integral of a function
      running: false,
      paused: false,
      outside_count: 0,
      inside_count: 0,
      interval: 1, // interval for generating new dot
      timeout: 60, // initialize runtime to 60 sec
      expression_is_valid: true,
      function_domain_is_valid: true,
      function_is_a_constant: false,
      have_drawn_function: false
    }
  }
  componentDidMount() {
    this.offscreen = document.querySelector('canvas').transferControlToOffscreen();
    this.w = new WebWorker(canvas_worker)
    this.w.postMessage({canvas: this.offscreen, message: 'init'}, [this.offscreen])
    this.w.addEventListener('message', (e) => {
      let message = e.data.message
      if (message === 'new_point') {
        let pointIsInside = e.data.isInside;
        if (pointIsInside) {
          this.setState({inside_count: this.state.inside_count+1})
        } else {
          this.setState({outside_count: this.state.outside_count+1})
        }
      } else if (message === 'paused') {
        this.setState({running: false, paused: true})
      } else if (message === 'starting_integral') {
        let area = e.data.area
        this.setState({area});
      }
    })
  }

  startEstimation = e => {
    if (this.state.estimating_pi) {
      this.w.postMessage({message: 'run', timeout: this.state.timeout})
    } else {
      this.w.postMessage({message: 'run_integral', timeout: this.state.timeout})
    }
    this.setState({running: true, paused: false})
  }
  pauseEstimation = e => {
    this.w.postMessage({message: 'pause'})
    this.setState({running: false, paused: true})
  }
  resetEstimation = e => {
    this.setState({running: false, paused: false, interval: 1, inside_count: 0, outside_count: 0, timeout: 60, expression_is_valid: true, function_is_a_constant: false})
    if (this.state.estimating_pi) {
      this.w.postMessage({message: 'reset'})
    } else {
      this.w.postMessage({message: 'reset'})
      this.w.postMessage({message: 'init_integral'})
      this.setState({have_drawn_function: false})
    }
  }
  updateInterval = e => {
    this.setState({
      interval: e.target.value
    })
    this.w.postMessage({message: 'update_interval', interval: e.target.value})
  }
  updateRunTime = e => {
    let timeout = document.getElementById('run_duration').value;
    this.setState({timeout})
  }
  validateInput = e => {
    let timeout = document.getElementById('run_duration').value;
    if (!timeout || timeout <= 0) {
      this.setState({timeout: c.timeout.MIN_TIME_OUT})
    } else if (timeout > c.timeout.MAX_TIME_OUT) {
      this.setState({timeout: c.timeout.MAX_TIME_OUT})
    }
  }
  validateExpression = (expr) => {
    let fullExpression = 'y=' + expr;
    return new Promise((res, rej) => {
      try {
        math.parse(fullExpression).eval({x: 5}) // testing to see if its a proper function of x
        this.setState({expression_is_valid: true})
        if (isNaN(expr)) { // is not a constant function ex) y=3x
          res()
        } else { // is a constant function ex) y=3
          rej()
        }
      } catch (error) {
        this.setState({expression_is_valid: false})
        document.getElementById('expression').value = "";
        rej(error)
      }
    })
  }
  keyUp = e => {
    if (e.keyCode === 13) document.getElementById('run_duration').blur()
  }
  toggleView = e => {
    this.resetEstimation()
    this.w.postMessage({message: 'reset'})
    if (this.state.estimating_pi) {
      this.w.postMessage({message: 'init_integral'})
    } else {
      if (this.state.have_drawn_function) {
        this.setState({have_drawn_function: false})
      }
    }
    this.setState({
      estimating_pi: !this.state.estimating_pi
    });
  }
  drawFunction = e => {
    let x_start = document.getElementById('x_start').value;
    let x_end = document.getElementById('x_end').value;
    let expr = document.getElementById('expression').value;
    this.validateExpression(expr).then(() => {
      x_start = x_start ? +(x_start) : 0 // casting a string to a number
      x_end = x_end ? +(x_end) : 10
      // checking if x range is okay
      if (x_end <= x_start) {
        this.setState({function_domain_is_valid: false})
      } else {
        this.w.postMessage({
          message: 'draw_equation',
          expr,
          number_of_points: c.integral.NUMBER_OF_POINTS,
          x_start,
          x_end
        });
        this.setState({function_domain_is_valid: true, have_drawn_function: true, function_is_a_constant: false})
      }
    }).catch(e => {
      this.setState({function_is_a_constant: true})
    }) 
  }

  render() {
    return (
      <div className="App">
        <EstimateDisplay isEstimatingPi={this.state.estimating_pi} expr={this.state.expr} area={this.state.area} outside_count={this.state.outside_count} inside_count={this.state.inside_count}/>
        <hr/>
        <canvas id="canvas" width={c.dimensions.WIDTH} height={c.dimensions.HEIGHT}></canvas>
        <br/>
        <button onClick={this.resetEstimation.bind(this)}>reset</button>
        {this.state.estimating_pi ? <button onClick={!this.state.running ? this.startEstimation.bind(this) : this.pauseEstimation.bind(this)}>{!this.state.running ? (this.state.paused ? 'continue' : 'run') : 'pause'}</button> : 
          !this.state.have_drawn_function ? <button onClick={this.drawFunction.bind(this)}>draw function</button> : 
          (this.state.running ? <button onClick={this.pauseEstimation.bind(this)}>pause</button> : <button onClick={this.startEstimation.bind(this)}>{this.state.paused ? 'continue' : 'run'}</button>)
        }
        <br/>
        <div className="slidecontainer">
          <input onChange={this.updateInterval.bind(this)} type="range" min="1" max="100" value={this.state.interval} className="slider" id="intervalRange"/>
          <div className="rate">Generate {this.state.interval} point(s) per second</div>
        </div>
        {this.state.running ? <div>{`running for ${this.state.timeout} seconds`}</div> :
        <div>
          runtime (s):<input value={this.state.timeout} onKeyUp={this.keyUp.bind(this)} onBlur={this.validateInput.bind(this)} onChange={this.updateRunTime.bind(this)} type="number" id="run_duration"></input>
        </div>}
        {!this.state.estimating_pi ? <IntegralForm disabled={this.state.have_drawn_function || this.state.paused}/> : null}
        {!this.state.expression_is_valid ? <p>function is invalid</p> : null}
        {!this.state.function_domain_is_valid ? <p>starting x cannot be less than ending x</p>: null}
        {this.state.function_is_a_constant ? <p>function does not include variable x</p>: null}
        <button onClick={this.toggleView.bind(this)}>toggle view</button>
      </div>
    );
  }
}

export default App;