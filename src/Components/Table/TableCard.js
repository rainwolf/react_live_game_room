import React from 'react';
import PropTypes from 'prop-types';
import Table from '../../Classes/TableClass';
import User from '../../Classes/UserClass';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import SimpleStone from '../Board/SimpleStone';
import HttpsIcon from '@mui/icons-material/Https';
import {withStyles} from '@mui/styles';


const styles = theme => ({
   card: {
      minWidth: 275,
      backgroundColor: '#FDDEA3'
   },
   bullet: {
      display: 'inline-block',
      margin: '0 2px',
      transform: 'scale(0.8)',
   },
   title: {
      fontSize: 14,
   },
   pos: {
      marginBottom: 12,
   },
   icon: {
      fontSize: 26,
   }
});

const TableCard = (props) => {
   const {classes, table, users, requested, busy} = props;
   const seated = table.seats[1] !== "" || table.seats[2] !== "";
   const game = table.game;

   // Arena lobby (spec C3): `busy` while a request or withdraw for this table awaits the
   // server's next dsgArenaMyRequestsEvent (taps ignored, spinner); `requested` while the
   // latest snapshot lists the table. Both come from the server; there are no timers.
   const handleClick = () => {
      if (busy) return;
      props.joinRoom(table.table);
   };

   return (
      <Card className={classes.card}
            style={{backgroundColor: table.table_color(), position: 'relative', cursor: busy ? 'default' : 'pointer'}}
            onClick={handleClick}>
         {busy &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.35)',
               zIndex: 1
            }}>
               <CircularProgress size={40}/>
            </Box>
         }
         <CardContent>
            {/*<Typography className={classes.title} color="textSecondary" gutterBottom>*/}
            {/*Word of the Day*/}
            {/*</Typography>*/}
            <Typography variant="h5" component="h2">
               {table.private() ? (
                  <span><HttpsIcon className={classes.icon}/> {table.game_name()}</span>) : table.game_name()}
            </Typography>
            {requested &&
               <Chip label="Requested" color="primary" size="small" style={{marginTop: 4}}/>
            }
            {/*<Typography className={classes.pos} color="textSecondary">*/}
            {/*adjective*/}
            {/*</Typography>*/}
            {seated &&
               <Typography component="div">
                  <div style={{display: 'grid', gridTemplateColumns: '45% 10% 45%'}}>
                     <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        {(table.seats[1] !== "" && users[table.seats[1]]) && <>
                           <span>{users[table.seats[1]].userhtml} <SimpleStone size={15}
                                                                               id={table.player_color(1)}/></span>
                           <span>{users[table.seats[1]].rating(game)}</span>
                        </>}
                     </div>
                     <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>-</div>
                     <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        {(table.seats[2] !== "" && users[table.seats[2]]) && <>
                           <span>{users[table.seats[2]].userhtml} <SimpleStone size={15}
                                                                               id={table.player_color(2)}/></span>
                           <span>{users[table.seats[2]].rating(game)}</span>
                        </>}
                     </div>
                  </div>
               </Typography>
            }
            <Typography component="p">
               rated: {table.rated ? 'yes' : 'no'},
               timed: {table.timed ? (table.initialMinutes + '/' + table.incrementalSeconds) : 'no'}
            </Typography>

            {table.watching().length > 0 &&
               <Typography component="p">
                  watching: {table.watching().map((player, i) => users[player] ? (
                  <span key={i}>{users[player].userhtml}, </span>) : "")}
               </Typography>
            }
         </CardContent>
      </Card>
   );
};

TableCard.propTypes = {
   classes: PropTypes.object.isRequired,
   table: PropTypes.instanceOf(Table).isRequired,
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   requested: PropTypes.bool,
   busy: PropTypes.bool
};

export default withStyles(styles)(TableCard);