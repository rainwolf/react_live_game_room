export function game_name(g) {
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
}