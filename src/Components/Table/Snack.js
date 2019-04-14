import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { REMOVE_SNACK } from "../../redux_actions/actionTypes";
import Table from '../../Classes/TableClass';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import InfoIcon from '@material-ui/icons/Info';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import green from '@material-ui/core/colors/green';
import amber from '@material-ui/core/colors/amber';
import red from '@material-ui/core/colors/red';
import blue from '@material-ui/core/colors/blue';
import User from "../../Classes/UserClass";

const mapStateToProps = state => {
    return {
        users: state.users,
        table: state.tables[state.table],
        snack: state.snack
    }
};

const mapDispatchToProps = dispatch => {
    return {
        close_snack: () => {
            dispatch( { type: REMOVE_SNACK });
        }
    }
};

const styles = theme => ({
    success: {
        backgroundColor: green[600],
    },
    error: {
        backgroundColor: red[500],
    },
    info: {
        backgroundColor: blue[500],
    },
    warning: {
        backgroundColor: amber[700],
    },
    icon: {
        fontSize: 20,
    },
    iconVariant: {
        opacity: 0.9,
        marginRight: theme.spacing.unit,
    },
    message: {
        display: 'flex',
        alignItems: 'center',
    },
});


const UnConnectedSnack = (props) => {
    const { users, snack, table, close_snack, classes } = props;
    
    let [open, toggle] = useState(snack !== undefined);

    if (!open) {
        open = snack !== undefined && snack !== '';
    } 
    
    const close = () => {
        toggle(false);
        close_snack();
    };

    // console.log(snack)
    // console.log(open)
    
    let variant, message, Icon;
    variant = 'error';
    message = 'Game over, you lose.';
    Icon = ErrorIcon;
    let user = users[snack];
    if (user)  {
        if (!table.iAmPlaying()) { // not even playing
            variant = 'info';
            message = (<span>{user.userhtml} wins the game.</span>);
            Icon = InfoIcon;
        } else if (snack === table.me) { // i win
            variant = 'success';
            message = 'Game over, you win.';
            Icon = CheckCircleIcon;
        } else { // i lose
            variant = 'error';
            message = 'Game over, you lose.';
            Icon = ErrorIcon;
        }
    }
    
    return (
        <Snackbar
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            open={open}
            autoHideDuration={4000}
            onClose={close}
        >
            <SnackbarContent
                className={classes[variant]}
                aria-describedby="client-snackbar"
                message={
                    <span id="client-snackbar" className={classes.message}>
                    <Icon className={classNames(classes.icon, classes.iconVariant)}/>
                        {message}
                    </span>
                }
            />
        </Snackbar>        
    );
};

UnConnectedSnack.propTypes = {
    users: PropTypes.objectOf(
        PropTypes.instanceOf(User).isRequired
    ).isRequired,
    table: PropTypes.instanceOf(Table).isRequired,
    snack: PropTypes.string
};

const Snack = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnConnectedSnack));

export default Snack;
