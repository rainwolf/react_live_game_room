import React, {useState} from 'react';
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
import {send_message, TOGGLE_CREATE_ARENA_MODAL} from "../../redux_actions/actionTypes";
import {game_name} from "../../Classes/utils";

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
      open: state.showCreateArenaModal,
      me: state.me,
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      toggle_create_arena_modal: () => dispatch({type: TOGGLE_CREATE_ARENA_MODAL})
   }
};


const UnconnectedCreateArenaTableModal = (props) => {

   const {classes, me} = props;

   // console.log(JSON.stringify({timed:table.timed,
   //     initialMinutes:table.initialMinutes, incrementalSeconds:table.incrementalSeconds,
   //     rated:table.rated,game:table.game,tableType:table.tableType,
   //     player: table.me, table: table.table, time:0}));

   const send_create_arena_table = () => {
      props.send_message({
         dsgArenaCreateTableEvent:
            {
               timed: timed,
               initialMinutes: initialMinutes, incrementalSeconds: incrementalSeconds,
               rated: rated, game: game, // tableType: privateTable ? 2 : 1,
               playAs: playAs,
               player: me, table: -1, time: 0
            }
      });
      props.toggle_create_arena_modal();
   };

   let [timed, setTimed] = useState(true);
   let [rated, setRated] = useState(false);
   let [initialMinutes, setInitialMinutes] = useState(5);
   let [incrementalSeconds, setIncrementalSeconds] = useState(1);
   // let [privateTable, setPrivateTable] = useState(true);
   let [game, setGame] = useState(1);
   let [playAs, setPlayAs] = useState(1);


   const incrementalSecondsArray = Array.from({length: 60}, (v, i) => i);
   const initialMinutesArray = Array.from({length: 30}, (v, i) => i);

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
                        value={game % 2 === 0 ? game - 1 : game}
                        onChange={event => setGame(event.target.value)}
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
                        {Array.from({length: 32 / 2}, (v, i) => 2*i + 1).map(game =>
                           <MenuItem key={game} value={game}>{game_name(game)}</MenuItem>
                        )}
                     </Select>
                  </ListItem>
                  <ListItem key='rated'>
                     <ListItemText
                        primary="Rated: "
                     />
                     <Switch
                        name='rated'
                        onChange={() => setRated(!rated)}
                        checked={rated}
                        value={rated}
                     />
                  </ListItem>
                  {!rated &&
                  <ListItem key='playAs'>
                     <ListItemText
                        primary="Play as: "
                     />
                     <Select
                        value={playAs}
                        onChange={event => setPlayAs(event.target.value)}
                        input={
                           <OutlinedInput
                              labelwidth={0}
                              name="game"
                              id="outlined-age-simple"
                           />
                        }
                     >
                        <MenuItem key={1} value={1}>player 1</MenuItem>
                        <MenuItem key={2} value={2}>player 2</MenuItem>
                     </Select>

                  </ListItem>}
                  <ListItem key='timed'>
                     <ListItemText
                        primary="Timed: "
                     />
                     <Switch
                        name='timed'
                        checked={timed}
                        value={timed}
                        onChange={() => setTimed(!timed)}
                     />
                  </ListItem>
                  {timed &&
                     <ListItem key='initialminutes'>
                        <ListItemText
                           primary="Initial minutes: "
                        />
                        <Select
                           value={initialMinutes}
                           onChange={event => setInitialMinutes(event.target.value)}
                           input={
                              <OutlinedInput
                                 labelwidth={0}
                                 name="initialMinutes"
                                 id="outlined-age-simple"
                              />
                           }
                        >
                           {initialMinutesArray.map(m =>
                              <MenuItem key={m} value={m}>{m}</MenuItem>
                           )}
                        </Select>
                     </ListItem>}
                  {timed &&
                     <ListItem key='incrementalSeconds'>
                        <ListItemText
                           primary="Incremental Seconds: "
                        />
                        <Select
                           value={incrementalSeconds}
                           onChange={event => setIncrementalSeconds(event.target.value)}
                           input={
                              <OutlinedInput
                                 labelwidth={0}
                                 name="incrementalSeconds"
                                 id="outlined-age-simple"
                              />
                           }
                        >
                           {incrementalSecondsArray.map(m =>
                              <MenuItem key={m} value={m}>{m}</MenuItem>
                           )}
                        </Select>
                     </ListItem>
                  }
                  {/*<ListItem key='private'>*/}
                  {/*   <ListItemText*/}
                  {/*      primary="Private table: "*/}
                  {/*   />*/}
                  {/*   <Switch*/}
                  {/*      name='tableType'*/}
                  {/*      checked={privateTable}*/}
                  {/*      onChange={() => setPrivateTable(!privateTable)}*/}
                  {/*      value={privateTable}*/}
                  {/*   />*/}
                  {/*</ListItem>*/}
               </List>

               {/*<Typography variant="subtitle1" id="simple-modal-description">*/}
               {/*{table.undo_requested} requests to undo their last move.*/}
               {/*</Typography>*/}
               {/*<Button onClick={() => reply_undo(true)}>Accept</Button>*/}
               <Button variant="contained" color="primary" onClick={send_create_arena_table}>Create</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedCreateArenaTableModal.propTypes = {
   classes: PropTypes.object.isRequired,
};

const CreateArenaTableModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedCreateArenaTableModal));

export default CreateArenaTableModal;
