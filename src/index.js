import React from 'react';
import './index.css';
import App from './App';
import {applyMiddleware} from 'redux';
import {legacy_createStore as createStore} from 'redux';
import {Provider} from 'react-redux';
import * as serviceWorker from './serviceWorker';
import liveGameApp from './redux_reducers/rootReducer';
import reduxWebsocket from '@giantmachines/redux-websocket';
import {protocolMiddleware} from './protocol/middleware';
import {disableReactDevTools} from '@fvilers/disable-react-devtools';
import {ThemeProvider} from "@mui/styles";
import {createRoot} from "react-dom/client";

if (process.env.NODE_ENV === 'production') {
   disableReactDevTools();
}

const reduxWebsocketMiddleware = reduxWebsocket();

const store = createStore(liveGameApp, applyMiddleware(reduxWebsocketMiddleware, protocolMiddleware));

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
