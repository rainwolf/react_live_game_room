import React, {useState, useEffect} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState, useInterval} from "../../Classes/GameClass";
import Table from "../../Classes/TableClass";
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {playLowTimeCapturesSound} from '../../redux_reducers/utils'

const mapStateToProps = state => {
   return {
      game: state.game,
      table: state.tables[state.table]
   }
};

const Timer = (props) => {
   const {game, table, seat} = props;
   const clock = table.clocks[seat];

   const [state, setState] = useState({
      running: false,
      ...clock,
      time_left: (clock.minutes * 60 + clock.seconds) * 10
   });

   const ticktock = () => {
      setState((prevState) => {
         let newState = {...prevState};
         if (!table.timed ||
            (game.currentPlayer() !== seat) ||
            game.gameState.state !== GameState.State.STARTED) {
            if (newState.running) {
               newState.running = false;
               setState(newState);
            }
            return prevState;
         }
         if (!newState.running) {
            newState.running = true;
            newState.start_time = new Date();
         }
         const now = new Date();
         const passed_tenth_seconds = Math.round((now.getTime() - newState.start_time.getTime()) / 100);
         if (newState.time_left > passed_tenth_seconds) {
            const new_time = newState.time_left - passed_tenth_seconds;
            newState.tenth_seconds = new_time % 600;
            newState.minutes = Math.floor(new_time / 600);
         } else {
            newState.tenth_seconds = 0;
            newState.minutes = 0;
         }
         if (newState.minutes === 0 && newState.tenth_seconds < 120 && state.tenth_seconds >= 120 && table.isMySeat(seat)) {
            playLowTimeCapturesSound();
         }
         return newState;
      });
   };

   useEffect(() => {
      setState((prevState) => {
         const newState = {...prevState, ...clock};
         if (clock.millis) {
            newState.time_left = Math.floor((clock.millis) / 100);
            newState.tenth_seconds = Math.floor(clock.millis / 100) % 600;
            newState.minutes = Math.floor(clock.millis / 60000);
            newState.seconds = Math.floor(clock.millis / 1000) % 60;
         }
         return newState;
      });
   }, [clock.time]);

   useInterval(ticktock, 20);

   const {minutes, tenth_seconds} = state;
   const seconds = Math.floor(tenth_seconds / 10), tenths = tenth_seconds % 10

   return (
      <Paper style={{textAlign: 'center'}}>
         <Typography variant="h3" color={(minutes === 0 && seconds < 12) ? 'error' : 'textPrimary'}>
            {table.timed ? minutes + ':' + (seconds < 10 ? '0' : '') + seconds + (seconds < 12 ? '.' + tenths : '') : '-:-'}
         </Typography>
      </Paper>
   );
};

Timer.propTypes = {
   seat: PropTypes.number.isRequired,
   game: PropTypes.instanceOf(Game).isRequired,
   table: PropTypes.instanceOf(Table).isRequired
};

export default connect(mapStateToProps)(Timer);