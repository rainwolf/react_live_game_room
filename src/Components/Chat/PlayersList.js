import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
// import Typography from '@material-ui/core/Typography';
import User from '../../redux_reducers/UserClass';
import { connect } from 'react-redux';
import { MUTE, UNMUTE } from "../../redux_actions/actionTypes";
import WifiOffIcon from '@material-ui/icons/WifiOff';


const styles = theme => ({
    root: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: theme.palette.background.paper,
    },
    icon: {
        fontSize: 30,
    }
});

const mapStateToProps = state => {
    return {
        users: state.users,
    }
};

const mapDispatchToProps = dispatch => {
    return {
        mute: (player) => {
            dispatch({ type: MUTE, payload: player});
        },
        unmute: (player) => {
            dispatch({ type: UNMUTE, payload: player});
        }

    }
};


function UnconnectedPlayersList(props) {
    const { classes, users, game, players } = props;
    
    return (
        <List className={classes.root}>
            {players.map((name, i) => {
                    if ('game server' === name) { return undefined; }
                    const player = users[name];
                    if (!player) { return undefined; }
                    return (
                        <ListItem key={i} >
                            <ListItemAvatar onClick={() => props.mute(name)}>
                                <Avatar alt={name} src={player.avatar} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={player.userhtml}
                                secondary={player.rating(game)}
                            />
                            {player.muted &&
                                <WifiOffIcon className={classes.icon} onClick={() => props.unmute(name)}/>
                            }
                        </ListItem>
    
                    )
                })
            }
        </List>
    );
}

UnconnectedPlayersList.propTypes = {
    classes: PropTypes.object.isRequired,
    users: PropTypes.objectOf(
        PropTypes.instanceOf(User).isRequired
    ).isRequired,
    players: PropTypes.arrayOf(PropTypes.string)
};

const PlayersList = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedPlayersList)); 

export default PlayersList;
