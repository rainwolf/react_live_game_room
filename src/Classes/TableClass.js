import {GameState} from "./GameClass";

const PRIVATE_TABLE = 2;

class Table {
   constructor(tableState) {
      this.seats = [undefined, "", ""];
      this.players = [];
      if (tableState) {
         this.clocks = [undefined, {minutes: tableState.initialMinutes, seconds: 0},
            {minutes: tableState.initialMinutes, seconds: 0}];
         this.updateTable(tableState);
      } else {
         this.clocks = [undefined, {minutes: 0, seconds: 0}, {minutes: 0, seconds: 0}];
      }
   }

   newInstance = () => {
      const newTable = new Table();
      newTable.seats = [...this.seats];
      newTable.players = [...this.players];
      newTable.clocks = [...this.clocks];
      newTable.me = this.me;
      newTable.table = this.table;
      newTable.timed = this.timed;
      newTable.initialMinutes = this.initialMinutes;
      newTable.incrementalSeconds = this.incrementalSeconds;
      newTable.rated = this.rated;
      newTable.game = this.game;
      newTable.tableType = this.tableType;
      newTable.owner = this.owner;

      return newTable;
   };

   canUndo = (game) => {
      if (game.isGo() && game.gameState.goState === GameState.GoState.MARK_STONES) {
         return this.isMyTurn(game);
      } else if (game.isConnect6()) {
         if (game.gameState.state === GameState.State.STARTED) {
            if (game.moves.length % 4 === 1 || game.moves.length % 4 === 3) {
               return this.me === this.seats[3 - game.currentPlayer()];
            } else {
               return this.me === this.seats[game.currentPlayer()];
            }
         }
      } else {
         return game.gameState.state === GameState.State.STARTED && this.me === this.seats[3 - game.currentPlayer()];
      }
   };

   player_color = (p) => {
      if (this.game > 18 && this.game < 25) {
         p = 3 - p;
      }
      if (p === 1) {
         return 'white-stone-gradient';
      }
      return 'black-stone-gradient';
   };

   isMyTurn = (game) => {
      return game.gameState.state === GameState.State.STARTED && this.me === this.seats[game.currentPlayer()];
   };

   isMySeat = (seat) => {
      return this.me === this.seats[seat];
   };

   canExit = (game) => {
      return !(this.iAmPlaying() && game.canNotLeave());
   };

   private = () => {
      return this.tableType === PRIVATE_TABLE;
   };

   table_color = () => {
      let style;
      if (this.game < 3) {
         style = '#FDDEA3'
      } else if (this.game < 5) {
         style = '#BAFDA3'
      } else if (this.game < 7) {
         style = '#A3FDEB'
      } else if (this.game < 9) {
         style = '#A3CDFD'
      } else if (this.game < 11) {
         style = '#AEA3FD'
      } else if (this.game < 13) {
         style = '#EDA3FD'
      } else if (this.game < 15) {
         style = '#EDA3FD'
      } else if (this.game < 17) {
         style = '#25BAFF'
      } else if (this.game < 19) {
         style = '#FFA500'
      } else if (this.game < 25) {
         style = '#FAC832'
      } else if (this.game < 27) {
         style = '#52BE80'
      } else if (this.game < 29) {
         style = '#E5AA70'
      } else {
         style = '#50C878';
      }
      return style;
   };

   game_name = (g) => {
      if (g === undefined) {
         g = this.game;
      }
      let name;
      if (g < 3) {
         name = 'Pente';
      } else if (g < 5) {
         name = 'Keryo-Pente';
      } else if (g < 7) {
         name = 'Gomoku';
      } else if (g < 9) {
         name = 'D-Pente';
      } else if (g < 11) {
         name = 'G-Pente';
      } else if (g < 13) {
         name = 'Poof-Pente';
      } else if (g < 15) {
         name = 'Connect6';
      } else if (g < 17) {
         name = 'Boat-Pente';
      } else if (g < 19) {
         name = 'DK-Pente';
      } else if (g < 21) {
         name = 'Go';
      } else if (g < 23) {
         name = 'Go (9x9)';
      } else if (g < 25) {
         name = 'Go (13x13)';
      } else if (g < 27) {
         name = 'O-Pente';
      } else if (g < 29) {
         name = 'Swap2-Pente';
      } else if (g < 31) {
         name = 'Swap2-Keryo';
      }
      if (g % 2 === 0) {
         return 'Speed ' + name;
      }
      return name;
   };

   gameHasCaptures = () => {
      return this.game < 5 || this.game > 6;
   };

   updateTable = (tableState) => {
      if (this.initialMinutes !== tableState.initialMinutes) {
         this.clocks = [undefined, {minutes: tableState.initialMinutes, seconds: 0},
            {minutes: tableState.initialMinutes, seconds: 0}];
      }
      Object.assign(this, tableState);
   };

   resetClocks = () => {
      this.clocks = [undefined, {minutes: this.initialMinutes, seconds: 0},
         {minutes: this.initialMinutes, seconds: 0}];
   };

   addPlayer = (player) => {
      this.players.push(player);
   };

   removePlayer = (player) => {
      this.players = this.players.filter(p => p !== player);
   };

   watching = () => {
      return this.players.filter(player => this.seats[1] !== player && this.seats[2] !== player);
   };

   sit = (player, seat) => {
      this.seats[seat] = player;
   };

   stand = (player) => {
      for (let i = 1; i < 3; i++) {
         if (this.seats[i] === player) {
            this.seats[i] = "";
            break;
         }
      }
   };

   adjustTimer = (data) => {
      this.clocks = [...this.clocks];
      this.clocks[data.player] = {minutes: data.minutes, seconds: data.seconds};
   };

   swap = () => {
      // console.log('swapping at table')
      this.seats = [undefined, this.seats[2], this.seats[1]];
      this.clocks = [undefined, this.clocks[2], this.clocks[1]];
   };

   iAmPlaying = () => {
      return this.me === this.seats[1] || this.me === this.seats[2];
   };

   fullSeats = () => {
      return this.seats[1] !== '' && this.seats[2] !== '';
   };

   myDPenteChoice = (game) => {
      return this.isMyTurn(game) && game.dPenteChoice();
   };

   mySwap2Choice = (game) => {
      return this.isMyTurn(game) && game.swap2Choice();
   };
}

export default Table;