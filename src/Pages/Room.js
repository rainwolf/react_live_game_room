import React, { Component } from 'react';
import { connect } from 'react-redux';
import { send_message } from "../redux_actions/actionTypes";
import PropTypes from 'prop-types';
import ChatComponent from '../Components/Chat/ChatComponent';
import User from '../redux_reducers/UserClass';
import Table from '../redux_reducers/TableClass';
import TableCard from '../Components/Table/TableCard';
// import Board from '../Components/Board/Board';
import Grid from '@material-ui/core/Grid';
import Fab from '@material-ui/core/Fab';
import AdSense from 'react-adsense';
import Cookies from 'js-cookie';

const mapStateToProps = state => {
        return {
            users: state.users,
            connected: state.connected,
            logged_in: state.logged_in,
            messages: state.room_messages,
            tables: state.tables,
            freeloader: state.freeloader
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
        let username = Cookies.get('name2');
        if (!username) { username = "rainwolf"; } 
        let password = Cookies.get('password2');
        if (!password) { password = "***REMOVED***"; } 
        if (connected && !logged_in) {
            send_message({dsgLoginEvent: {player: username, password: password, guest: false, time: 0}});
        }
    }

    sendRoomText = (event) => {
        const str = event.target.value;
        if(event.key === 'Enter' && str !== '') {
            this.props.send_message({dsgTextMainRoomEvent: {text: str, time: 0}});
            event.target.value = "";
        }
    };
    
    joinRoom = (table) => {
        if (table === -1 || !this.props.tables[table].private()) {
            this.props.send_message({dsgJoinTableEvent: {table: table, time: 0}});
        } 
    };

    render () {
        const { users, connected, logged_in, messages, tables, freeloader } = this.props;
        if (logged_in) {
            return (
                <div style={{height: '100vh', width: '100vw'}}>

                    <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
                        {freeloader &&
                        <Grid item>
                            <AdSense.Google
                                client='ca-pub-3326997956703582'
                                slot='6777680396'
                                style={{ display:'inline-block',width:'970px',height:'90px' }}
                            />
                            {/*<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>*/}
                            {/*<ins className="adsbygoogle"*/}
                            {/*style={{display:'block'}}*/}
                            {/*data-ad-client="ca-pub-3326997956703582"*/}
                            {/*data-ad-slot="9145001041"*/}
                            {/*data-ad-format="auto"*/}
                            {/*data-full-width-responsive="true"></ins>*/}
                            {/*<script>*/}
                            {/*(adsbygoogle = window.adsbygoogle || []).push({});*/}
                            {/*</script>*/}
                        </Grid>
                        }
                        <Grid item style={{width:'100%', flex: '1', minHeight: '0px'}}>
                            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
                                <Grid item style={{height:'100%', flex: '1', minWidth: '0px'}}>
                                    <ChatComponent messages={messages} users={users} sendText={this.sendRoomText}/>
                                </Grid>
                                <Grid item style={{height: '100%', overflow: 'auto', alignCenter: true}}>
                                    <Fab color="primary"  variant="extended" aria-label="Delete"
                                         style={{width: '100%'}} onClick={() => this.joinRoom(-1)}>
                                        {/*<NavigationIcon className={classes.extendedIcon} />*/}
                                        create new table
                                    </Fab>
                                    <br/>
                                    {Object.keys(tables).map(table => <TableCard
                                        key={table}
                                        table={tables[table]}
                                        joinRoom={this.joinRoom}
                                        users={users}/>)}
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
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