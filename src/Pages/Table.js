import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { send_message, toggleSettings } from "../redux_actions/actionTypes";
import PropTypes from 'prop-types';
import User from "../redux_reducers/UserClass";
import {Game, GameState} from '../redux_reducers/GameClass';
import Table from '../redux_reducers/TableClass';
import Board from '../Components/Board/Board';
import Grid from '@material-ui/core/Grid';
import ChatComponent from '../Components/Chat/ChatComponent';
import Button from '@material-ui/core/Button';
import UndoModal from '../Components/Table/UndoModal';
import CancelModal from '../Components/Table/CancelModal';
import DPenteChoiceModal from '../Components/Table/DPenteChoiceModal';
import SettingsModal from '../Components/Table/SettingsModal';
import GameInfoPanel from '../Components/Table/GameInfoPanel';
import EvaluateGoModal from '../Components/Table/EvaluateGoModal';
import WaitPlayerReturnModal from "../Components/Table/WaitPlayerReturnModal";
import ResignCancelLostPlayerModal from "../Components/Table/ResignCancelLostPlayerModal";
import AdSense from 'react-adsense';


const mapStateToProps = state => {
    return {
        users: state.users,
        game: state.game,
        messages: state.table_messages,
        table: state.tables[state.table],
        freeloader: state.freeloader
    }
};

const mapDispatchToProps = dispatch => {
    return {
        send_message: message => {
            dispatch(send_message(message));
        },
    }
};


const UnconnectedTable = (props) => {

    const { users, game, messages, table, freeloader } = props;
    const [height, setHeight] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current !== null) {
            setHeight(ref.current.clientHeight)
        } 
    });

    const sendTableText = (event) => {
        const str = event.target.value;
        if(event.key === 'Enter' && str !== '') {
            props.send_message({dsgTextTableEvent: {text: str, table: table.table, time: 0}});
            event.target.value = "";
        }
    };
    const sendMove = (move) => {
        props.send_message({dsgMoveTableEvent: {move: move, moves: [move], player: table.me, table: table.table, time: 0}});
    };
    const bootPlayer = (player) => {
        props.send_message({dsgBootTableEvent: {toBoot: player, player: table.me, table: table.table, time: 0}});
    };
    const invitePlayer = (player, message) => {
        props.send_message({dsgBootTableEvent: {toInvite: player, inviteText: message, player: table.me, table: table.table, time: 0}});
    };
    
    let table_users = {};
    table.players.forEach(player => {
        if (users[player]) {
            table_users[player] = users[player];
        }
    });
    
    return (
        <div style={{height: '100vh', width: '90%', margin: 'auto'}}>

            <Grid container direction={'column'} alignItems={'stretch'} wrap={'nowrap'} style={{height: '100%'}}>
                {freeloader &&
                <Grid item>
                    {/*<AdSense.Google*/}
                        {/*client='ca-pub-3326997956703582'*/}
                        {/*slot='9145001041'*/}
                        {/*style={{ display: 'block' }}*/}
                        {/*layout='in-article'*/}
                        {/*format='fluid'*/}
                    {/*/>*/}
                    <AdSense.Google
                        client='ca-pub-3326997956703582'
                        slot='6777680396'
                        style={{ display:'inline-block',width:'970px',height:'90px' }}
                    />
                    {/*<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>*/}
                    {/*<ins className="adsbygoogle"*/}
                    {/*style={{display:'block'}}*/}
                    {/*data-ad-client="ca-pub-3326997956703582"*/}
                    {/*data-ad-slot="9145001041"*/}
                    {/*data-ad-format="auto"*/}
                    {/*data-full-width-responsive="true"></ins>*/}
                    {/*<script>*/}
                    {/*(adsbygoogle = window.adsbygoogle || []).push({});*/}
                    {/*</script>*/}
                </Grid>
                }
                <Grid item style={{width:'100%', flex: '1', minHeight: '0px'}}>
        <div style={{width: '100%', height: '100%'}}>
            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{width: '100%', height: '100%'}}>
                <Grid item style={{height:'100%'}}>
                    <div ref={ref} style={{height: '100%', width: height}}>
                        <Board clickHandler={sendMove}/>
                    </div>
                </Grid>
                <Grid item style={{height:'100%', width: 640}}>
                    <Grid container direction={'column'} alignItems={'stretch'}  wrap={'nowrap'}
                          style={{width: '100%', height: '100%'}}>
                        <Grid item style={{maxWidth: '100%', flex: '1 1 auto', minHeight: '0px', borderWidth: '1px', borderStyle: 'solid'}}>
                            <div style={{width: '100%', height: '100%', backgroundColor: '#fffff'}}>
                                <div>
                                    <GameInfoPanel/>
                                </div>
                            </div>
                        </Grid>
                        <Grid item style={{height: '40%', borderWidth: '1px', borderStyle: 'solid'}}>
                            <ChatComponent messages={messages} game={table.game} users={table_users} sendText={sendTableText}/>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <UndoModal/>
            <CancelModal/>
            <DPenteChoiceModal/>
            <SettingsModal/>
            <EvaluateGoModal/>
            <WaitPlayerReturnModal/>
            <ResignCancelLostPlayerModal/>
        </div>
                </Grid>
            </Grid>
        </div>
    );
};

UnconnectedTable.propTypes = {
    users: PropTypes.objectOf(
        PropTypes.instanceOf(User).isRequired
    ).isRequired,
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            message: PropTypes.string.isRequired,
            player: PropTypes.instanceOf(User).isRequired
        }).isRequired
    ).isRequired,
    table: PropTypes.instanceOf(Table).isRequired,
    game: PropTypes.instanceOf(Game).isRequired
    // game: PropTypes.instanceOf(Game)
};


const TableView = connect(mapStateToProps, mapDispatchToProps)(UnconnectedTable);

export default TableView;