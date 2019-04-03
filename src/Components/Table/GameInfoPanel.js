import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import {send_message, toggleSettings} from "../../redux_actions/actionTypes";
import Grid from '@material-ui/core/Grid';
import Seat from './Seat';
import Timer from './Timer';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

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

// const mapDispatchToProps = dispatch => {
//     return {
//         send_message: message => {
//             dispatch(send_message(message));
//         },
//     }
// };





const UnconnectedGameInfoPanel = (props) => {
    const { table } = props;

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
                            {table.timed?('timed: '+table.initialMinutes+'/'+table.incrementalSeconds):'timed: no'},&nbsp;
                            {table.tableType===1?'public ':'private '} table
                        </Typography>
                    </Paper>                    
                </Grid>
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
                <Grid item xs>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
                        <Grid item style={{maxWidth: '50%', flex: '1 1 auto', minWidth: '0px'}}>
                            <Seat seat={1}/>
                        </Grid>
                        <Grid item style={{maxWidth: '50%', flex: '1 1 auto', minWidth: '0px'}}>
                            <Seat seat={2}/>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};


const GameInfoPanel = connect(mapStateToProps)(withStyles(styles)(UnconnectedGameInfoPanel))

export default GameInfoPanel;