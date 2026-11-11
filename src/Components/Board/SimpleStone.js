import React from 'react';

function SimpleStone(props) {
   return (
      <svg key={props.id + '-' + props.opacity} height={props.size} width={props.size}>
         <radialGradient id={props.id} cx="40%" cy="40%" r="50%">
            <stop offset="0%" stopColor='var(--color1)'/>
            <stop offset="100%" stopColor='var(--color2)'/>
         </radialGradient>
         <circle cx={props.size / 2} cy={props.size / 2}
                 r={props.outline ? props.size / 2 - props.size / 20 : props.size / 2}
                 fill={"url(#" + props.id + ")"} fillOpacity={props.opacity}
                 stroke={props.outline || undefined} strokeWidth={props.outline ? props.size / 10 : undefined}
                 pointerEvents={'none'}/>
      </svg>
   );
}

export default SimpleStone;