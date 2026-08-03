import React, {useRef, useState} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Game, useInterval} from "../../Classes/GameClass";
import Table from "../../Classes/TableClass";
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {AudioService} from '../../notifications/audio'
import {selectCurrentTable} from '../../selectors';
import {remainingTenths, splitTenths, tickClock} from './clockDisplay';

const mapStateToProps = state => {
   return {
      game: state.game,
      table: selectCurrentTable(state)
   }
};

const Timer = (props) => {
   const {game, table, seat} = props;
   const clock = table.clocks[seat];

   // The component owns no copy of the clock VALUE -- only the interpolation anchor, keyed on the
   // clock object, which changes whenever the server sends a new value AND whenever seats swap
   // (TableClass.swap() hands each seat the other's clock object). A countdown therefore cannot be
   // stranded on the wrong player. See clockDisplay.js for why `clock.time` is not a usable key.
   const episode = useRef(null);
   const shown = useRef(remainingTenths(clock, 0));
   const [tenthsLeft, setTenthsLeft] = useState(shown.current);

   const ticktock = () => {
      const {episode: next, tenthsLeft: left, chime} =
         tickClock(episode.current, {
            clock,
            running: table.clockRunning(game, seat),
            now: Date.now(),
            prevTenths: shown.current,
         });
      episode.current = next;
      shown.current = left;
      if (chime && table.isMySeat(seat)) {
         AudioService.play('lowTime');
      }
      setTenthsLeft(left);
   };

   useInterval(ticktock, 20);

   const {minutes, seconds, tenths} = splitTenths(tenthsLeft);

   return (
      <Paper style={{textAlign: 'center'}}>
         <Typography variant="h3" color={(minutes === 0 && seconds < 12) ? 'error' : 'textPrimary'}>
            {table.timed ? minutes + ':' + (seconds < 10 ? '0' : '') + seconds +
               (minutes === 0 && seconds < 12 ? '.' + tenths : '') : '-:-'}
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
