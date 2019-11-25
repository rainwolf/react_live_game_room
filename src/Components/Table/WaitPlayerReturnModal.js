import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { GameState } from "../../Classes/GameClass";
import Table from '../../Classes/TableClass';
import {send_message} from "../../redux_actions/actionTypes";
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import { DISMISS_WAITING_MODAL } from '../../redux_actions/actionTypes';

function getModalStyle() {
    const top = 50;
    const left = 50;

    return {
        top: `${top}%`,
        left: `${left}%`,
        transform: `translate(-${top}%, -${left}%)`,
    };
}

const styles = theme => ({
    paper: {
        position: 'absolute',
        width: theme.spacing(50),
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing(4),
        outline: 'none',
    },
});


const mapStateToProps = state => {
    return {
        show: state.game.gameState.state === GameState.State.PAUSED,
        table: state.tables[state.table],
        waiting_modal: state.waiting_modal
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        },
        close_modal: () => {
            dispatch({type: DISMISS_WAITING_MODAL});
        }
    }
};

class UnconnectedWaitPlayerReturnModal extends Component {

    constructor(props) {
        super(props);
        this.state = { seconds: 60, closed: false };
        this.state.time_left = this.state.seconds;
    }

    ticktock = () => {
        let newState = { ...this.state };
        if (!this.props.show) {
            if (newState.running) {
                newState.running = false;
                newState.seconds = 60;
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
            newState.seconds = new_time;
        } else {
            newState.seconds = 0;
        }
        this.setState(newState);
    };

    // componentWillReceiveProps(nextProps) {
    //     const newTime = nextProps.table.clocks[nextProps.seat];
    //     const newState = { ...this.state, ...newTime };
    //     newState.time_left = newState.minutes * 60 + newState.seconds;
    //     this.setState( newState );
    // }


    componentDidMount() {
        let newState = { ...this.state };
        newState.timer = setInterval(this.ticktock, 300);
        this.setState(newState);
    }

    componentWillUnmount() {
        clearInterval(this.state.timer);
    }

    resign = () => {
        this.props.send_message({dsgResignTableEvent: {player: this.props.table.me, table: this.props.table.table, time: 0}});
    };
    
    render () {
        const { seconds } = this.state;
        const { show, classes, waiting_modal } = this.props;
        
        return (
            <div>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={show && !waiting_modal}
                    onClose={this.props.close_modal}
                >
                    <div style={getModalStyle()} className={classes.paper}>
                        <Typography variant="h6" id="modal-title">
                            Your opponent appears to be disconnected for some reason. For now you have the option of resigning the game.
                        </Typography>
                        <Typography variant="h6" id="modal-title">
                            If they do not return in {seconds} seconds, you will have the option of either 
                            cancelling the game, or force your opponent to resign and claim victory. 
                        </Typography>
                        <Button onClick={this.resign}>resign myself</Button>
                        <Button onClick={this.props.close_modal}>dismiss</Button>
                    </div>
                </Modal>
            </div>
        );
    };
};



UnconnectedWaitPlayerReturnModal.propTypes = {
    show: PropTypes.bool.isRequired,
    table: PropTypes.instanceOf(Table).isRequired
};


const WaitPlayerReturnModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedWaitPlayerReturnModal));

export default WaitPlayerReturnModal;