import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import Grid from '@mui/material/Grid';

import PlayersList from './PlayersList';
import ChatInput from './ChatInput';
import ChatPanel from './ChatPanel';
// import Table from "../../redux_reducers/TableClass";
import User from "../../Classes/UserClass";

function ChatComponent(props) {

   useEffect(() => {
      let element = document.getElementById('chatdiv');
      element.scrollTop = element.scrollHeight;
   });

   const {players, sendText, messages} = props;

   return (
      <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
         <Grid item style={{height: '100%'}}>
            <div style={{overflow: 'auto', maxHeight: '100%', borderWidth: '1px', borderStyle: 'solid'}}>
               <PlayersList players={players} game={props.game}/>
            </div>
         </Grid>
         <Grid item style={{height: '100%', flex: '1', minWidth: '0px'}}>
            <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'}
                  style={{width: '100%', height: '100%'}}>
               <Grid id={'chatdiv'} item
                     style={{maxWidth: '100%', flex: '1 1 auto', overflow: 'auto', minHeight: '0px'}}>
                  <ChatPanel messages={messages}/>
               </Grid>
               <Grid item>
                  <ChatInput sendHandler={sendText}/>
               </Grid>
            </Grid>
         </Grid>
      </Grid>
   );
}

ChatComponent.propTypes = {
   // users: PropTypes.objectOf(
   //     PropTypes.instanceOf(User).isRequired
   // ).isRequired,
   messages: PropTypes.arrayOf(
      PropTypes.shape({
         message: PropTypes.string.isRequired,
         player: PropTypes.instanceOf(User).isRequired
      }).isRequired
   ).isRequired,
   sendText: PropTypes.func.isRequired,
};


export default ChatComponent;
