import React, { Component } from 'react'

class IntegralForm extends Component {
    render() {
        return (
            <div>
                function: y =<input disabled={this.props.disabled} type="text" id="expression" placeholder="3x^2-10"/>
                <br/>
                starting x:<input disabled={this.props.disabled} type="number" id="x_start" placeholder="default: 0"/>
                <br/>
                finishing x:<input disabled={this.props.disabled} type="number" id="x_end" placeholder="default: 10"/>
                <br/>
            </div>
        )
    }
}

export default IntegralForm