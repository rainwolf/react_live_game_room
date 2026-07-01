import Table from '../Classes/TableClass';
import User from '../Classes/UserClass';
import {Game, GameState} from '../Classes/GameClass';

// These reducer helpers are PURE state transforms. Side effects (sound, tab nudge) are
// emitted as notification intents onto state.pendingNotifications; the notification
// middleware drains them and fires through AudioService + tabNotify. Snacks become a
// typed state.notification. No side effects here — so utils/reducer are node-testable.
function emit(state, notification) {
   state.pendingNotifications = [...(state.pendingNotifications || []), notification];
}

// Commit Renju "Branch A" for a resolved move-4 window (Taraguchi-10 take-over or swap=false
// decline): the swapped-in player just places move 5, so the opening is fixed to phase MOVE — no
// 3-way BRANCH re-prompt and no Offer-10 / Branch B. Shared by the three move-4 commit sites (the
// live swapSeats take-over, the rejoin/state-sync replay, and the swap=false decision echo) so the
// commit lives in exactly ONE place.
function commitBranchA(r) {
   r.branchChosen = true;
   r.tenOffer = false;
}

export function processUser(userdata, state) {
   let user;
   if (state.users[userdata.name]) {
      user = state.users[userdata.name].newInstance();
      user.updateUser(userdata);
   } else {
      user = new User(userdata);
      // In an arena room, don't play the new-player sound when other players
      // join the room. The sound is played instead when you receive a join
      // request (arenaJoinRequest) and when a player joins your table (joinTable).
      if (state.table === undefined && !state.arena) {
         emit(state, {sound: 'newPlayer'});
      }
   }
   state.users = {...state.users, [user.name]: user};
}

export function addRoomMessage(data, state) {
   // const messages = state.room_messages.slice();
   const messages = [...state.room_messages];
   const user = state.users[data.player];
   if (!user.muted) {
      messages.push({
         message: data.text,
         player: user,
         time: new Date()
      });
      state.room_messages = messages;
   }
}

export function exitUser(name, state) {
   const {[name]: value, ...rest} = state.users;
   state.users = rest;
}

export function changeTableState(tableState, state) {
   let tables = {...state.tables};
   if (tables[tableState.table]) {
      const table = tables[tableState.table].newInstance();
      table.updateTable(tableState);
      tables[tableState.table] = table;
   } else {
      tables[tableState.table] = new Table(tableState);
      tables[tableState.table].me = state.me;
   }
   if (state.table === tableState.table) {
      let game = new Game();
      game.me = state.me;
      game.setGame(tableState.game);
      game.rated = tableState.rated;
      state.game = game;
      delete state.pressed_play;
   }
   state.tables = tables;
}

export function joinTable(joinEvent, state) {
   const tables = {...state.tables};
   let table = tables[joinEvent.table];
   if (table === undefined) {
      table = new Table({table: joinEvent.table});
      table.me = state.me;
      tables[joinEvent.table] = table;
   } else {
      table = tables[joinEvent.table].newInstance();
   }
   if (joinEvent.player === state.me) {
      state.table = joinEvent.table;
      table.me = state.me;
      if (state.game === undefined) {
         state.game = new Game();
      }
      if (state.tournament) {
         emit(state, {sound: 'newPlayer'});
      }
   } else if (state.table === joinEvent.table) {
      // Someone other than me joined my table; play the sound and nudge the tab.
      emit(state, {sound: 'newPlayer', tab: joinEvent.player + ' joined your table'});
   }
   table.addPlayer(joinEvent.player);
   tables[joinEvent.table] = table;
   state.tables = tables;
}

export function exitTable(exitEvent, state) {
   const tables = {...state.tables};
   let table = tables[exitEvent.table];
   if (table) {
      table = tables[exitEvent.table].newInstance();
      table.removePlayer(exitEvent.player);
      if (table.players.length === 0) {
         delete tables[exitEvent.table]
      } else {
         tables[exitEvent.table] = table;
      }
   }
   if (exitEvent.player === state.me) {
      state.table = undefined;
      state.game = undefined;
      state.table_messages = [];
   }
   state.tables = tables;
}

export function sitTable(data, state) {
   const tables = {...state.tables};
   const table = tables[data.table].newInstance();
   table.sit(data.player, data.seat);
   tables[data.table] = table;
   state.tables = tables;
   if (table.table === state.table) {
      delete state.pressed_play;
   }
}

