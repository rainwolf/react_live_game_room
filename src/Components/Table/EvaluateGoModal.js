import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';

import { connect } from 'react-redux';
import {send_message} from "../../redux_actions/actionTypes";

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
        width: theme.spacing.unit * 50,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[5],
        padding: theme.spacing.unit * 4,
        outline: 'none',
    },
});


const mapStateToProps = state => {
    return {
        game: state.game,
        table: state.tables[state.table],
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        }
    }
};



const UnconnectedEvaluateGoModal = (props) => {

    const { classes, table, game } = props;

    // console.log('modal state: ', JSON.stringify(game.gameState))
    
    const accept = (s) => {
        if (s) {
            const move = game.gridSize*game.gridSize;
            props.send_message({dsgMoveTableEvent: {move: move, moves: [move], player: table.me, table: table.table, time: 0}});
        } else {
            props.send_message({dsgRejectGoStateEvent:{player: table.me, table: table.table, time:0}});
        }
    };
    
    let scores = [0,0,0];
    if (game.isGo()) {
        scores = game.goScores();
    } 

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={game.evaluateScore() && table.isMyTurn(game)}
                // onClose={this.handleClose}
            >
                <div style={getModalStyle()} className={classes.paper}>
                    <Typography variant="h5" id="modal-title">
                        Go score
                    </Typography>
                    <Typography variant="h6" id="modal-title">
                        Player 1 (black) scored {scores[1]}
                    </Typography>
                    <Typography variant="h6" id="modal-title">
                        Player 2 (white) scored {scores[2] + 7.5}
                    </Typography>
                    <Button onClick={() => accept(true)}>Accept</Button>
                    <Button onClick={() => accept(false)}>reject</Button>
                </div>
            </Modal>
        </div>
    );
};

UnconnectedEvaluateGoModal.propTypes = {
    classes: PropTypes.object.isRequired,
};

const EvaluateGoModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedEvaluateGoModal));

export default EvaluateGoModal;
