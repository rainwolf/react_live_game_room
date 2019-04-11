import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';

import { connect } from 'react-redux';
import {send_message} from "../../redux_actions/actionTypes";

function getModalStyle() {
    const top = 70;
    const left = 70;

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



const UnconnectedDPenteChoiceModal = (props) => {

    const { classes, table, game } = props;

    // console.log('modal state: ', JSON.stringify(game.gameState))
    
    const swap = (s) => {
        props.send_message({dsgSwapSeatsTableEvent:{swap: s, silent:false, player: table.me, table: table.table, time:0}});
    };

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={table.myDPenteChoice(game)}
                // onClose={this.handleClose}
            >
                <div style={getModalStyle()} className={classes.paper}>
                    <Typography variant="h6" id="modal-title">
                        Continue this game as... ?
                    </Typography>
                    <Button onClick={() => swap(true)}>white (player 1)</Button>
                    <Button onClick={() => swap(false)}>black (player 2)</Button>
                </div>
            </Modal>
        </div>
    );
};

UnconnectedDPenteChoiceModal.propTypes = {
    classes: PropTypes.object.isRequired,
};

const DPenteChoiceModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedDPenteChoiceModal));

export default DPenteChoiceModal;