export function standTable(data, state) {
   const tables = {...state.tables};
   const table = tables[data.table].newInstance();
   table.stand(data.player);
   tables[data.table] = table;
   state.tables = tables;
   if (table.table === state.table) {
      delete state.pressed_play;
   }
}

export function tableOwner(ownerEvent, state) {
   const tables = {...state.tables};
   const table = tables[ownerEvent.table].newInstance();
   table.owner = ownerEvent.player === state.me;
   tables[ownerEvent.table] = table;
   state.tables = tables;
}

export function addTableMessage(data, state) {
   const messages = [...state.table_messages];
   const user = state.users[data.player];
   if (!user.muted) {
      messages.push({
         message: data.text,
         player: user,
         time: new Date()
      });
      state.table_messages = messages;
   }
}

// Advance the tracked Renju opening record after a stone lands (mirror RenjuState.addMove).
// `isRejoin` = this is the bulk resetBoard+replay path (a rejoin/state-sync), where the decision
// echoes arrive BEFORE the move list (ServerTable sends them first), so we must NOT reopen a
// window those echoes already resolved. A fresh incremental move opens a new window and consumes
// any prior take-over marker. (code review #2)
function advanceRenjuTrackingAfterMove(game, isRejoin) {
   if (!game.isRenjuGame || !game.isRenjuGame()) return;
   const r = game.gameState.renjuState;
   const n = game.moves.length;
   if (!isRejoin) r.swapTaken = false; // incremental move opens a fresh window; consume the marker
   // Rejoin/state-sync take-over: the silent seat-swap marker arrived BEFORE this bulk move list, so
   // it could only stash swapTaken (game.moves was empty then — see swapSeats). Now that the moves
   // are replayed, a take-over marker at the move-4 window commits Branch A (Taraguchi-10): the
   // swapped-in player just places move 5, so branchChosen must be true (phase MOVE, not the 3-way
   // BRANCH re-prompt). Mirrors backend RenjuRejoin.decode, which returns a MOVE take-over for a
   // move-4 swap, and the live swapSeats take-over above.
   if (isRejoin && r.swapTaken && n === 4) {
      commitBranchA(r);
   }
   // current swap window is RESOLVED (not open) if a decision for it already arrived:
   const windowResolved = r.swapTaken ||
      (n === 4 && (r.branchChosen || r.tenOffer || r.selected != null));
   const windowOpens = !windowResolved && (n <= 4 || (n === 5 && !r.tenOffer));
   r.awaitingSwap = windowOpens;
   r.complete = !windowOpens && n >= 5;
}

export function addMove(data, state) {
   const game = state.game.newInstance();
   if (data.table === state.table) {
      if (data.moves.length === 1 && data.move === data.moves[0]) {
         // incremental append: the decision echo arrived BEFORE this move, so open a fresh window
         game.addMove(data.move);
         advanceRenjuTrackingAfterMove(game, false);
      } else {
         // bulk rejoin/state-sync replay: the decision echoes arrived FIRST, so respect any
         // window they already resolved (do NOT reopen it).
         game.resetBoard();
         for (let i = 0; i < data.moves.length; i++) {
            game.addMove(data.moves[i]);
         }
         advanceRenjuTrackingAfterMove(game, true);
      }
      if (data.player !== state.me) {
         emit(state, {sound: 'move'});
      }
   }
   state.game = game;
}

export function changeGameState(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();

      if (data.state !== game.gameState.state) {
         delete state.pressed_play;
         delete state.cancel_requested;
         delete state.undo_requested;
         delete state.waiting_modal;
         delete state.time_up_resign_cancel;
      }
      // if (data.state !== GameState.State.PAUSED) {
      //     delete state.waiting_modal;
      //     delete state.time_up_resign_cancel;
      // }

      if ((game.gameState.state === GameState.State.NOT_STARTED || game.gameState.state === GameState.State.HALFSET)
         && data.state === GameState.State.STARTED) {
         game.reset();
         const tables = {...state.tables};
         const table = tables[data.table].newInstance();
         table.resetClocks();
         tables[data.table] = table;
         state.tables = tables;
      }
      game.gameState = Object.assign(game.gameState, {state: data.state});
      state.game = game;
      // console.log(JSON.stringify(state.game))
      if (data.winner && data.winner !== '') {
         state.notification = {kind: 'gameResult', winner: data.winner};
      }
      if (data.changeText) {
         addTableMessage({player: 'game server', text: data.changeText}, state);
      }
   }
}

