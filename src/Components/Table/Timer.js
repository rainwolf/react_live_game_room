import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState} from "../../redux_reducers/GameClass";
import Table from "../../redux_reducers/TableClass";
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';


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
        this.state = { running: false, ...props.table.clocks[props.seat]};
        this.state.time_left = this.state.minutes * 60 + this.state.seconds;
    }
    
    ticktock = () => {
        let newState = { ...this.state };
        if (!this.props.table.timed || 
            (this.props.game.currentPlayer() !== this.props.seat) || 
            this.props.game.gameState.state !== GameState.State.STARTED) {
            if (newState.running) {
                newState.running = false;
                this.setState(newState);
            } 
            return;
        }
        if (!newState.running) {
            newState.running = true;
            newState.start_time = new Date();
        }
        const now = new Date();
        const passed_seconds = Math.round((now.getTime() - newState.start_time.getTime())/1000);
        // const time_left = newState.minutes + newState.seconds*60;
        if (newState.time_left > passed_seconds) {
            const new_time = newState.time_left - passed_seconds;
            newState.seconds = new_time % 60;
            newState.minutes = Math.floor(new_time / 60);
        } else {
            newState.seconds = 0;
            newState.minutes = 0;
        }
        this.setState(newState);
    };


    
    componentWillReceiveProps(nextProps) {
        const newTime = nextProps.table.clocks[nextProps.seat];
        const newState = { ...this.state, ...newTime };
        newState.time_left = newState.minutes * 60 + newState.seconds;
        this.setState( newState );
    }
    
    
    componentDidMount() {
        let newState = { ...this.state };
        newState.timer = setInterval(this.ticktock, 300);
        this.setState(newState);
    }

    componentWillUnmount() {
        clearInterval(this.state.timer);       
    }
    
    render () {
        const { minutes, seconds } = this.state;
        return (
            <Paper style={{textAlign: 'center'}}>
                <Typography variant="h3">
                    {this.props.table.timed ? minutes+':'+(seconds<10?'0':'')+seconds : '-:-'}
                </Typography>
            </Paper>
        );
    };
};

UnconnectedTimer.propTypes = {
    seat: PropTypes.number.isRequired,
    game: PropTypes.instanceOf(Game).isRequired,
    table: PropTypes.instanceOf(Table).isRequired
};


const Timer = connect(mapStateToProps)(UnconnectedTimer);

export default Timer;