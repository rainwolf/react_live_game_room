import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState} from "../../Classes/GameClass";
import Table from "../../Classes/TableClass";
import User from "../../Classes/UserClass";
import {send_message} from "../../redux_actions/actionTypes";
import Button from '@material-ui/core/Button';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import SimpleStone from '../Board/SimpleStone';
import Grid from '@material-ui/core/Grid';
import CloseIcon from '@material-ui/icons/Close';

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
    const width = 300;
    
    if (table.seats[seat] === "" && table.seats[3-seat] !== table.me) {
        return (
            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                  style={{height: '100%', maxWidth: width}}>
                <Grid item xs style={{paddingLeft: 10}}>
                    <SimpleStone size={40} id={table.player_color(seat)}/>
                </Grid>
                <Grid item xs>
                    <Button variant="outlined" color="primary" className={'button-glow'} fullWidth
                            onClick={() => props.send_message({dsgSitTableEvent: {seat: seat, table: table.table, time: 0}}) }
                    style={{paddingLeft:10}}>
                        <span style={{whiteSpace: 'nowrap'}}>Take Seat</span>
                    </Button>
                </Grid>
            </Grid>
        );
    } else if (table.seats[seat] !== "" && users[table.seats[seat]]) {
        const player = users[table.seats[seat]];
        return (
            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                  style={{height: '100%', maxWidth: width}}>
                <Grid item xs={1} style={{paddingLeft:10, marginTop: 10}}>
                    <SimpleStone size={40} id={table.player_color(seat)}/>
                </Grid>
                    <Grid item xs={8}>
                <ListItem key={seat} style={{paddingRight: 10}}>
                    {/*<SimpleStone size={40} id={table.player_color(seat)}/>*/}
                    <ListItemAvatar style={{marginLeft:10}}>
                        <Avatar alt={table.seats[seat]} src={player.avatar} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={player.userhtml}
                        secondary={player.rating(table.game)}
                    />
                </ListItem>
                </Grid>
                    {(game.gameState.state === GameState.State.NOT_STARTED && player.name === table.me) &&
                    <Grid item xs style={{marginTop: 10}}>
                    <Button variant="outlined" color="primary"
                            onClick={() => props.send_message({dsgStandTableEvent: {table: table.table, time: 0}}) }
                            >
                        <CloseIcon/>
                    </Button>
                    </Grid>
                    }
            </Grid>
        );
    } else {
        return (
            <div style={{marginLeft: 10, marginTop: 8, width: width}}>
                <SimpleStone size={40} id={table.player_color(seat)}/>
            </div>
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