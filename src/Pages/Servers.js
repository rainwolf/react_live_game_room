import React, {Component} from 'react';
// import { WEBSOCKET_CONNECT } from '@giantmachines/redux-websocket';
import {connect} from 'react-redux';
import {connectServer, connectSocket} from '../redux_actions/actionTypes';
import {requestNotificationPermission} from '../utils/tabNotify';

const mapDispatchToProps = dispatch => {
   return {
      onServerClick: server => {
         // Selecting a server is a user gesture, the moment browsers will
         // actually surface the notification permission prompt.
         requestNotificationPermission();
         dispatch(connectServer(server));
         dispatch(connectSocket(server.port));
      }
   }
};

class UnconnectedServers extends Component {
   constructor(props) {
      super(props);
      this.state = {
         servers: []
      }
   }

   // StrictMode (dev) mounts, unmounts and remounts: drop the first mount's server list so
   // the ?guest auto-connect fires once. A second connect closes the first socket, whose
   // close resets the store, remounting Servers into another auto-connect — a login loop.
   componentDidMount() {
      this.abortController = new AbortController();
      this.reloadServers(this.abortController.signal);
   }

   componentWillUnmount() {
      this.abortController.abort();
   }

   reloadServers(signal) {
      fetch('/gameServer/activeServers')
         .then(response => response.text())
         .then(res => {
            if (signal.aborted) {
               return;
            }
            const splt = res.split('\n');
            let servers = [];
            for (let i = 0; i < splt.length; i++) {
               const str = splt[i];
               if (str.length === 0) {
                  continue;
               }
               const port = str.substr(0, str.indexOf(' '));
               const name = str.substr(str.indexOf(' ') + 1);
               servers.push({port: port, name: name});
            }
            if (window.location.search && window.location.search.indexOf('?guest') > -1) {
               for (let i = 0; i < servers.length; i++) {
                  if (servers[i].name.indexOf('Arena Server') === 0) {
                     this.props.onServerClick(servers[i]);
                     return;
                  }
               }
            }
            this.setState({servers: servers});
         });
   }

   render() {
      return (
         <div>
            {this.state.servers.map((server, i) =>
               (
                  <div key={i} style={{height: 100, width: "100%", border: "solid", verticalAlign: "middle"}}
                       align="center"
                       onClick={() => this.props.onServerClick(server)}>
                     <h1>{server.name}</h1>
                  </div>
               )
            )}
         </div>
      )
   }
}

const Servers = connect(undefined, mapDispatchToProps)(UnconnectedServers);

export default Servers;