import React from 'react';
import TextField from '@mui/material/TextField';
import PropTypes from 'prop-types';
import {KID_CHAT_HINT} from '../../ui/kidMode';

const ChatInput = (props) => (
   <TextField
      id="filled-full-width"
      label="Talk here!"
      // style={{ margin: 8}}
      placeholder="Press Enter to send"
      helperText={props.kidMode ? KID_CHAT_HINT : undefined}
      fullWidth
      margin="normal"
      variant="filled"
      InputLabelProps={{
         shrink: true,
      }}
      onKeyDown={props.sendHandler}
   />
);

ChatInput.propTypes = {
   sendHandler: PropTypes.func.isRequired,
   kidMode: PropTypes.bool
};

export default ChatInput;