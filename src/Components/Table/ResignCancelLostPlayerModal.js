import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {send_message} from "../../redux_actions/actionTypes";
import Button from '@mui/material/Button';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import {DISMISS_WAITING_MODAL} from '../../redux_actions/actionTypes';

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
      show: state.time_up_resign_cancel !== undefined,
      table: state.tables[state.table],
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

const UnconnectedResignCancelLostPlayerModal = (props) => {


   const resign = () => {
      props.send_message({dsgResignTableEvent: {player: props.table.me, table: props.table.table, time: 0}});
   };
   const force_resign = () => {
      props.send_message({
         dsgForceCancelResignTableEvent: {
            action: 2,
            player: props.table.me,
            table: props.table.table,
            time: 0
         }
      });
   };
   const cancel = () => {
      props.send_message({
         dsgForceCancelResignTableEvent: {
            action: 1,
            player: props.table.me,
            table: props.table.table,
            time: 0
         }
      });
   };

   const {show, classes} = props;

   return (
      <div>
         <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            open={show}
            // onClose={props.close_modal}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="modal-title">
                  Your opponent has not returned for a full minute.
               </Typography>
               <Typography variant="h6" id="modal-title">
                  You can now resign yourself, force resign your opponent, or cancel the set/game.
               </Typography>
               <Button onClick={resign}>resign myself</Button>
               <Button onClick={force_resign}>force resign opponent</Button>
               <Button onClick={cancel}>cancel set/game</Button>
            </div>
         </Modal>
      </div>
   );
};


UnconnectedResignCancelLostPlayerModal.propTypes = {
   show: PropTypes.bool.isRequired,
};


const ResignCancelLostPlayerModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedResignCancelLostPlayerModal));

export default ResignCancelLostPlayerModal;