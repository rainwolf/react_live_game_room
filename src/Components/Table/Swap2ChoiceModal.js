import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

import {connect} from 'react-redux';
import {send_message} from "../../redux_actions/actionTypes";

function getModalStyle() {
   const top = 70;
   const left = 70;

   return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
   };
}

const styles = theme => ({
   paper: {
      position: 'absolute',
      // width: theme.spacing(50),
      backgroundColor: 'white',
      boxShadow: '10px 10px 10px black',
      padding: '2%',
      outline: 'none',
   },
});


const mapStateToProps = state => {
   return {
      game: state.game,
      table: state.tables[state.table],
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      }
   }
};


const UnconnectedSwap2ChoiceModal = (props) => {

   const {classes, table, game} = props;

   // console.log('modal state: ', JSON.stringify(game.gameState))

   const swap = (s) => {
      props.send_message({
         dsgSwapSeatsTableEvent: {
            swap: s,
            silent: false,
            player: table.me,
            table: table.table,
            time: 0
         }
      });
   };

   const pass = () => {
      props.send_message({
         dsgSwap2PassTableEvent: {
            silent: false,
            player: table.me,
            table: table.table,
            time: 0
         }
      });
   };

   const playAsP1MeansSwap = game.swap2CanPass();

   return (
      <div>
         <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            open={table.mySwap2Choice(game)}
            // onClose={this.handleClose}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="modal-title">
                  Continue this game as... ?
               </Typography>
               <Button onClick={() => swap(playAsP1MeansSwap)}>white (player 1)</Button>
               <Button onClick={() => swap(!playAsP1MeansSwap)}>black (player 2)</Button>
               {
                  playAsP1MeansSwap &&
                  <Button onClick={pass}>Pass the decision</Button>
               }
            </div>
         </Modal>
      </div>
   );
};

UnconnectedSwap2ChoiceModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const Swap2ChoiceModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedSwap2ChoiceModal));

export default Swap2ChoiceModal;
