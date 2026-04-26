import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export const DURATION = { 
  fast: 0.25, 
  base: 0.45, 
  slow: 0.8 
};

export const EASE = { 
  smooth: 'power2.out', 
  bounce: 'back.out(1.4)', 
  snappy: 'power3.out' 
};
