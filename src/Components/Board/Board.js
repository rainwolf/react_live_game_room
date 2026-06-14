import React from 'react';
import BoardSquare from './BoardSquare';
import {GameState, Game} from "../../Classes/GameClass";
import Table from "../../Classes/TableClass";
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {send_message} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {selectCurrentTable} from '../../selectors';
import {gridSizeForGame, boardStyleClass, boardSpecialPoints} from '../../game/boardGeometry';

const mapStateToProps = state => {
   const table = selectCurrentTable(state);
   return {
      game_id: table.game,
      game: state.game,
      table: table
   }
};

const mapDispatchToProps = dispatch => {
   return {
      send_message: message => {
         dispatch(send_message(message));
      },
   }
};


const UnconnectedBoard = (props) => {

   const {game_id, game, table, send_message} = props;

   const sendMove = (move) => {
      send_message(Commands.move({move: move, moves: [move], player: table.me, table: table.table}));
   };

   // console.log(JSON.stringify(game.abstractBoard))

   const makeBoard = (gridsize) => {
      if (game === undefined || table === undefined) {
         return [];
      }
      let board = [];
      let player_colors = [undefined, 'white-stone-gradient', 'black-stone-gradient'];
      if (game.isGo()) {
         player_colors = [undefined, 'black-stone-gradient', 'white-stone-gradient'];
      }
      let hover = player_colors[game.currentColor()];
      if (game.isGo() && game.gameState.goState === GameState.GoState.MARK_STONES) {
         hover = 'red-stone-gradient';
      }
      const myTurn = table.isMyTurn(game) && game.gameState.state === GameState.State.STARTED;
      // console.log('my turn: ', myTurn);
      // console.log('my turn: ', table.isMyTurn(game));
      // console.log('makeBoard');
      for (let j = 0; j < gridsize; j++) {
         for (let i = 0; i < gridsize; i++) {
            const m = j * gridsize + i;
            let squaretype;
            if (m === 0) {
               squaretype = 1;
            } else if (m === gridsize - 1) {
               squaretype = 3;
            } else if (m === gridsize * gridsize - 1) {
               squaretype = 9;
            } else if (m === gridsize * (gridsize - 1)) {
               squaretype = 7;
            } else if (j === 0) {
               // } else if (Math.floor(m / gridsize) === 0) {
               squaretype = 2;
            } else if (j === gridsize - 1) {
               // } else if (Math.floor(m / gridsize) === gridsize - 1) {
               squaretype = 8;
               // } else if (m % gridsize === 0) {
            } else if (i === 0) {
               squaretype = 4;
               // } else if (m % gridsize === gridsize - 1) {
            } else if (i === gridsize - 1) {
               squaretype = 6;
            } else {
               squaretype = 5;
            }

            const stone = player_colors[game.abstractBoard[i][j]];
            let clickHandler = undefined;
            if (myTurn) {
               if (game.abstractBoard[i][j] === 0) {
                  clickHandler = sendMove;
               }
               if (game.isGo() && game.gameState.goState === GameState.GoState.MARK_STONES) {
                  if (clickHandler === undefined) {
                     clickHandler = sendMove;
                  } else {
                     clickHandler = undefined;
                  }
               }
            }
            board.push({
               key: m, gridsize: gridsize, id: m,
               part: squaretype, stone: stone,
               clickHandler: clickHandler,
               hover: hover
            });
         }
      }
      if (game.isGo() && game.gameState.goState > GameState.GoState.PLAY) {
         for (let i = 1; i < 3; i++) {
            game.goDeadStonesByPlayer[i].forEach(s => {
               board[s].deadStone = player_colors[i];
            });
         }
         for (let i = 1; i < 3; i++) {
            // console.log(JSON.stringify(game.goTerritoryByPlayer[i]))
            game.goTerritoryByPlayer[i].forEach(s => {
               board[s].territory = i;
            });
         }
      }
      boardSpecialPoints(game_id).forEach(({index, part}) => {
         board[index].part = part;
      });
      const lastMoves = game.last_move();
      lastMoves.forEach(move => {
         if (move !== undefined) {
            board[move].last_move = true;
         }
      });

      return board.map(p => <BoardSquare {...p}/>);
   };
   const makeCoordinateBoundaries = (gridsize) => {
      const coordinateLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
      let coordinates = [];
      for (let i = 1; i <= gridsize; i++) {
         coordinates.push(
            <text key={i} y={1} fontSize={4} transform={'translate(0,' + (10 * i) + ')'}>
               {gridsize - i + 1}
            </text>
         );
         coordinates.push(
            <text key={coordinateLetters[i] + i} y={4} fontSize={4} transform={'translate(' + (10 * i) + ',0)'}>
               {coordinateLetters[i - 1]}
            </text>
         )
      }
      return coordinates;
   };

   const style = boardStyleClass(game_id);
   const gridsize = gridSizeForGame(game_id);
   return (
      <svg id="svgboard" height={'100%'} viewBox={'0 0 ' + (10 * (gridsize + 1)) + ' ' + (10 * (gridsize + 1))}>
         <g id={'whole'} transform={'translate(5,5)'}>
            <g id="boardgroup" transform={'scale(0.95, 0.95) translate(5,5)'}>
               <filter id="f3" x="0" y="0" width="150%" height="150%">
                  <feOffset result="offOut" in="SourceAlpha" dx={4} dy={4}/>
                  <feGaussianBlur result="blurOut" in="offOut" stdDeviation="3"/>
                  <feBlend in="SourceGraphic" in2="blurOut" mode="normal"/>
               </filter>
               <rect height={10 * gridsize} width={10 * gridsize} filter={"url(#f3)"} className={'board ' + style}/>
               {makeBoard(gridsize)}
            </g>
            <g id="coordinates" transform={'scale(0.95, 0.95)'}>
               {makeCoordinateBoundaries(gridsize)}
            </g>
         </g>
      </svg>
   );
};

UnconnectedBoard.propTypes = {
   table: PropTypes.instanceOf(Table).isRequired,
   game: PropTypes.instanceOf(Game).isRequired
};

const Board = connect(mapStateToProps, mapDispatchToProps)(UnconnectedBoard);

export default Board;