export function changeTimer(data, state) {
   if (data.table === state.table) {
      // console.log('timer 1', JSON.stringify(state.game.abstractBoard))

      const tables = {...state.tables};
      const table = tables[data.table].newInstance();
      let idx = table.seats.indexOf(data.player);
      if (idx < 0) {
         idx = table.seats.indexOf('');
      }
      table.clocks[idx] = {millis: data.millis, minutes: data.minutes, seconds: data.seconds, time: data.time};
      tables[data.table] = table;
      state.tables = tables;
   }
}

export function serverTableMessage(data, state) {
   if (data.table === state.table) {
      addTableMessage({player: 'game server', text: data.message}, state);
   } else if (data.table === 0) {
      addRoomMessage({player: 'game server', text: data.message}, state);
   }
}

// export function adjustTimer(data, state) {
//     const tables = { ...state.tables };
//     const table = tables[state.table].newInstance();
//     table.adjustTimer(data);
//     tables[state.table] = table;
//     state.tables = tables;
// }

export function undoRequested(data, state) {
   if (data.table === state.table) {
      const table = state.tables[data.table];
      if (table.isMyTurn(state.game)
         || (table.iAmPlaying()
            && !table.isMyTurn(state.game)
            && state.game.gameState.goState === GameState.GoState.MARK_STONES)) {
         state.undo_requested = data.player;
      }
      addTableMessage({player: 'game server', text: 'undo requested'}, state);
   }
}

export function undoReply(data, state) {
   if (data.table === state.table) {
      delete state.undo_requested;
      if (data.accepted) {
         const game = state.game.newInstance();
         game.undoMove();
         state.game = game;
      }
      addTableMessage({player: 'game server', text: 'undo ' + (data.accepted ? 'accepted' : 'denied')}, state);
   }
}

export function cancelRequested(data, state) {
   if (data.table === state.table) {
      if (state.tables[data.table].iAmPlaying() && state.me !== data.player) {
         state.cancel_requested = state.users[data.player].userhtml;
      }
      addTableMessage({player: 'game server', text: 'set cancellation requested'}, state);
   }
}

export function cancelReply(data, state) {
   if (data.table === state.table) {
      state.cancel_requested = undefined;
      addTableMessage({
         player: 'game server',
         text: 'set cancellation ' + (data.accepted ? 'accepted' : 'denied')
      }, state);
   }
}


export function swapSeats(data, state) {
   if (data.table === state.table) {
      if (!data.silent && data.swap) {
         // console.log('swapping at utils')
         const tables = {...state.tables};
         const table = tables[state.table].newInstance();
         table.swap();
         tables[data.table] = table;
         state.tables = tables;
      }
      const game = state.game.newInstance();
      game.gameState.dPenteState = data.swapped ? GameState.DPenteState.SWAPPED : GameState.DPenteState.NOT_SWAPPED;
      game.gameState.swap2State = data.swapped ? GameState.Swap2State.SWAPPED : GameState.Swap2State.NOT_SWAPPED;
      // Renju: a seat-swap event is the LIVE delivery of a TAKE-OVER. The server broadcasts a
      // (non-silent) DSGSwapSeatsTableEvent after renjuSwapDecisionMade(true); the renju swap event
      // (dsgRenjuTaraguchiSwapTableEvent -> renjuSwap) stays a decision-only echo used for swap=false
      // declines + Branch A move 5. The visual seat swap is done by the !silent && swap branch above;
      // the rejoin marker is a silent one (seats come from sendPlayingPlayers). EITHER way clear
      // awaitingSwap so the phase advances, and set swapTaken = true so the bulk rejoin replay does
      // not REOPEN this resolved window.
      //
      // A seat swap ONLY ever happens on a take-over (a decline changes no seats), so at the move-4
      // window (game.moves.length === 4) this unambiguously means "took over move 4 -> Branch A"
      // (Taraguchi-10): commit Branch A here so the swapped-in player just places move 5 and the
      // Offer-10 / Branch-B affordance is unreachable (phase MOVE, not the 3-way BRANCH re-prompt).
      // At earlier windows (n<4) or the Branch-A move-5 window (n==5) a take-over resolves the
      // window WITHOUT choosing a branch. The silent rejoin marker arrives BEFORE its bulk move list
      // (game.moves is still empty here), so that path commits Branch A in advanceRenjuTrackingAfterMove.
      if (game.isRenjuGame && game.isRenjuGame()) {
         const r = game.gameState.renjuState;
         r.awaitingSwap = false;
         r.swapTaken = true;
         if (game.moves.length === 4) {
            commitBranchA(r);
         }
      }
      state.game = game;
   }
}

