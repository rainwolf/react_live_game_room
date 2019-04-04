import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {send_message, toggleSettings} from "../../redux_actions/actionTypes";
import Grid from '@material-ui/core/Grid';
import Seat from './Seat';
import Timer from './Timer';
import Captures from './Captures';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {GameState} from "../../redux_reducers/GameClass";

const styles = theme => ({
    root: {
        flexGrow: 1,
    },
    paper: {
        padding: theme.spacing.unit * 2,
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
});

const mapStateToProps = state => {
    return {
        users: state.users,
        game: state.game,
        messages: state.table_messages,
        table: state.tables[state.table]
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        },
    }
};





const UnconnectedGameInfoPanel = (props) => {
    const { table, game } = props;
    const requestCancel = () => {
        props.send_message({dsgCancelRequestTableEvent: {player: table.me, table: table.table, time: 0}});
    };
    const resign = () => {
        props.send_message({dsgResignTableEvent: {player: table.me, table: table.table, time: 0}});
    };
    const requestUndo = () => {
        props.send_message({dsgUndoRequestTableEvent: {player: table.me, table: table.table, time: 0}});
    };

    return (
        <div style={{width: '100%', height: '100%', marginTop: 20}}>
            <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'} 
                  style={{width: '100%', height: '100%'}} spacing={8}>
                <Grid item xs>
                    <Paper style={{textAlign: 'center'}}>
                        <Typography variant="h4">
                            {table.game_name()}
                        </Typography>
                        <Typography variant="subtitle1">
                            rated: {table.rated?'yes':'no'},&nbsp;
                            {table.timed?('timer: '+table.initialMinutes+'/'+table.incrementalSeconds):'timed: no'},&nbsp;
                            {table.tableType===1?'public ':'private '} table
                        </Typography>
                    </Paper>                    
                </Grid>
                {table.timed &&
                <Grid item xs>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <Timer seat={1}/>
                        </Grid>
                        <Grid item xs>
                            <Timer seat={2}/>
                        </Grid>
                    </Grid>
                </Grid>
                }
                <Grid item xs>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <Seat seat={1}/>
                        </Grid>
                        <Grid item xs>
                            <Seat seat={2}/>
                        </Grid>
                    </Grid>
                </Grid>
                {table.gameHasCaptures() &&
                <Grid item xs>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <Captures seat={1}/>
                        </Grid>
                        <Grid item xs>
                            <Captures seat={2}/>
                        </Grid>
                    </Grid>
                </Grid>
                }
                {(table.iAmPlaying() && game.gameState.state === GameState.State.STARTED) &&
                    <Grid item xs>
                        <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                              style={{width: '100%', height: '100%'}}>
                            <Grid item xs>
                                <div style={{width:'0%', margin: '0 auto'}}>
                                    <Button variant="contained" color="primary" onClick={resign}>
                                        Resign
                                    </Button>
                                </div>
                            </Grid>
                            <Grid item xs>
                                <div style={{width:'0%', margin: '0 auto'}}>
                                    <Button variant="contained" color="primary" onClick={requestCancel}>
                                        Cancel
                                    </Button>
                                </div>
                            </Grid>
                            {!table.isMyTurn(game) &&
                                <Grid item xs>
                                    <div style={{width:'0%', margin: '0 auto'}}>
                                        <Button variant="contained" color="primary" onClick={requestUndo}>
                                            Undo
                                        </Button>
                                    </div>
                                </Grid>
                            }
                        </Grid>
                    </Grid>
                }
                
            </Grid>
        </div>
    );
};


const GameInfoPanel = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedGameInfoPanel))

export default GameInfoPanel;