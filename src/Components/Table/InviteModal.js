import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import InviteList from './InviteList';
import { connect } from 'react-redux';
import { send_message } from "../../redux_actions/actionTypes";

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
        users: state.users,
        table: state.table
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        },
    }
};



const UnconnectedInviteModal = (props) => {

    const { classes, me, table, users, send_message, dismiss, open } = props;

    const [player, selectPlayer] = useState('');
    const [message, setMessage] = useState('');
    
    const invite = () => {
        if (player !== '') {
            send_message({dsgInviteTableEvent: {toInvite:player,inviteText:message, player: me, table: table, time: 0}});
            dismiss();
        }
    };

    return (
        <div>
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={open}
                onClose={dismiss}
            >
                <div style={getModalStyle()} className={classes.paper}>
                    <div style={{maxHeight: 200, overflow: 'auto'}}>
                        <InviteList selectHandler={selectPlayer}/>
                    </div>

                    <TextField
                        id="filled-full-width"
                        label="add message"
                        // style={{ margin: 8}}
                        placeholder="optional message"
                        // helperText="Full width!"
                        fullWidth
                        margin="normal"
                        variant="filled"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <Button onClick={invite}>invite &nbsp; {(player !== '' && users[player]) && users[player].userhtml}</Button>
                    <Button onClick={dismiss}>cancel</Button>
                </div>
            </Modal>
        </div>
    );
};

UnconnectedInviteModal.propTypes = {
    classes: PropTypes.object.isRequired,
};

const InviteModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedInviteModal));

export default InviteModal;