export function setPlayingPlayerTable(data, state) {
   if (data.table === state.table) {
      const tables = {...state.tables};
      const table = tables[state.table].newInstance();
      table.seats[data.seat] = data.player;
      tables[data.table] = table;
      state.tables = tables;
   }
}

export function rejectGoState(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();
      game.rejectGoState();
      state.game = game;
      addTableMessage({player: 'game server', text: data.player + ' rejected the assessment, play continues.'}, state);
   }
}

export function resignOrCancel(data, state) {
   if (data.table === state.table) {
      state.waiting_modal = true;
      state.time_up_resign_cancel = true;
   }
}

export function moveForwardBack(forward, state) {
   const game = state.game.newInstance();
   game.goForwardBack(forward);
   state.game = game;
}

export function moveGoTo(i, state) {
   const game = state.game.newInstance();
   game.goto_move(i);
   state.game = game;
}

export function mute(player, state) {
   const user = state.users[player].newInstance();
   user.muted = true;
   state.users = {...state.users, [player]: user};
}

export function unmute(player, state) {
   const user = state.users[player].newInstance();
   delete user.muted;
   state.users = {...state.users, [player]: user};
}

export function bootEvent(data, state) {
   if (data.table === state.table && data.toBoot !== state.me) {
      addTableMessage({
         player: 'game server',
         text: data.toBoot + ' was booted from this table by ' + data.player + ' and won\'t be able to return for 5 minutes.'
      }, state);
   } else {
      // TODO: make this an error snackbar
      addRoomMessage({
         player: 'game server',
         text: 'You were booted by ' + data.player + ' from their table and won\'t be able to return for 5 minutes.'
      }, state);
   }
}

export function invitationReceived(data, state) {
   const user = state.users[data.player];
   if (data.toInvite === state.me && !user.muted) {
      state.received_invitation = {by: data.player, message: data.inviteText, table: data.table};
   }
}

export function invitationReply(data, state) {
   if (data.toPlayer === state.me) {
      let message = data.player + ' ' + (data.accept ? 'accepted' : 'declined') + ' your invitation.';
      if (data.responseText && data.responseText !== '') {
         message += '\nTheir message: "' + data.responseText + '"';
      }
      if (state.table) {
         addTableMessage({player: 'game server', text: message}, state);
      } else {
         addRoomMessage({player: 'game server', text: message}, state);
      }
   }
}

export function swap2Pass(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();
      game.swap2Pass();
      state.game = game;
   }
}

export function arenaJoinRequest(data, state) {
   if (data.table === state.table) {
      const tables = {...state.tables};
      const table = tables[state.table].newInstance();
      table.addArenaPlayerRequest(data.player);
      tables[data.table] = table;
      state.tables = tables;
      // Arena join request for my table; play the sound and nudge the tab.
      emit(state, {sound: 'newPlayer', tab: data.player + ' wants to join your table'});
   }
}


export function arenaRemoveJoinRequest(data, state) {
   if (data.table === state.table) {
      const tables = {...state.tables};
      const table = tables[state.table].newInstance();
      table.removeArenaPlayerRequest(data.player);
      tables[data.table] = table;
      state.tables = tables;
   }
}

export function arenaRejectRequest(data, state) {
   if (data.playerToReject === state.me) {
      state.notification = {kind: 'info', message: data.message};
   }
}

export function renjuSwap(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();
      const r = game.gameState.renjuState;
      r.awaitingSwap = false;
      // The renju swap event is a DECISION-ONLY echo (backend renjuSwapDecisionMade). A swap=false
      // at the move-4 window (or the standalone branch-choice state) continues Branch A; the bundled
      // stone arrives via the following DSGMoveTableEvent. A TAKEN swap is NOT delivered here — the
      // live server broadcasts a take-over as a seat-swap event (DSGSwapSeatsTableEvent -> swapSeats),
      // which is where Branch A is committed and the visual seat swap (table.swap()) happens. So this
      // handler only ever commits Branch A on the swap=false decline; it never touches branchChosen on
      // a swap=true.
      if (data.swap === false && game.moves.length === 4) {
         commitBranchA(r);
      }
      state.game = game;
   }
}

export function renjuOffer10(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();
      const r = game.gameState.renjuState;
      r.branchChosen = true;
      r.tenOffer = true;
      r.offered = [...data.moves];
      r.awaitingSwap = false;
      state.game = game;
   }
}

export function renjuSelect1(data, state) {
   if (data.table === state.table) {
      const game = state.game.newInstance();
      game.gameState.renjuState.selected = data.move;
      state.game = game;
   }
}
