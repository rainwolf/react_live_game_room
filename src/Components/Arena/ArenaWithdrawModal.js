import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import {connect} from 'react-redux';
import {ARENA_REQUEST_SENT, send_message} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {MODALS, closeModal, modalProps} from '../../ui/modals';

// Arena requester: confirm before withdrawing a pending join request (spec C3). The lobby list
// is not frozen and a withdraw blocks re-requests until the table's next game, so a mis-tap
// must not withdraw. On confirm the card goes busy until a dsgArenaMyRequestsEvent without
// the table arrives. If the request ends while the dialog is open, the reducer
// (arenaMyRequests) closes it, so Withdraw is never sent for a request that is gone.

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
      table: modalProps(state, MODALS.ARENA_WITHDRAW),
   }
};

const mapDispatchToProps = dispatch => {
   return {
      withdraw: (table) => {
         dispatch(send_message(Commands.arenaWithdraw({table: table})));
         dispatch({type: ARENA_REQUEST_SENT, payload: {table: table, op: 'withdraw'}});
         dispatch(closeModal(MODALS.ARENA_WITHDRAW));
      },
      dismiss: () => {
         dispatch(closeModal(MODALS.ARENA_WITHDRAW));
      }
   }
};

const UnconnectedArenaWithdrawModal = (props) => {
   const {classes, table, withdraw, dismiss} = props;

   return (
      <div>
         <Modal
            aria-labelledby="arena-withdraw-title"
            open={table !== undefined}
            onClose={dismiss}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="subtitle1" id="arena-withdraw-title">
                  Withdraw your request to table {table}? You won't be able to request it again until its next game.
               </Typography>
               <Button onClick={() => withdraw(table)}>Withdraw</Button>
               <Button onClick={dismiss}>Cancel</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedArenaWithdrawModal.propTypes = {
   classes: PropTypes.object.isRequired,
   table: PropTypes.number,
};

const ArenaWithdrawModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedArenaWithdrawModal));

export default ArenaWithdrawModal;
