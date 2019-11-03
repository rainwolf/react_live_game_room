import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { send_message } from "../redux_actions/actionTypes";
import PropTypes from 'prop-types';
import User from "../Classes/UserClass";
import Table from '../Classes/TableClass';
import Board from '../Components/Board/Board';
import Grid from '@material-ui/core/Grid';
import ChatComponent from '../Components/Chat/ChatComponent';
import UndoModal from '../Components/Table/UndoModal';
import CancelModal from '../Components/Table/CancelModal';
import DPenteChoiceModal from '../Components/Table/DPenteChoiceModal';
import SettingsModal from '../Components/Table/SettingsModal';
import GameInfoPanel from '../Components/Table/GameInfoPanel';
import EvaluateGoModal from '../Components/Table/EvaluateGoModal';
import WaitPlayerReturnModal from "../Components/Table/WaitPlayerReturnModal";
import ResignCancelLostPlayerModal from "../Components/Table/ResignCancelLostPlayerModal";
import AdSense from 'react-adsense';
import Snack from '../Components/Table/Snack';
import BootModal from '../Components/Table/BootModal';
import InvitationResponseModal from '../Components/Room/InvitationResponseModal';

const mapStateToProps = state => {
    return {
        users: state.users,
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

    const { messages, table, freeloader } = props;
    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);
    const ref = useRef(null);

    // eslint-disable-next-line
    useEffect(() => {
        if (ref.current !== null) {
            setHeight(ref.current.clientHeight - (freeloader?90:0));
            // console.log(ref.current.clientHeight, ref.current.clientWidth)
            setWidth(ref.current.clientWidth);
        } 
    });
    

    const sendTableText = (event) => {
        const str = event.target.value;
        if(event.key === 'Enter' && str !== '') {
            props.send_message({dsgTextTableEvent: {text: str, table: table.table, time: 0}});
            event.target.value = "";
        }
    };
    
    // let table_users = {};
    // table.players.forEach(player => {
    //     if (users[player]) {
    //         table_users[player] = users[player];
    //     }
    // });
    
    return (
        <div ref={ref} style={{height: '100%', width: '100%'}}>

            <Grid container direction={'column'} alignItems={'center'} wrap={'nowrap'} style={{height: '100%', width: '100%'}}>
                {freeloader &&
                <Grid item style={{ display:'inline-block',width:'970px',height:'90px' }}>
                    <AdSense.Google
                        client='ca-pub-3326997956703582'
                        slot='6777680396'
                        style={{ display:'inline-block',width:'970px',height:'90px' }}
                        format=''
                    />
                </Grid>
                }
                <Grid item style={{flex: '1', minHeight: '0px'}}>
        <div style={{height: '100%', width: Math.min(width, height + 600)}}>
            <Grid container direction={'row'} alignItems={'stretch'} wrap={'nowrap'} style={{height: '100%'}}>
                <Grid item style={{height:'100%'}}>
                    <div style={{height: '100%', width: height}}>
                        <Board />
                    </div>
                </Grid>
                <Grid item style={{height:'100%', width: Math.min(600, width - height)}}>
                    <Grid container direction={'column'} alignItems={'stretch'}  wrap={'nowrap'}
                          style={{height:'100%', width: '100%'}}>
                        <Grid item style={{height: '60%', borderWidth: '1px', borderStyle: 'solid'}}>
                            <div style={{width: '100%', height: '100%', backgroundColor: '#fffff'}}>
                                <GameInfoPanel/>
                            </div>
                        </Grid>
                        <Grid item style={{height: '40%', borderWidth: '1px', borderStyle: 'solid'}}>
                            <ChatComponent messages={messages} game={table.game} players={table.players} sendText={sendTableText}/>
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
            <Snack/>
            <BootModal/>
            <InvitationResponseModal/>
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
    // game: PropTypes.instanceOf(Game).isRequired
};


const TableView = connect(mapStateToProps, mapDispatchToProps)(UnconnectedTable);

export default TableView;