import React, {Component} from 'react';
import {connect} from 'react-redux';
import {ARENA_REQUEST_SENT, send_message} from "../redux_actions/actionTypes";
import {Commands} from '../protocol';
import {MODALS, openModal, toggleModal} from '../ui/modals';
import {arenaTableStatus, isGuestName, tableVisibleToGuest} from '../selectors';
import PropTypes from 'prop-types';
import User from '../Classes/UserClass';
import Table from '../Classes/TableClass';
import TableCard from '../Components/Table/TableCard';
// import Board from '../Components/Board/Board';
import Grid from '@mui/material/Grid';
import Fab from '@mui/material/Fab';
import Cookies from 'js-cookie';
import CreateArenaTableModal from "../Components/Arena/CreateArenaTableModal";
import ArenaWithdrawModal from "../Components/Arena/ArenaWithdrawModal";
import MessageSnack from "../Components/MessageSnack";

const mapStateToProps = state => {
   return {
      users: state.users,
      connected: state.connected,
      logged_in: state.logged_in,
      messages: state.room_messages,
      tables: state.tables,
      me: state.me,
      admin: state.admin,
      arenaMyRequests: state.arenaMyRequests,
      arenaRequestsInFlight: state.arenaRequestsInFlight,
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
      toggle_create_arena_modal: () => dispatch(toggleModal(MODALS.CREATE_ARENA)),
      request_sent: (table) => dispatch({type: ARENA_REQUEST_SENT, payload: {table: table, op: 'request'}}),
      open_withdraw: (table) => dispatch(openModal(MODALS.ARENA_WITHDRAW, table)),
   }
};

class UnconnectedArena extends Component {
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

   // Spec C3: a busy card ignores the tap; a requested card offers withdraw (confirmed in
   // ArenaWithdrawModal); otherwise send the request and mark the card busy until the
   // server answers this table, so a double-tap never yields DUPLICATE.
   joinArenaTable = (table) => {
      const {tables, admin, arenaMyRequests, arenaRequestsInFlight} = this.props;
      const status = arenaTableStatus(table, arenaMyRequests, arenaRequestsInFlight);
      if (status === 'busy') {
         return;
      }
      if (status === 'requested') {
         this.props.open_withdraw(table);
         return;
      }
      if (table === -1 || !tables[table].private() || admin) {
         this.props.send_message(Commands.arenaRequestJoin({table: table}));
         this.props.request_sent(table);
      }
   };

   toggleCreateArenaModal = () => {
      this.props.toggle_create_arena_modal();
   }

   render() {
      const {users, connected, logged_in, messages, tables, me, arenaMyRequests, arenaRequestsInFlight} = this.props;
      // Guest users should not see rated tables.
      const isGuest = isGuestName(me);
      if (logged_in) {
         return (
            <div style={{height: '100vh', width: '80vw', margin: 'auto'}}>

               <Grid container direction={'column'} alignItems={'center'} wrap={'nowrap'}
                     style={{width: '100%', height: '100%'}}>
                  <Grid item style={{
                     width: '100%',
                     alignItems: 'center',
                     display: 'flex',
                     justifyContent: 'center'
                  }}>
                     <h1>Arena</h1>
                  </Grid>
                  <Grid item style={{width: '100%', flex: '1', minHeight: '0px'}}>
                     <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                           style={{width: '100%', height: '100%'}}>
                        {/*<Grid item style={{height: '100%', flex: '1', minWidth: '0px'}}>*/}
                        {/*   <ChatComponent messages={messages} players={Object.keys(users)}*/}
                        {/*                  sendText={this.sendRoomText}/>*/}
                        {/*</Grid>*/}
                        <Grid item style={{height: '100%', overflow: 'auto', alignCenter: true}}>
                           <Fab color="primary" variant="extended" aria-label="Delete"
                                style={{width: '100%'}} onClick={() => this.toggleCreateArenaModal()}>
                              {/*<NavigationIcon className={classes.extendedIcon} />*/}
                              create new table
                           </Fab>
                           <br/>
                        </Grid>
                        <Grid item style={{height: '100%', overflow: 'auto', flex: '1', minWidth: '0px'}}>
                           <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
                              gap: '16px',
                              padding: '8px',
                              width: '100%'
                           }}>
                              {Object.keys(tables)
                                 .filter(table => tables[table].players.length === 1)
                                 .filter(table => tableVisibleToGuest(tables[table], isGuest))
                                 .map(table => {
                                    const status = arenaTableStatus(tables[table].table, arenaMyRequests, arenaRequestsInFlight);
                                    return (
                                       <TableCard
                                          key={table}
                                          table={tables[table]}
                                          joinRoom={this.joinArenaTable}
                                          requested={status === 'requested'}
                                          busy={status === 'busy'}
                                          users={users}/>
                                    );
                                 })}
                           </div>
                        </Grid>
                     </Grid>
                  </Grid>
               </Grid>
               <CreateArenaTableModal/>
               <ArenaWithdrawModal/>
               <MessageSnack/>
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

const Arena = connect(mapStateToProps, mapDispatchToProps)(UnconnectedArena);

UnconnectedArena.propTypes = {
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
   arenaMyRequests: PropTypes.arrayOf(PropTypes.number),
   arenaRequestsInFlight: PropTypes.arrayOf(PropTypes.shape({
      table: PropTypes.number,
      op: PropTypes.oneOf(['request', 'withdraw']),
   })),
};

export default Arena;