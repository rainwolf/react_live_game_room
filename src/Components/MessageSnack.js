import React, {useState} from 'react';
import {connect} from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import SnackbarContent from '@mui/material/SnackbarContent';
import InfoIcon from '@mui/icons-material/Info';
import {withStyles} from '@mui/styles';
import blue from '@mui/material/colors/blue';
import {REMOVE_SNACK} from '../redux_actions/actionTypes';

const mapStateToProps = state => ({snack: state.snack});
const mapDispatchToProps = dispatch => ({
   close_snack: () => dispatch({type: REMOVE_SNACK})
});

const styles = {
   info: {backgroundColor: blue[500]},
   message: {display: 'flex', alignItems: 'center', gap: 8},
};

const UnconnectedMessageSnack = ({snack, close_snack, classes}) => {
   const [open, setOpen] = useState(false);

   const isOpen = open || (snack !== undefined && snack !== '');

   const close = () => {
      setOpen(false);
      close_snack();
   };

   return (
      <Snackbar
         anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
         open={isOpen}
         autoHideDuration={4000}
         onClose={close}
      >
         <SnackbarContent
            className={classes.info}
            message={
               <span className={classes.message}>
                  <InfoIcon style={{fontSize: 20, opacity: 0.9}}/>
                  {snack}
               </span>
            }
         />
      </Snackbar>
   );
};

const MessageSnack = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedMessageSnack));

export default MessageSnack;
