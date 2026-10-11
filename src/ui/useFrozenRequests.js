// Thin React wrapper over the arena request freeze controller (spec C2). Takes the owner's
// snapshot record from Redux ({table, requests, answersAction} or undefined) and returns
// the rows to render plus whether the list is frozen. Pushes once per new record object,
// so unrelated re-renders never freeze the list.
//
// No unlocked frame between a new record and its freeze:
//   - a render whose record has not been pushed yet reports `frozen` (the reducer clears
//     the owner's in-flight marker in the same step that stores the answering snapshot,
//     so the component's other lock is already gone on that render);
//   - layout effects, not passive ones: a websocket-driven render runs at default priority,
//     so a passive effect may run only after the browser paints. State set in a layout
//     effect re-renders synchronously before paint. Both effects must be layout effects so
//     the controller exists before the first push.

import { useLayoutEffect, useRef, useState } from 'react';
import { createFreezeController, initialFreezeState, PHASE } from './arenaRequestFreeze';

const NO_REQUESTS = [];

export function useFrozenRequests(record) {
  const [state, setState] = useState(initialFreezeState);
  const [pushed, setPushed] = useState(undefined);
  const controllerRef = useRef(null);

  useLayoutEffect(() => {
    const controller = createFreezeController(setState);
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useLayoutEffect(() => {
    controllerRef.current.push(
      record ? record.requests : NO_REQUESTS,
      !!(record && record.answersAction)
    );
    setPushed(record);
  }, [record]);

  const stale = record !== pushed;
  return { rows: state.shown, frozen: stale || state.phase === PHASE.FROZEN };
}
