import {GameState} from "./GameClass";
import {game_name} from "./Utils";
import {isGoBoard, variantKey} from "../game/boardGeometry";

const PRIVATE_TABLE = 2;

// Lobby table-card background colour per variant, keyed by the canonical variantKey so the
// game-id partition is not duplicated against boardGeometry. poof-pente and connect6
// deliberately share a colour.
const VARIANT_COLORS = {
   'pente': '#FDDEA3',
   'keryo-pente': '#BAFDA3',
   'gomoku': '#A3FDEB',
   'd-pente': '#A3CDFD',
   'g-pente': '#AEA3FD',
   'poof-pente': '#EDA3FD',
   'connect6': '#EDA3FD',
   'boat-pente': '#25BAFF',
   'dk-pente': '#FFA500',
   'go': '#FAC832',
   'o-pente': '#52BE80',
   'swap2-pente': '#E5AA70',
   'swap2-keryo': '#50C878',
};

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
      if (isGoBoard(this.game)) {
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

   table_color = () => VARIANT_COLORS[variantKey(this.game)];

   addArenaPlayerRequest = (player) => {
      if (!this.arenaPlayerRequests) {
         this.arenaPlayerRequests = [];
      }
      this.arenaPlayerRequests.push(player);
   }

   removeArenaPlayerRequest = (player) => {
      if (this.arenaPlayerRequests) {
         this.arenaPlayerRequests = this.arenaPlayerRequests.filter(p => p !== player);
      }
   }

   showChat = (arena) => {
      if (arena) {
         return this.players.length > 1;
      }
      return true;
   }

   game_name = (g) => {
      if (g === undefined) {
         g = this.game;
      }
      return game_name(g);
   };

   gameIsGo = () => isGoBoard(this.game);

   colorForSeat = (seat) => {
      if (this.gameIsGo()) {
         seat = 3 - seat;
      }
      if (seat === 2) {
         return 'grey';
      } else {
         return 'white';
      }
   };

   gameHasCaptures = () => variantKey(this.game) !== 'gomoku';

   updateTable = (tableState) => {
      if (this.initialMinutes !== tableState.initialMinutes) {
         this.clocks = [undefined, {minutes: tableState.initialMinutes, seconds: 0},
            {minutes: tableState.initialMinutes, seconds: 0}];
      }
      Object.assign(this, tableState);
   };

   resetClocks = () => {
      const seconds = this.initialMinutes === 0 ? this.incrementalSeconds : 0;
      const time = new Date().getTime();
      this.clocks = [undefined, {minutes: this.initialMinutes, seconds: seconds, time: time},
         {minutes: this.initialMinutes, seconds: seconds, time: time}];
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

   // Whether this seat's clock should be counting down: a timed game, both seats filled
   // (the clock never runs while a seat is empty), the game underway, and it being this
   // seat's turn.
   clockRunning = (game, seat) => {
      return this.timed && this.fullSeats()
         && game.currentPlayer() === seat
         && game.gameState.state === GameState.State.STARTED;
   };

   myDPenteChoice = (game) => {
      return this.isMyTurn(game) && game.dPenteChoice();
   };

   mySwap2Choice = (game) => {
      return this.isMyTurn(game) && game.swap2Choice();
   };
}

export default Table;