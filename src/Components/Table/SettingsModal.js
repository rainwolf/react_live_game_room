import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';

import {connect} from 'react-redux';
import {send_message, TOGGLE_SETTINGS} from "../../redux_actions/actionTypes";

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
   root: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: 'white',
   }
});


const mapStateToProps = state => {
   return {
      table: state.tables[state.table],
      open: state.showSettings
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      toggle_settings: () => dispatch({type: TOGGLE_SETTINGS})
   }
};


const UnconnectedSettingsModal = (props) => {

   const {classes, table} = props;

   // console.log(JSON.stringify({timed:table.timed,
   //     initialMinutes:table.initialMinutes, incrementalSeconds:table.incrementalSeconds,
   //     rated:table.rated,game:table.game,tableType:table.tableType,
   //     player: table.me, table: table.table, time:0}));

   const send_change = (event) => {
      let correction = {[event.target.name]: event.target.value};
      // console.log(JSON.stringify(correction));
      if (event.target.name === 'rated' || event.target.name === 'timed') {
         if (event.target.value === 'false') {
            correction = {[event.target.name]: true};
         } else if (event.target.value === 'true') {
            correction = {[event.target.name]: false};
         }
      } else if (event.target.name === 'tableType') {
         correction = {[event.target.name]: (event.target.value === '1') ? 2 : 1};
      }
      props.send_message({
         dsgChangeStateTableEvent:
            Object.assign({
               timed: table.timed,
               initialMinutes: table.initialMinutes, incrementalSeconds: table.incrementalSeconds,
               rated: table.rated, game: table.game, tableType: table.tableType,
               player: table.me, table: table.table, time: 0
            }, correction)
      });
   };

   const incrementalSeconds = Array.from({length: 60}, (v, i) => i);
   const initialMinutes = Array.from({length: 30}, (v, i) => i + 1);

   return (
      <div>
         <Modal
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
            open={props.open === true}
            // onClose={this.handleClose}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="h6" id="modal-title">
                  Table settings
               </Typography>
               <List className={classes.root}>
                  <ListItem key='game'>
                     <ListItemText
                        primary="Game: "
                     />
                     <Select
                        onChange={send_change}
                        value={table.game}
                        input={
                           <OutlinedInput
                              labelwidth={0}
                              name="game"
                              id="outlined-age-simple"
                           />
                        }
                     >
                        {/*{[1,3,5,7,9,11,13,15,17,19,21,23].map(game =>*/}
                        {/*<MenuItem key={game} value={game}>{table.game_name(game)}</MenuItem>*/}
                        {/*)}*/}
                        {Array.from({length: 28}, (v, i) => i + 1).map(game =>
                           <MenuItem key={game} value={game}>{table.game_name(game)}</MenuItem>
                        )}
                     </Select>
                  </ListItem>
                  <ListItem key='rated'>
                     <ListItemText
                        primary="Rated: "
                     />
                     <Switch
                        name='rated'
                        checked={table.rated}
                        onChange={send_change}
                        value={table.rated}
                     />
                  </ListItem>
                  <ListItem key='timed'>
                     <ListItemText
                        primary="Timed: "
                     />
                     <Switch
                        name='timed'
                        checked={table.timed}
                        onChange={send_change}
                        value={table.timed}
                     />
                  </ListItem>
                  {table.timed &&
                     <ListItem key='initialminutes'>
                        <ListItemText
                           primary="Initial minutes: "
                        />
                        <Select
                           onChange={send_change}
                           value={table.initialMinutes}
                           input={
                              <OutlinedInput
                                 labelwidth={0}
                                 name="initialMinutes"
                                 id="outlined-age-simple"
                              />
                           }
                        >
                           {initialMinutes.map(m =>
                              <MenuItem key={m} value={m}>{m}</MenuItem>
                           )}
                        </Select>
                     </ListItem>}
                  {table.timed &&
                     <ListItem key='incrementalSeconds'>
                        <ListItemText
                           primary="Incremental Seconds: "
                        />
                        <Select
                           onChange={send_change}
                           value={table.incrementalSeconds}
                           input={
                              <OutlinedInput
                                 labelwidth={0}
                                 name="incrementalSeconds"
                                 id="outlined-age-simple"
                              />
                           }
                        >
                           {incrementalSeconds.map(m =>
                              <MenuItem key={m} value={m}>{m}</MenuItem>
                           )}
                        </Select>
                     </ListItem>
                  }
                  <ListItem key='private'>
                     <ListItemText
                        primary="Private table: "
                     />
                     <Switch
                        name='tableType'
                        checked={table.tableType === 2}
                        onChange={send_change}
                        value={table.tableType}
                     />
                  </ListItem>
               </List>

               {/*<Typography variant="subtitle1" id="simple-modal-description">*/}
               {/*{table.undo_requested} requests to undo their last move.*/}
               {/*</Typography>*/}
               {/*<Button onClick={() => reply_undo(true)}>Accept</Button>*/}
               <Button variant="contained" color="primary" onClick={props.toggle_settings}>Done</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedSettingsModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const SettingsModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedSettingsModal));

export default SettingsModal;
