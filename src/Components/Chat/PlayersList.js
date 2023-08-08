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
import {MUTE, UNMUTE, SHOW_BOOT_DIALOG} from "../../redux_actions/actionTypes";
import WifiOffIcon from '@mui/icons-material/WifiOff';
import LaunchIcon from '@mui/icons-material/Launch';


const styles = theme => ({
   root: {
      width: '100%',
      maxWidth: 360,
      // backgroundColor: theme?.palette.background.paper,
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
      mute: (player) => {
         dispatch({type: MUTE, payload: player});
      },
      unmute: (player) => {
         dispatch({type: UNMUTE, payload: player});
      },
      show_boot_dialog: (player) => {
         dispatch({type: SHOW_BOOT_DIALOG, payload: player});
      }

   }
};


function UnconnectedPlayersList(props) {
   const {classes, users, game, players, table, mute, unmute, me, show_boot_dialog, admin} = props;

   return (
      <List className={classes.root} dense={true}>
         {players.map((name, i) => {
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
                  {player.muted &&
                     <WifiOffIcon className={classes.icon} onClick={() => unmute(name)}/>
                  }
                  {(game && table && (table.owner || admin) && name !== me) &&
                     <LaunchIcon className={classes.icon} onClick={() => show_boot_dialog(name)}/>
                  }
               </ListItem>

            )
         })
         }
      </List>
   );
}

UnconnectedPlayersList.propTypes = {
   classes: PropTypes.object.isRequired,
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   table: PropTypes.instanceOf(Table),
   players: PropTypes.arrayOf(PropTypes.string),
   me: PropTypes.string,
   admin: PropTypes.bool,
};

const PlayersList = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedPlayersList));

export default PlayersList;
