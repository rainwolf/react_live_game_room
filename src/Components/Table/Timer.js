import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState} from "../../redux_reducers/GameClass";
import Table from "../../redux_reducers/TableClass";
import Typography from '@material-ui/core/Typography';


const mapStateToProps = state => {
    return {
        // timers: state.table.clocks,
        game: state.game,
        table: state.tables[state.table]
    }
};

class UnconnectedTimer extends Component {
    
    constructor(props) {
        super(props);
        this.state = {...props.table.clocks[props.seat]};
    }
    
    ticktock = () => {
        if (!this.props.table.timed || 
            (this.props.game.currentPlayer() !== this.props.seat) || 
            this.props.game.gameState.state !== GameState.State.STARTED) {
            return;
        } 
        let newState = { ...this.state };
        if (newState.seconds === 0) {
            if (newState.minutes > 0) {
                newState.seconds = 59;
                newState.minutes -= 1;
            }
        } else {
            newState.seconds -= 1;
        }
        this.setState(newState);
    };


    componentWillReceiveProps(nextProps) {
        this.setState( { ...this.state, ...nextProps.table.clocks[nextProps.seat]} );
    }
    
    
    componentDidMount() {
        let newState = { ...this.state };
        newState.timer = setInterval(this.ticktock, 1000);
        this.setState(newState);
    }

    componentWillUnmount() {
        clearInterval(this.state.timer);       
    }
    
    render () {
        const { minutes, seconds } = this.state;
        return (
            <div>
                <Typography variant="h4">
                    {minutes+':'+seconds}
                </Typography>
            </div>
        );
    };
}

UnconnectedTimer.propTypes = {
    seat: PropTypes.number.isRequired,
    game: PropTypes.instanceOf(Game).isRequired,
    table: PropTypes.instanceOf(Table).isRequired
};


const Timer = connect(mapStateToProps)(UnconnectedTimer);

export default Timer;