import React from 'react';
import {connect} from 'react-redux';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {renjuResetOpeningUi} from '../../ui/renjuOpeningUi';

// Live counter for the Branch-B 10-pick. The picks are made on the board (Board.js offering
// mode); placing the 10th candidate auto-sends the offer to the server, so there is no submit
// button here — only the running count and a cancel.
const mapStateToProps = state => ({renjuUi: state.renjuOpeningUi});
const mapDispatchToProps = dispatch => ({reset: () => dispatch(renjuResetOpeningUi())});

const UnconnectedRenjuOfferPanel = ({renjuUi, reset}) => {
   if (renjuUi.mode !== 'offering') return null;
   const n = renjuUi.picks.length;
   return (
      <div style={{padding: '0.5rem'}}>
         <Typography variant="subtitle1">Offer fifth moves: {n}/10 — tap the 10th to send</Typography>
         <Button onClick={reset}>Cancel</Button>
      </div>
   );
};
export default connect(mapStateToProps, mapDispatchToProps)(UnconnectedRenjuOfferPanel);
