import React, {Component} from 'react';
import {connect} from 'react-redux';
import {send_message} from "../redux_actions/actionTypes";
import PropTypes from 'prop-types';
import ChatComponent from '../Components/Chat/ChatComponent';
import User from '../Classes/UserClass';
import Table from '../Classes/TableClass';
import TableCard from '../Components/Table/TableCard';
// import Board from '../Components/Board/Board';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import Cookies from 'js-cookie';
import InvitationResponseModal from "../Components/Room/InvitationResponseModal";
import {Commands} from '../protocol';

const mapStateToProps = state => {
   return {
      users: state.users,
      connected: state.connected,
      logged_in: state.logged_in,
      messages: state.room_messages,
      tables: state.tables,
      me: state.me,
      freeloader: state.freeloader,
      admin: state.admin,
      tournament: state.tournament
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      }
   }
};

class UnconnectedRoom extends Component {
   componentDidUpdate() {
      const {connected, logged_in, send_message} = this.props;

      if (window.location.search && window.location.search.indexOf('?guest') > -1) {
         if (connected && !logged_in) {
            send_message(Commands.login({guest: true}));
         }
         return;
      }

      let username = Cookies.get('name2');
      if (!username) {
         username = process.env.REACT_APP_USERNAME;
      }
      let password = Cookies.get('password2');
      if (!password) {
         password = process.env.REACT_APP_PASSWORD;
      }
      if (connected && !logged_in) {
         send_message(Commands.login({player: username, password: password, guest: false}));
      }
   }

   sendRoomText = (event) => {
      const str = event.target.value;
      if (event.key === 'Enter' && str !== '') {
         this.props.send_message(Commands.roomText({text: str}));
         event.target.value = "";
      }
   };

   joinRoom = (table) => {
      if (table === -1 || !this.props.tables[table].private() || this.props.admin) {
         this.props.send_message(Commands.joinTable({table: table}));
      }
   };

   render() {
      const {users, connected, logged_in, messages, tables, me, freeloader, tournament} = this.props;
      // Guest users should not see rated tables.
      const isGuest = (me || '').toLowerCase().startsWith('guest');
      if (logged_in) {
         return (
            <div style={{height: '100vh', width: '80vw', margin: 'auto'}}>

               <Grid container direction={'column'} alignItems={'center'} wrap={'nowrap'}
                     style={{width: '100%', height: '100%'}}>
                  {/*{freeloader &&*/}
                  {/*   <Grid item style={{display: 'inline-block', width: '970px', height: '90px'}}>*/}
                  {/*      <AdSense.Google*/}
                  {/*         client='ca-pub-3326997956703582'*/}
                  {/*         slot='6777680396'*/}
                  {/*         style={{display: 'inline-block', width: '970px', height: '90px'}}*/}
                  {/*         format=''*/}
                  {/*      />*/}
                  {/*   </Grid>*/}
                  {/*}*/}
                  <Grid item style={{width: '100%', flex: '1', minHeight: '0px'}}>
                     <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                           style={{width: '100%', height: '100%'}}>
                        <Grid item style={{height: '100%', flex: '1', minWidth: '0px'}}>
                           <ChatComponent messages={messages} players={Object.keys(users)}
                                          sendText={this.sendRoomText}/>
                        </Grid>
                        <Grid item style={{height: '100%', overflow: 'auto', alignCenter: true}}>
                           {!tournament &&
                              <Fab color="primary" variant="extended" aria-label="Delete"
                                   style={{width: '100%'}} onClick={() => this.joinRoom(-1)}>
                                 {/*<NavigationIcon className={classes.extendedIcon} />*/}
                                 create new table
                              </Fab>
                           }
                           <br/>
                           {Object.keys(tables)
                              .filter(table => !isGuest || !tables[table].rated)
                              .map(table => <TableCard
                              key={table}
                              table={tables[table]}
                              joinRoom={this.joinRoom}
                              users={users}/>)}
                        </Grid>
                     </Grid>
                  </Grid>
               </Grid>
               <InvitationResponseModal/>
            </div>
         )
      } else if (connected) {
         return (
            <div align="center">
               <h1>Connected...</h1>
               (if you see this message longer than a few seconds, reload this page)
            </div>
         )
      } else {
         return (
            <div align="center">
               <h1>Connecting...</h1>
            </div>
         )
      }
   }
}

const Room = connect(mapStateToProps, mapDispatchToProps)(UnconnectedRoom);

UnconnectedRoom.propTypes = {
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   // users: PropTypes.objectOf(PropTypes.string).isRequired,
   connected: PropTypes.bool.isRequired,
   logged_in: PropTypes.bool.isRequired,
   messages: PropTypes.arrayOf(
      PropTypes.shape({
         message: PropTypes.string.isRequired,
         player: PropTypes.instanceOf(User).isRequired
      }).isRequired
   ).isRequired,
   tables: PropTypes.objectOf(
      PropTypes.instanceOf(Table).isRequired
   ).isRequired,
};

export default Room;