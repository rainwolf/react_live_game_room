import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
// import Typography from '@mui/material/Typography';
import User from '../../Classes/UserClass';
import Table from '../../Classes/TableClass';
import {connect} from 'react-redux';
import {REMOVE_ARENA_JOIN_REQUEST, send_message, SHOW_BOOT_DIALOG} from "../../redux_actions/actionTypes";
import LaunchIcon from '@mui/icons-material/Launch';
import {ListItemButton} from "@mui/material";


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
      table: state.tables[state.table],
      me: state.me,
      admin: state.admin
   }
};

const mapDispatchToProps = dispatch => {
   return {
      // mute: (player) => {
      //    dispatch({type: MUTE, payload: player});
      // },
      // unmute: (player) => {
      //    dispatch({type: UNMUTE, payload: player});
      // },
      show_boot_dialog: (player) => {
         dispatch({type: SHOW_BOOT_DIALOG, payload: player});
      },
      send_message: message => {
         dispatch(send_message(message));
      },
      accept_player: (player, table) => {
         dispatch(send_message({dsgArenaAcceptTableJoinEvent: {playerToAccept: player, table: table}}));
      },
      reject_player: (player, table) => {
         dispatch({type: REMOVE_ARENA_JOIN_REQUEST, payload: player});
         dispatch(send_message({dsgArenaRejectTableJoinEvent: {playerToReject: player, table: table}}));
      },
   }
};


function UnconnectedArenJoinRequests(props) {
   const {classes, users, game, players, table, mute, unmute, me, show_boot_dialog, admin} = props;

   return (
      <List className={classes.root} style={{width: '100%'}} dense={true}>
         {players && players.map((name, i) => {
            if ('game server' === name) {
               return undefined;
            }
            const player = users[name];
            if (!player) {
               return undefined;
            }
            return (
               <ListItem key={i}>
                  <ListItemAvatar onClick={() => {
                     if (name !== me) {
                        mute(name);
                     }
                  }}>
                     <Avatar alt={name} src={player.avatar}/>
                  </ListItemAvatar>
                  <ListItemText
                     primary={player.userhtml}
                     secondary={player.rating(game)}
                  />
                  {(game && table && (table.owner || admin) && name !== me) &&
                     <LaunchIcon className={classes.icon} onClick={() => show_boot_dialog(name)}/>
                  }
                  <ListItemButton onClick={() => props.accept_player(name, table && table.table)}
                                  style={{
                                     flex: 1,
                                     justifyContent: 'center',
                                     backgroundColor: '#4caf50',
                                     color: 'white'
                                  }}>
                     <ListItemText primary={'Accept'} primaryTypographyProps={{align: 'center'}}/>
                  </ListItemButton>
                  <ListItemButton onClick={() => props.reject_player(name, table && table.table)}
                                  style={{
                                     flex: 1,
                                     justifyContent: 'center',
                                     backgroundColor: '#f44336',
                                     color: 'white'
                                  }}>
                     <ListItemText primary={'Decline'} primaryTypographyProps={{align: 'center'}}/>
                  </ListItemButton>
               </ListItem>

            )
         })
         }
      </List>
   );
}

UnconnectedArenJoinRequests.propTypes = {
   classes: PropTypes.object.isRequired,
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   table: PropTypes.instanceOf(Table),
   players: PropTypes.arrayOf(PropTypes.string),
   me: PropTypes.string,
   admin: PropTypes.bool,
};

const ArenJoinRequests = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedArenJoinRequests));

export default ArenJoinRequests;
