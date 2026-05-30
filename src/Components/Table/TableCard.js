import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import Table from '../../Classes/TableClass';
import User from '../../Classes/UserClass';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import SimpleStone from '../Board/SimpleStone';
import HttpsIcon from '@mui/icons-material/Https';
import {withStyles} from '@mui/styles';

const COUNTDOWN_SECONDS = 6;


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
   const {classes, table, users, countdown} = props;
   const seated = table.seats[1] !== "" || table.seats[2] !== "";
   const game = table.game;

   const [remaining, setRemaining] = useState(0);
   const intervalRef = useRef(null);

   useEffect(() => () => clearInterval(intervalRef.current), []);

   const counting = remaining > 0;

   const handleClick = () => {
      if (counting) return;
      props.joinRoom(table.table);
      if (!countdown) return;
      const start = Date.now();
      setRemaining(COUNTDOWN_SECONDS);
      intervalRef.current = setInterval(() => {
         const left = COUNTDOWN_SECONDS - (Date.now() - start) / 1000;
         if (left <= 0) {
            clearInterval(intervalRef.current);
            setRemaining(0);
         } else {
            setRemaining(left);
         }
      }, 100);
   };

   return (
      <Card className={classes.card}
            style={{backgroundColor: table.table_color(), position: 'relative', cursor: counting ? 'default' : 'pointer'}}
            onClick={handleClick}>
         {counting &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.35)',
               zIndex: 1
            }}>
               <Box sx={{position: 'relative', display: 'inline-flex'}}>
                  <CircularProgress variant="determinate"
                                    value={(remaining / COUNTDOWN_SECONDS) * 100}
                                    size={56}/>
                  <Box sx={{
                     position: 'absolute',
                     inset: 0,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                  }}>
                     <Typography variant="h6" component="div" sx={{color: '#fff'}}>
                        {Math.ceil(remaining)}
                     </Typography>
                  </Box>
               </Box>
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
   countdown: PropTypes.bool
};

export default withStyles(styles)(TableCard);