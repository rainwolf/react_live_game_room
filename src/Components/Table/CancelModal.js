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
        table: state.tables[state.table]
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

    const { classes, table } = props;

    const cancel_reply = (accept) => {
        props.send_message({dsgCancelReplyTableEvent: {accepted: accept, player: table.me, table: table.table, time: 0}});
    };

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={table.cancel_requested !== undefined}
                // onClose={this.handleClose}
            >
                <div style={getModalStyle()} className={classes.paper}>
                    <Typography variant="h6" id="modal-title">
                        Undo requested
                    </Typography>
                    <Typography variant="subtitle1" id="simple-modal-description">
                        {table.cancel_requested} requests to cancel this set.
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
