import React, { useState, useEffect, useRef } from 'react';
import { MOVE_FORWARD, MOVE_BACK, MOVE_GOTO } from "../../redux_actions/actionTypes";
import { connect } from 'react-redux';
import {Game, GameState} from "../../redux_reducers/GameClass";
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TableRow from '@material-ui/core/TableRow';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
    root: {
        width: '100%',
        // marginTop: theme.spacing.unit * 3,
        alignItems: 'center',
        height: '100%',
        overflow: 'auto'
    },
    table: {
        maxWidth: '100%',
        height: '100px',
        align: 'center',
        cursor: 'pointer',
    },
});

const mapStateToProps = state => {
    return {
        game: state.game,
    }
};

const mapDispatchToProps = dispatch => {
    return {
        move: (forward) => {
            dispatch({ type: forward?MOVE_FORWARD:MOVE_BACK })
        },
        goto_move: (i) => {
            dispatch({ type: MOVE_GOTO, payload: i })
        }
    }
};

const UnconnectedMovesListPanel = (props) => {
    const { classes, game } = props;
    
    const move_strs = game.moves_strings();
    let move_cells;
    if (game.isConnect6()) {
        if (move_strs.length > 0) {
            move_cells.push(<TableCell key={0} align='center' onClick={() => props.goto_move(1)}>
                {move_strs[0]}
            </TableCell>)
        }
        for (let i = 1; i < move_strs.length; i++) {
            move_cells.push(<TableCell key={i} align='center' 
                                       onClick={() => props.goto_move(1 + 2*i)}>
                <Typography variant='h6'>
                    {move_strs[i]}
                </Typography>
            </TableCell>)
        }
    } else {
        move_cells = move_strs.map((m,i) => (<TableCell key={i} align='center' onClick={() => props.goto_move(i+1)}>
            {m}
        </TableCell>));
    }
    let move_rows = [];
    for (let i = 0; i < move_cells.length; i++) {
        if (i < move_cells.length - 1) {
            move_rows.push(
                    <TableRow key={i}>
                        <TableCell selected={i===4} align={'center'} style={{width: '15%'}}>{1+Math.floor(i/2)}</TableCell>
                        {move_cells[i]}
                        {move_cells[i+1]}
                    </TableRow>
                );
            i += 1;
        } else {
            move_rows.push(
                <TableRow key={i}>
                    <TableCell align={'center'} style={{width: '15%'}}>{1+Math.floor(i/2)}</TableCell>
                    {move_cells[i]}
                    <TableCell key={'rest'}/>
                </TableRow>
            );
        }
    }
    
    return (
        <div style={{width: '100%', height: '100%'}}>
            <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'}
                  style={{width: '100%', height: '100%'}}>
                <Grid item style={{flex: '1 1 auto', minHeight: '0px'}}>
                    <Paper className={classes.root}>
                        <Table className={classes.table}>
                            <TableBody>
                                {move_rows}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </Paper>
                </Grid>
                <Grid item>
                    <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item xs>
                            <div style={{width:'0%', margin: '0 auto'}}>
                                <Button variant="contained" color="primary"
                                        onClick={() => props.move(false)}>
                                    back
                                </Button>
                            </div>
                        </Grid>
                        <Grid item xs>
                            <div style={{width:'0%', margin: '0 auto'}}>
                                <Button variant="contained" color="primary" onClick={() => props.move(true)}>
                                    forward
                                </Button>
                            </div>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </div>
    );
};

UnconnectedMovesListPanel.propTypes = {
    game: PropTypes.instanceOf(Game).isRequired    
};



const MovesListPanel = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedMovesListPanel));

export default MovesListPanel;