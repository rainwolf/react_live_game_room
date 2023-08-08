import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import {connect} from 'react-redux';
import {send_message, REPLIED_INVITATION} from "../../redux_actions/actionTypes";

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
      backgroundColor: 'white',
      boxShadow: '5px 5px 5px black',
      padding: '2%',
      outline: 'none',
   },
});


const mapStateToProps = state => {
   return {
      me: state.me,
      users: state.users,
      invitation: state.received_invitation,
      table: state.table
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      dismiss: () => {
         dispatch({type: REPLIED_INVITATION})
      }
   }
};


const UnconnectedInvitationResponseModal = (props) => {

   const {classes, invitation, table, users, send_message, dismiss} = props;

   const [message, setMessage] = useState('');

   const reply = (accept, ignore) => {
      send_message({
         dsgInviteResponseTableEvent: {
            toPlayer: invitation.by,
            responseText: message,
            accept: accept,
            ignore: ignore,
            table: invitation.table,
            time: 0
         }
      })
      if (accept) {
         if (table) {
            send_message({dsgExitTableEvent: {forced: false, booted: false, table: table, time: 0}});
         }
         send_message({dsgJoinTableEvent: {table: invitation.table, time: 0}});
      }
      dismiss();
   };

   if (invitation !== undefined && users[invitation.by]) {
      return (
         <div>
            <Modal
               aria-labelledby="simple-modal-title"
               aria-describedby="simple-modal-description"
               open={invitation !== undefined && users[invitation.by] !== undefined}
            >
               <div style={getModalStyle()} className={classes.paper}>
                  <Typography variant="subtitle1" id="simple-modal-description">
                     {users[invitation.by].userhtml} invites you to their table.
                  </Typography>
                  {invitation.message !== '' &&
                     <Typography variant="h6">
                        message:
                     </Typography>
                  }
                  {invitation.message !== '' &&
                     <Typography variant="body1">
                        {invitation.message}
                     </Typography>
                  }

                  <TextField
                     id="filled-full-width"
                     label="add message"
                     // style={{ margin: 8}}
                     placeholder="optional reply message"
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
                  <Button onClick={() => reply(true, false)}>Accept</Button>
                  <Button onClick={() => reply(false, false)}>Decline</Button>
                  <Button onClick={() => reply(false, true)}>Ignore future invitations/messages</Button>
               </div>
            </Modal>
         </div>
      );
   } else {
      return "";
   }
};

UnconnectedInvitationResponseModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const InvitationResponseModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedInvitationResponseModal));

export default InvitationResponseModal;
