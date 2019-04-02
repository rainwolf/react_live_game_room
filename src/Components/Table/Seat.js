import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState} from "../../redux_reducers/GameClass";
import Table from "../../redux_reducers/TableClass";
import User from "../../redux_reducers/UserClass";
import {send_message} from "../../redux_actions/actionTypes";
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';


const mapStateToProps = state => {
    return {
        users: state.users,
        game: state.game,
        table: state.tables[state.table]
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        }
    }
};

const UnconnectedSeat = (props) => {
    const { seat, users, game, table } = props;
    
    if (table.seats[seat] === "" && table.seats[3-seat] !== table.me) {
        return (
            <Button variant="contained" color="primary" className={'button-glow'}
                    onClick={() => props.send_message({dsgSitTableEvent: {seat: seat, table: table.table, time: 0}}) }>
                Take Seat
            </Button>
        );
    } else if (table.seats[seat] !== "" && users[table.seats[seat]]) {
        const player = users[table.seats[seat]];
        return (
            <div>
                <ListItem key={seat} >
                    <ListItemAvatar>
                        <Avatar alt={table.seats[seat]} src={player.avatar} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={player.userhtml}
                        secondary={player.rating(table.game)}
                    />
                    {(game.gameState.state === GameState.State.NOT_STARTED && player.name === table.me) &&
                    <Button variant="contained" color="primary"
                            onClick={() => props.send_message({dsgStandTableEvent: {table: table.table, time: 0}}) }>
                        Leave seat
                    </Button>
                    }
                </ListItem>
            </div>
        );
    } else {
        return (
            <div></div>
        )
    }
};

UnconnectedSeat.propTypes = {
    users: PropTypes.objectOf(
        PropTypes.instanceOf(User).isRequired
    ).isRequired,
    seat: PropTypes.number.isRequired,
    game: PropTypes.instanceOf(Game).isRequired,
    table: PropTypes.instanceOf(Table).isRequired
};


const Seat = connect(mapStateToProps, mapDispatchToProps)(UnconnectedSeat);

export default Seat;