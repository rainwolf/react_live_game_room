import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

import {connect} from 'react-redux';
import {send_message} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {selectCurrentTable} from '../../selectors';
import {GameState} from '../../game/gameState';
import {renjuModalButtons} from '../../game/openingPhase';
import {renjuBeginPlace, renjuBeginOffer} from '../../ui/renjuOpeningUi';

function getModalStyle() {
   const top = 70, left = 70;
   return {top: `${top}%`, left: `${left}%`, transform: `translate(-${top}%, -${left}%)`};
}
const styles = () => ({
   paper: {position: 'absolute', backgroundColor: 'white', boxShadow: '10px 10px 10px black', padding: '2%', outline: 'none'},
});
const mapStateToProps = state => ({game: state.game, table: selectCurrentTable(state), renjuUi: state.renjuOpeningUi});
const mapDispatchToProps = dispatch => ({
   send_message: m => dispatch(send_message(m)),
   beginPlace: () => dispatch(renjuBeginPlace()),
   beginOffer: () => dispatch(renjuBeginOffer()),
});

const UnconnectedRenjuChoiceModal = (props) => {
   const {classes, table, game, renjuUi} = props;
   const started = game.gameState.state === GameState.State.STARTED;
   const n = game.moves.length;
   const buttons = renjuModalButtons(n, game.gameState.renjuState, started);
   // open only when it's my swap/branch choice AND no board interaction is armed
   const open = table.myRenjuChoice(game) && renjuUi.mode === 'idle';

   const takeOver = () => props.send_message(Commands.renjuSwap({swap: true, move: 0, player: table.me, table: table.table}));
   const decline = () => {
      if (n === 5) {
         // window-5 decline is BARE (no bundled stone); move 6 follows as a normal move
         props.send_message(Commands.renjuSwap({swap: false, move: 0, player: table.me, table: table.table}));
      } else {
         props.beginPlace(); // arm the board for the box-constrained decline/Branch-A stone
      }
   };
   const offer = () => props.beginOffer(); // arm the board for the 10-pick

   return (
      <div>
         <Modal aria-labelledby="renju-modal-title" open={open}>
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="renju-modal-title">Taraguchi opening — your choice:</Typography>
               {buttons.swap && <Button onClick={takeOver}>Take over (swap sides)</Button>}
               {buttons.declinePlace && <Button onClick={decline}>{n === 5 ? 'Decline swap' : (n === 4 ? 'Place 5th move' : 'Decline & place')}</Button>}
               {buttons.offer10 && <Button onClick={offer}>Offer 10 fifth-moves</Button>}
            </div>
         </Modal>
      </div>
   );
};
UnconnectedRenjuChoiceModal.propTypes = {classes: PropTypes.object.isRequired};

const RenjuChoiceModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedRenjuChoiceModal));
export default RenjuChoiceModal;
