import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import Avatar from '@material-ui/core/Avatar';
import User from '../../Classes/UserClass';
import Table from '../../Classes/TableClass';
import { connect } from 'react-redux';
import Radio from '@material-ui/core/Radio';

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
        tables: state.tables,
        me: state.me,
    }
};

function UnconnectedInviteList(props) {
    const { classes, users, tables, me, selectHandler } = props;
    
    const [selected, select] = useState('');
    
    const players = { ...users };
    Object.keys(tables).forEach(t => {
        const table = tables[t];
        table.players.forEach(p => {
            delete players[p];
        });
    });
    delete players['game server'];
    delete players[me];
    
    const pick = (name) => {
        select(name);
        selectHandler(name);
    };
    
    const playerList = Object.keys(players).map((name, i) => {
        const player = users[name];
        if (!player) { return undefined; }
        return (
            <ListItem key={i}>
                <Radio checked={name === selected} onChange={() => pick(name)}/>
                <ListItemAvatar>
                    <Avatar alt={name} src={player.avatar} />
                </ListItemAvatar>
                <ListItemText
                    primary={player.userhtml}
                />
            </ListItem>

        )
    });
    
    return (
        <List className={classes.root}>
            {playerList.length > 0 &&
                playerList
            }
            {playerList.length === 0 &&
                "No players available"
            }
        </List>
    );
}

UnconnectedInviteList.propTypes = {
    classes: PropTypes.object.isRequired,
    users: PropTypes.objectOf(
        PropTypes.instanceOf(User).isRequired
    ).isRequired,
    tables: PropTypes.objectOf(PropTypes.instanceOf(Table)),
    me: PropTypes.string,
};

const InviteList = connect(mapStateToProps)(withStyles(styles)(UnconnectedInviteList));

export default InviteList;
