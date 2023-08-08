import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import User from "../../Classes/UserClass";
// import Typography from '@mui/material/Typography';

const styles = theme => ({
   root: {
      width: '100%',
      maxWidth: '100%',
      // backgroundColor: theme?.palette.background.paper,
   }
});

function ChatPanel(props) {

   const {classes, messages} = props;
   return (
      <List className={classes.root} dense={true}>
         {messages.map((message, i) => (
            <ListItem key={i} alignItems="flex-start">
               <ListItemAvatar>
                  <Avatar alt="avatar" src={message.player.avatar}/>
               </ListItemAvatar>
               <ListItemText
                  primary={message.player.userhtml}
                  secondary={' - ' + message.message}
                  style={{wordWrap: 'break-word'}}
               />
            </ListItem>

         ))}
      </List>
   );
}

ChatPanel.propTypes = {
   classes: PropTypes.object.isRequired,
   messages: PropTypes.arrayOf(
      PropTypes.shape({
         message: PropTypes.string.isRequired,
         player: PropTypes.instanceOf(User).isRequired
      }).isRequired
   ).isRequired,
};

export default withStyles(styles)(ChatPanel);
