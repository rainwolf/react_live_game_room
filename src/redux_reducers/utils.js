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
    const table = Object.assign( Object.create( Object.getPrototypeOf(tables[data.table])), tables[data.table]);
    table.sit(data.player, data.seat);
    tables[data.table] = table;
    state.tables = tables;
}

export function standTable(data, state) {
    const tables = { ...state.tables };
    const table = Object.assign( Object.create( Object.getPrototypeOf(tables[data.table])), tables[data.table]);
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
    // let game = new Game();
    // state.game.copyOnto(game);
    let game =  Object.assign( Object.create( Object.getPrototypeOf(state.game)), state.game);
    if (data.table === state.table) {
        if (data.moves.length === 1 && data.move === data.moves[0]) {
            game.addMove(data.move);
        } else {
            game.reset();
            for(let i = 0; i < data.moves.length; i++) {
                game.addMove(data.moves[i]);
            }
        } 
    }
    state.game = game;
}

export function changeGameState(data, state) {
    if (data.table === state.table) {
        let game =  Object.assign( Object.create( Object.getPrototypeOf(state.game)), state.game);
        if ((game.gameState.state === GameState.State.NOT_STARTED || game.gameState.state === GameState.State.HALFSET) 
            && data.state === GameState.State.STARTED) {
            game.reset();
            const tables = { ...state.tables };
            const table = Object.assign( Object.create( Object.getPrototypeOf(tables[data.table])), tables[data.table]);
            table.resetClocks();
            tables[data.table] = table;
            state.tables = tables;
        } 
        game.gameState.state = data.state;
        state.game = game;
        if (data.changeText) {
            addTableMessage({player: 'game server', text: data.changeText}, state);
        } 
    } 
}

export function changeTimer(data, state) {
    if (data.table === state.table) {
        const tables = { ...state.tables };
        const table = Object.assign( Object.create( Object.getPrototypeOf(tables[data.table])), tables[data.table]);
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