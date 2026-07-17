import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

import {connect} from 'react-redux';
import {send_message, DISMISS_DRAW_MODAL} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {selectCurrentTable} from '../../selectors';

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
      table: selectCurrentTable(state),
      draw_requested: state.draw_requested
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      dismiss: () => {
         dispatch({type: DISMISS_DRAW_MODAL});
      },
   }
};


const UnconnectedDrawOfferModal = (props) => {

   const {classes, table, draw_requested} = props;

   const accept = () => {
      props.send_message(Commands.renjuAcceptDraw({player: table.me, table: table.table}));
   };
   const reject = () => {
      props.send_message(Commands.renjuRejectDraw({player: table.me, table: table.table}));
   };

   return (
      <div>
         <Modal
            aria-labelledby="draw-offer-title"
            aria-describedby="draw-offer-description"
            open={draw_requested !== undefined}
            onClose={props.dismiss}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="draw-offer-title">
                  Draw offered
               </Typography>
               <Typography variant="subtitle1" id="draw-offer-description">
                  {draw_requested} offers a draw. Playing a move also declines it.
               </Typography>
               <Button onClick={accept}>Accept</Button>
               <Button onClick={reject}>Reject</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedDrawOfferModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const DrawOfferModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedDrawOfferModal));

export default DrawOfferModal;
