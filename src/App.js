import React from 'react';
import './App.css';
import Servers from './Pages/Servers';
import Room from "./Pages/Room";
import {connect} from 'react-redux';
import TableView from "./Pages/Table";
import Arena from "./Pages/Arena";
// import Test from "./test/Test";

const mapStateToProps = state => {
   return {
      table: state.table,
      room: state.server,
      arena: state.arena
   }
};

const UnconnectedApp = (props) => {
   const {table, room, arena} = props;

   if (table) {
      return (
         <div style={{width: '100vw', height: '100vh'}}>
            <TableView/>
         </div>
      );
   } else if (room) {
      if (arena) {
         return <Arena/>
      }
      return <Room/>
   } else {
      return <Servers/>
   }
};

const App = connect(mapStateToProps)(UnconnectedApp);

export default App;
