import React from 'react';
import {describe, test, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Provider} from 'react-redux';
import MovesListPanel from '../MovesListPanel';
import {Game} from '../../../Classes/GameClass';

const PILL = '<span style="background:#F4C7C7;color:#8E1B1B;border-radius:4px;padding:0 4px">N13</span>';

const makeStore = (game) => ({
   getState: () => ({game}),
   subscribe: () => () => {},
   dispatch: () => {},
});

// Minimal tombstone game: first turn J9 with dead stone N13, second turn K10 with no dead stone.
const tombstoneGame = (until) => Object.assign(Object.create(Game.prototype), {
   until,
   isTombstoneGame: () => true,
   isConnect6: () => false,
   moves_strings: () => ['J9 - N13', 'K10'],
   tombstone_turn_cells: () => [
      {label: 'J9 - N13', own: 'J9', dead: 'N13', until: 1, player: 1},
      {label: 'K10', own: 'K10', dead: '', until: 2, player: 2},
   ],
});

const render = (game) => renderToStaticMarkup(
   <Provider store={makeStore(game)}><MovesListPanel/></Provider>
);

describe('MovesListPanel tombstone dead-coordinate pill', () => {
   test('dead coordinate is pill-styled in the selected (error-red) row', () => {
      const html = render(tombstoneGame(1));
      expect(html.split(PILL).length - 1).toBe(1);
   });

   test('dead coordinate is pill-styled in a normal row too', () => {
      const html = render(tombstoneGame(2));
      expect(html.split(PILL).length - 1).toBe(1);
   });

   test('cells without a dead coordinate get no pill', () => {
      const html = render(tombstoneGame(2));
      expect(html).toContain('K10');
      expect(html.split('background:#F4C7C7').length - 1).toBe(1);
   });
});
