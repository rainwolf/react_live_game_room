import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

import {connect} from 'react-redux';
import {send_message, SHOW_BOOT_DIALOG} from "../../redux_actions/actionTypes";

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
      // boxShadow: theme.shadows[5],
      padding: '2%',
      outline: 'none',
   },
});


const mapStateToProps = state => {
   return {
      toBoot: state.showBootDialog,
      table: state.table,
      me: state.me,
      admin: state.admin
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      dismiss: () => {
         dispatch({type: SHOW_BOOT_DIALOG});
      }
   }
};


const UnconnectedBootModal = (props) => {

   const {classes, toBoot, me, table, send_message, dismiss} = props;

   const boot = () => {
      send_message({dsgBootTableEvent: {toBoot: toBoot, player: me, table: table, time: 0}});
      dismiss();
   };

   return (
      <div>
         <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            open={toBoot !== undefined}
            // onClose={this.handleClose}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="modal-title">
                  Boot {toBoot}?
               </Typography>
               <Typography variant="subtitle1" id="simple-modal-description">
                  Are you sure?
               </Typography>
               <Button onClick={boot}>yes, boot {toBoot}</Button>
               <Button onClick={dismiss}>no, cancel</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedBootModal.propTypes = {
   classes: PropTypes.object.isRequired,
   toBoot: PropTypes.string,
   me: PropTypes.string,
   table: PropTypes.number
};

const BootModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedBootModal));

export default BootModal;
