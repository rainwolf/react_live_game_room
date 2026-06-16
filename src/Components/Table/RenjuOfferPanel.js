import React from 'react';
import {connect} from 'react-redux';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {send_message} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {selectCurrentTable} from '../../selectors';
import {renjuResetOpeningUi} from '../../ui/renjuOpeningUi';

const mapStateToProps = state => ({table: selectCurrentTable(state), renjuUi: state.renjuOpeningUi});
const mapDispatchToProps = dispatch => ({
   send_message: m => dispatch(send_message(m)),
   reset: () => dispatch(renjuResetOpeningUi()),
});

const UnconnectedRenjuOfferPanel = ({table, renjuUi, send_message, reset}) => {
   if (renjuUi.mode !== 'offering') return null;
   const n = renjuUi.picks.length;
   const submit = () => {
      if (n !== 10) { alert('Select exactly 10 distinct, non-symmetric fifth-move candidates.'); return; }
      send_message(Commands.renjuOffer10({moves: renjuUi.picks, player: table.me, table: table.table}));
      reset();
   };
   return (
      <div style={{padding: '0.5rem'}}>
         <Typography variant="subtitle1">Offer fifth moves: {n}/10</Typography>
         <Button variant="contained" disabled={n !== 10} onClick={submit}>Submit offers</Button>
         <Button onClick={reset}>Cancel</Button>
      </div>
   );
};
export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedRenjuOfferPanel);
