import { useEffect, useRef, useState } from 'preact/hooks';

export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
};

interface UseAnimatedCounterOptions {
  target: number;
  durationMs?: number;
  instant?: boolean;
  fastForwardToken?: number;
}

export const useAnimatedCounter = ({
  target,
  durationMs = 280,
  instant = false,
  fastForwardToken
}: UseAnimatedCounterOptions): number => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (prefersReducedMotion || instant) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const startValue = valueRef.current;
    if (startValue === target) {
      return;
    }

    const delta = target - startValue;
    const cappedDuration = Math.max(120, Math.min(2000, durationMs));

    let rafId = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (startTime === 0) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / cappedDuration);
      const eased = 1 - (1 - progress) * (1 - progress) * (1 - progress);
      const nextValue = Math.round(startValue + delta * eased);

      if (nextValue !== valueRef.current) {
        valueRef.current = nextValue;
        setValue(nextValue);
      }

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [durationMs, instant, prefersReducedMotion, target]);

  useEffect(() => {
    if (fastForwardToken === undefined) {
      return;
    }

    valueRef.current = target;
    setValue(target);
  }, [fastForwardToken, target]);

  return value;
};
