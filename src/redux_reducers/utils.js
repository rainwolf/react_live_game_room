import Table from './TableClass';
import User from './UserClass';
import { Game, GameState } from './GameClass';

export function processUser(userdata, state) {
    let user;
    if (state.users[userdata.name]) {
        user = state.users[userdata.name];
        user.updateUser(userdata);
    } else {
        user = new User(userdata);
    }
    state.users = { ...state.users, [user.name]: user };
}
       
export function addRoomMessage(data, state) {
    // const messages = state.room_messages.slice();
    const messages = [...state.room_messages];
    const user = state.users[data.player];
    messages.push( {
        message: data.text,
        player: user
    });
    state.room_messages = messages;
}

export function exitUser(name, state) {
    const {[name]: value, ...rest} = state.users;
    state.users = rest;
}

export function changeTableState(tableState, state) {
    let tables = { ...state.tables };
    if (tables[tableState.table]) {
        tables[tableState.table].updateTable(tableState);
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
    } 
    state.tables = tables;
}

export function joinTable(joinEvent, state) {
    const tables = { ...state.tables };
    let table = tables[joinEvent.table];
    if (table === undefined) {  
        table = new Table({table: joinEvent.table});
        table.me = state.me;
        tables[joinEvent.table] = table;
    }
    if (joinEvent.player === state.me) {
        state.table = joinEvent.table;
        table.me = state.me;
        if (state.game === undefined) {
            state.game = new Game();
        } 
    }
    table.addPlayer(joinEvent.player);
    state.tables = tables;
}

export function exitTable(exitEvent, state) {
    const tables = { ...state.tables };
    const table = tables[exitEvent.table];
    if (table) {
        table.removePlayer(exitEvent.player);
        if (table.players.length === 0) { delete tables[exitEvent.table]} 
    }
    if (exitEvent.player === state.me) {
        state.table = undefined;
        state.game = undefined;
        state.table_messages = [];
    } 
    state.tables = tables;
}

export function sitTable(data, state) {
    const tables = { ...state.tables };
    const table = tables[data.table].newInstance();
    table.sit(data.player, data.seat);
    tables[data.table] = table;
    state.tables = tables;
}

export function standTable(data, state) {
    const tables = { ...state.tables };
    const table = tables[data.table].newInstance();
    table.stand(data.player);
    tables[data.table] = table;
    state.tables = tables;
}

export function tableOwner(ownerEvent, state) {
    const tables = { ...state.tables };
    const table = tables[ownerEvent.table];
    table.owner = ownerEvent.player === state.me;
    state.tables = tables;
}

export function addTableMessage(data, state) {
    const messages = [...state.table_messages];
    const user = state.users[data.player];
    messages.push( {
        message: data.text,
        player: user
    });
    state.table_messages = messages;
}

export function addMove(data, state) {
    const game =  state.game.newInstance();
    if (data.table === state.table) {
        if (data.moves.length === 1 && data.move === data.moves[0]) {
            game.addMove(data.move);
        } else {
            game.resetBoard();
            for(let i = 0; i < data.moves.length; i++) {
                game.addMove(data.moves[i]);
            }
        } 
    }
    state.game = game;
}

export function changeGameState(data, state) {
    if (data.table === state.table) {
        const game = state.game.newInstance();

        // console.log('game state change from ', game.gameState.state, ' to ', data.state)

        if ((game.gameState.state === GameState.State.NOT_STARTED || game.gameState.state === GameState.State.HALFSET) 
            && data.state === GameState.State.STARTED) {
            game.reset();
            const tables = { ...state.tables };
            const table = Object.assign( Object.create( Object.getPrototypeOf(tables[data.table])), tables[data.table]);
            table.resetClocks();
            tables[data.table] = table;
            state.tables = tables;
        } 
        game.gameState = Object.assign(game.gameState, { state: data.state });
        state.game = game;
        // console.log(JSON.stringify(state.game))
        if (data.changeText) {
            addTableMessage({player: 'game server', text: data.changeText}, state);
        } 
    } 
}

export function changeTimer(data, state) {
    if (data.table === state.table) {
        const tables = { ...state.tables };
        const table = tables[data.table].newInstance();
        const idx = table.seats.indexOf(data.player);
        table.clocks[idx].minutes = data.minutes;
        table.clocks[idx].seconds = data.seconds;
        tables[data.table] = table;
        state.tables = tables;
    }
}

export function serverTableMessage(data, state) {
    if (data.table === state.table) {
        addTableMessage({player: 'game server', text: data.message}, state);
    }
}

export function adjustTimer(data, state) {
    const tables = { ...state.tables };
    const table = tables[state.table].newInstance();
    table.adjustTimer(data);
    tables[state.table] = table;
    state.tables = tables;
}

export function undoRequested(data, state) {
    if (data.table === state.table) {
        if (state.tables[data.table].iAmPlaying() && state.tables[data.table].isMyTurn(state.game)) {
            const tables = { ...state.tables };
            const table = tables[state.table].newInstance();
            table.undo_requested = state.users[data.player].userhtml;
            tables[data.table] = table;
            state.tables = tables;
        }
        addTableMessage({player: 'game server', text: 'undo requested'}, state);
    }
}

export function undoReply(data, state) {
    if (data.table === state.table) {
        const tables = { ...state.tables };
        const table = tables[state.table].newInstance();
        delete table.undo_requested;
        if (data.accepted) {
            const game = state.game.newInstance();
            game.undoMove();
            state.game = game;
        } 
        tables[data.table] = table;
        state.tables = tables;
        addTableMessage({player: 'game server', text: 'undo ' + (data.accepted?'accepted':'denied')}, state);
    }
}

export function cancelRequested(data, state) {
    if (data.table === state.table) {
        if (state.tables[data.table].iAmPlaying() && state.me !== data.player) {
            const tables = { ...state.tables };
            const table = tables[state.table].newInstance();
            table.cancel_requested = state.users[data.player].userhtml;
            tables[data.table] = table;
            state.tables = tables;
        }
        addTableMessage({player: 'game server', text: 'set cancellation requested'}, state);
    }
}

// export function cancelReply(data, state) {
//     if (data.table === state.table) {
//         addTableMessage({player: 'game server', text: 'set cancellation ' + (data.accepted?'accepted':'denied')}, state);
//     }
// }

export function swapSeats(data, state) {
    if (data.table === state.table) {
        if (!data.silent) {
            // console.log('swapping at utils')
            const tables = { ...state.tables };
            const table = tables[state.table].newInstance();
            table.swap();
            tables[data.table] = table;
            state.tables = tables;
        }
        const game = state.game.newInstance();
        game.gameState.dPenteState = data.swapped?GameState.DPenteState.SWAPPED:GameState.DPenteState.NOT_SWAPPED;
        state.game = game;
    }    
}

export function setPlayingPlayerTable(data, state) {
    if (data.table === state.table) {
        const tables = { ...state.tables };
        const table = tables[state.table].newInstance();
        table.seats[data.seat] = data.player;
        tables[data.table] = table;
        state.tables = tables;
    }
}