import React from 'react';
import './index.css';
import App from './App';
import {applyMiddleware} from 'redux';
import {legacy_createStore as createStore} from 'redux';
import {Provider} from 'react-redux';
import * as serviceWorker from './serviceWorker';
import liveGameApp from './redux_reducers/rootReducer';
import reduxWebsocket, {WEBSOCKET_MESSAGE, WEBSOCKET_SEND} from '@giantmachines/redux-websocket';
import {disableReactDevTools} from '@fvilers/disable-react-devtools';
import {ThemeProvider} from "@mui/styles";
import {createRoot} from "react-dom/client";

if (process.env.NODE_ENV === 'production') {
   disableReactDevTools();
}

// ping middleware to respond to pings
const pinger = store => next => action => {
   let result = next(action);
   if (action.type === WEBSOCKET_MESSAGE && action.payload.data.indexOf('dsgPingEvent') > -1) {
      const replyPing = {type: WEBSOCKET_SEND, payload: JSON.parse(action.payload.data)};
      replyPing.type = WEBSOCKET_SEND;
      store.dispatch(replyPing);
   }
   return result
};

const reduxWebsocketMiddleware = reduxWebsocket();

const store = createStore(liveGameApp, applyMiddleware(reduxWebsocketMiddleware, pinger));

const root = createRoot(document.getElementById("root"));
root.render(
   <React.StrictMode>
      <Provider store={store}>
         <ThemeProvider theme={{}}>
            <App/>
         </ThemeProvider>
      </Provider>,
   </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
