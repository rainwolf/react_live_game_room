import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

import {connect} from 'react-redux';
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
      backgroundColor: 'white',
      boxShadow: '10px 10px 10px black',
      padding: '2%',
      outline: 'none',
   },
});


const mapStateToProps = state => {
   return {
      table: state.tables[state.table],
      undo_requested: state.undo_requested
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      }
   }
};


const UnconnectedUndoModal = (props) => {

   const {classes, table, undo_requested} = props;

   const reply_undo = (reply) => {
      props.send_message({dsgUndoReplyTableEvent: {accepted: reply, player: table.me, table: table.table, time: 0}});
   };

   return (
      <div>
         <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            open={undo_requested !== undefined}
            // onClose={this.handleClose}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="modal-title">
                  Undo requested
               </Typography>
               <Typography variant="subtitle1" id="simple-modal-description">
                  {undo_requested} requests to undo their last move.
               </Typography>
               <Button onClick={() => reply_undo(true)}>Accept</Button>
               <Button onClick={() => reply_undo(false)}>Deny</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedUndoModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const UndoModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedUndoModal));

export default UndoModal;
