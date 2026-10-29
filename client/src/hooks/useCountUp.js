import { useEffect, useRef, useState } from 'react';

// Animates a number from its previous value to `target` (the original
// animateValue() function, as a React hook). Only runs while `active` is true.
export function useCountUp(target, duration = 1500, active = true) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    const from = fromRef.current;
    let frame;
    let startTime;
    const step = (now) => {
      if (startTime === undefined) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.floor(from + (target - from) * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = target;
    };
  }, [target, duration, active]);

  return value;
}
