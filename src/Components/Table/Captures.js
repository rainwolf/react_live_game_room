import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {Game, GameState} from "../../redux_reducers/GameClass";
import Table from "../../redux_reducers/TableClass";
import SimpleStone from '../Board/SimpleStone';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

const mapStateToProps = state => {
    return {
        game: state.game,
        table: state.tables[state.table]
    }
};


const UnconnectedCaptures = (props) => {
    const { seat, game, table } = props;
    
        return (
            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'}
                  style={{width: '100%', height: '100%'}}>
                <Grid item xs>
                    <div style={{float: 'right', marginRight: 10}}>
                        <SimpleStone size={40} id={table.player_color(3-seat)}/>
                    </div>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">
                        x {game.captures[3 - seat]}
                    </Typography>
                </Grid>
            </Grid>
        );
};

UnconnectedCaptures.propTypes = {
    seat: PropTypes.number.isRequired,
    game: PropTypes.instanceOf(Game).isRequired,
    table: PropTypes.instanceOf(Table).isRequired
};


const Captures = connect(mapStateToProps)(UnconnectedCaptures);

export default Captures;