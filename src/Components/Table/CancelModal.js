import React from 'react';
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
        me: state.me,
        table: state.table,
        cancelRequested: state.cancel_requested
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        }
    }
};



const UnconnectedCancelModal = (props) => {

    const { classes, cancelRequested, table, me } = props;

    const cancel_reply = (accept) => {
        props.send_message({dsgCancelReplyTableEvent: {accepted: accept, player: me, table: table, time: 0}});
    };

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={cancelRequested !== undefined}
                // onClose={this.handleClose}
            >
                <div style={getModalStyle()} className={classes.paper}>
                    <Typography variant="h6" id="modal-title">
                        Cancel requested
                    </Typography>
                    <Typography variant="subtitle1" id="simple-modal-description">
                        {cancelRequested} requests to cancel this set.
                    </Typography>
                    <Button onClick={() => cancel_reply(true)}>Accept</Button>
                    <Button onClick={() => cancel_reply(false)}>Deny</Button>
                </div>
            </Modal>
        </div>
    );
};

UnconnectedCancelModal.propTypes = {
    classes: PropTypes.object.isRequired,
};

const CancelModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedCancelModal));

export default CancelModal;
