import React, { Component } from 'react';
import { connect } from 'react-redux';
import { send_message } from "../redux_actions/actionTypes";
import PropTypes from 'prop-types';
import ChatComponent from '../Components/Chat/ChatComponent';


const mapStateToProps = state => {
        return {
            users: state.users,
            connected: state.connected,
            logged_in: state.logged_in,
            messages: state.room_messages
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
        // console.log("meep connected: " + connected + " logged in: "+ logged_in);
        if (connected && !logged_in) {
            // const json = JSON.parse('{"dsgLoginEvent":{"player":"rainwolf","password":"***REMOVED***","guest":false,"time":0}}');
            // send_message(json);
            send_message({dsgLoginEvent: {player: "rainwolf", password: "***REMOVED***", guest: false, time: 0}});
        }
    }

    sendRoomText(event) {
        const str = event.target.value;
        if(event.key === 'Enter' && str !== '') {
            // send_message({dsgJoinTableEvent: {table: -1, time: 0}});
            this.props.send_message({dsgTextMainRoomEvent: {text: str, time: 0}});
            event.target.value = "";
        }
    }

    render () {
        const { classes, users, connected, logged_in, messages} = this.props;
        // const { value } = this.state;
        if (logged_in) {
            return (
                <div style={{width: '1000px', height: '600px'}}>
                    <ChatComponent messages={messages} users={users} sendRoomText={this.sendRoomText.bind(this)}/>
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
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            game_ratings: PropTypes.objectOf(PropTypes.number.isRequired).isRequired,
            subscriber: PropTypes.bool.isRequired,
            name_color: PropTypes.number.isRequired,
            crown: PropTypes.number.isRequired,
            avatar: PropTypes.string.isRequired,
            rating: PropTypes.func.isRequired
        }).isRequired
    ).isRequired,
    // users: PropTypes.objectOf(PropTypes.string).isRequired,
    connected: PropTypes.bool.isRequired,
    logged_in: PropTypes.bool.isRequired,
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            message: PropTypes.string.isRequired,
            player: PropTypes.shape({
                name: PropTypes.string.isRequired,
                game_ratings: PropTypes.objectOf(PropTypes.number.isRequired).isRequired,
                subscriber: PropTypes.bool.isRequired,
                name_color: PropTypes.number.isRequired,
                crown: PropTypes.number.isRequired,
                avatar: PropTypes.string.isRequired,
                rating: PropTypes.func.isRequired
            }).isRequired
        }).isRequired
    ).isRequired
};

export default Room;