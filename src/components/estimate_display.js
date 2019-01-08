import React, { Component } from 'react'

class EstimateDisplay extends Component {
    calculateEstimate = (inside_count, outside_count) => {
        if (inside_count === 0 && outside_count === 0) {
            return 0
        } else if (inside_count === 0) {
            return 0
        } else if (outside_count === 0) {
            return 'inf'
        } else {
            if (this.props.isEstimatingPi) {
                return (inside_count / (inside_count + outside_count) * 4).toFixed(6) // multiply by 4 bc ... pi/4 = ratio
            } else {
                return (this.props.area * inside_count / (inside_count + outside_count)).toFixed(6)
            }
        }
    }
    render() {
        return (
            <div>
                <h1 id="estimate_value">Estimate: {this.calculateEstimate(this.props.inside_count, this.props.outside_count)}</h1>
            </div>
        )
    }
}

export default EstimateDisplay