import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import User from '../../Classes/UserClass';
import Table from '../../Classes/TableClass';
import {connect} from 'react-redux';
import {ARENA_OWNER_ACTION_SENT, MUTE, send_message} from "../../redux_actions/actionTypes";
import {MODALS, openModal} from '../../ui/modals';
import LaunchIcon from '@mui/icons-material/Launch';
import {ListItemButton} from "@mui/material";
import {Commands} from '../../protocol';
import {selectArenaJoinRequests, selectArenaOwnerPending, selectCurrentTable} from '../../selectors';
import {useFrozenRequests} from '../../ui/useFrozenRequests';

// Arena owner's join-request list (spec C2). Rows come only from the server's latest
// dsgArenaJoinRequestsEvent for this table, in seq order, keyed by player. useFrozenRequests
// applies the freeze (spinner overlay, taps ignored) and the minimum interactive window. An
// Accept/Decline marks its row in flight and the whole list ignores taps until the server's
// next snapshot for this table; nothing is removed optimistically.

const styles = theme => ({
   root: {
      width: '100%',
      backgroundColor: 'white',
   },
   icon: {
      fontSize: 30,
   }
});

const mapStateToProps = state => {
   return {
      users: state.users,
      table: selectCurrentTable(state),
      record: selectArenaJoinRequests(state),
      pending: selectArenaOwnerPending(state),
      me: state.me,
      admin: state.admin
   }
};

const mapDispatchToProps = dispatch => {
   return {
      mute: (player) => {
         dispatch({type: MUTE, payload: player});
      },
      show_boot_dialog: (player) => {
         dispatch(openModal(MODALS.BOOT, player));
      },
      accept_player: (player, table) => {
         dispatch({type: ARENA_OWNER_ACTION_SENT, payload: {table: table, player: player}});
         dispatch(send_message(Commands.arenaAccept({playerToAccept: player, table: table})));
      },
      reject_player: (player, table) => {
         dispatch({type: ARENA_OWNER_ACTION_SENT, payload: {table: table, player: player}});
         dispatch(send_message(Commands.arenaReject({playerToReject: player, table: table})));
      },
   }
};

function UnconnectedArenJoinRequests(props) {
   const {classes, users, game, table, record, pending, me, admin, mute, show_boot_dialog} = props;
   const {rows, frozen} = useFrozenRequests(record);
   const locked = frozen || pending !== undefined;
   const tableId = table && table.table;

   if (rows.length === 0) {
      return (
         <Typography variant="body2" color="textSecondary" style={{padding: 16}}>
            No join requests yet
         </Typography>
      );
   }

   return (
      <Box sx={{position: 'relative', width: '100%'}}>
         <List className={classes.root} style={{width: '100%'}} dense={true} aria-busy={locked}>
            {rows.map(({player: name}) => {
               // A requester who already left the room still gets a stable row (plain name);
               // the server removes their request and a new snapshot follows.
               const user = users[name];
               const inFlight = pending !== undefined && pending.player === name;
               return (
                  <ListItem key={name}>
                     <ListItemAvatar onClick={() => {
                        if (!locked && user && name !== me) {
                           mute(name);
                        }
                     }}>
                        <Avatar alt={name} src={user ? user.avatar : undefined}/>
                     </ListItemAvatar>
                     <ListItemText
                        primary={user ? user.userhtml : name}
                        secondary={user ? user.rating(game) : undefined}
                     />
                     {(game && table && (table.owner || admin) && name !== me) &&
                        <LaunchIcon className={classes.icon} onClick={() => {
                           if (!locked) {
                              show_boot_dialog(name);
                           }
                        }}/>
                     }
                     {inFlight ?
                        <Box sx={{flex: 2, display: 'flex', justifyContent: 'center'}}>
                           <CircularProgress size={24}/>
                        </Box>
                        :
                        <>
                           <ListItemButton disabled={locked}
                                           onClick={() => {
                                              if (!locked) {
                                                 props.accept_player(name, tableId);
                                              }
                                           }}
                                           style={{
                                              flex: 1,
                                              justifyContent: 'center',
                                              backgroundColor: '#4caf50',
                                              color: 'white'
                                           }}>
                              <ListItemText primary={'Accept'} primaryTypographyProps={{align: 'center'}}/>
                           </ListItemButton>
                           <ListItemButton disabled={locked}
                                           onClick={() => {
                                              if (!locked) {
                                                 props.reject_player(name, tableId);
                                              }
                                           }}
                                           style={{
                                              flex: 1,
                                              justifyContent: 'center',
                                              backgroundColor: '#f44336',
                                              color: 'white'
                                           }}>
                              <ListItemText primary={'Decline'} primaryTypographyProps={{align: 'center'}}/>
                           </ListItemButton>
                        </>
                     }
                  </ListItem>
               );
            })}
         </List>
         {frozen &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(255, 255, 255, 0.6)',
               zIndex: 1
            }}>
               <CircularProgress/>
            </Box>
         }
      </Box>
   );
}

UnconnectedArenJoinRequests.propTypes = {
   classes: PropTypes.object.isRequired,
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   table: PropTypes.instanceOf(Table),
   record: PropTypes.shape({
      table: PropTypes.number,
      requests: PropTypes.arrayOf(PropTypes.shape({
         player: PropTypes.string,
         seq: PropTypes.number,
      })),
      answersAction: PropTypes.bool,
   }),
   pending: PropTypes.shape({
      table: PropTypes.number,
      player: PropTypes.string,
   }),
   me: PropTypes.string,
   admin: PropTypes.bool,
};

const ArenJoinRequests = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedArenJoinRequests));

export default ArenJoinRequests;
