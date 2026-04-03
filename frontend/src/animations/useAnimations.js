/**
 * useAnimations.js
 * ─────────────────
 * Lightweight animation primitives that work WITHOUT Framer Motion.
 * Uses IntersectionObserver + CSS classes — zero extra bundle weight.
 *
 * Usage:
 *   import { useCountUp, useInView, useStagger } from '../../animations/useAnimations';
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Count-up hook ────────────────────────────────────────────────────────────
export function useCountUp(target, duration = 1200, start = 0) {
  const [value, setValue] = useState(start);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0 || target == null) { setValue(0); return; }
    const startTime = performance.now();
    const diff = target - start;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  return value;
}

// ─── IntersectionObserver hook ────────────────────────────────────────────────
export function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.12, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

// ─── Stagger children (returns delay class per index) ─────────────────────────
export function staggerDelay(index, base = 80) {
  return { style: { animationDelay: `${index * base}ms`, animationFillMode: 'both' } };
}

// ─── Page entry animation wrapper class ───────────────────────────────────────
export const pageEnter = 'animate-page-enter';
export const fadeUp    = 'animate-fade-up';
export const fadeIn    = 'animate-fade-in-slow';
export const scaleIn   = 'animate-scale-in';
export const slideUp   = 'animate-slide-up-soft';
