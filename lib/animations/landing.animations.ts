import { gsap, ScrollTrigger, DURATION, EASE } from './gsap';

export function initLandingAnimations(container: HTMLDivElement) {
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReducedMotion) return () => {};

  const ctx = gsap.context(() => {
    // 1. Hero Animations
    const heroTl = gsap.timeline();
    heroTl.fromTo('.hero-badge', 
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: DURATION.base, ease: EASE.smooth }
    )
    .fromTo('.hero-heading',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: DURATION.base, ease: EASE.smooth },
      "-=0.2"
    )
    .fromTo('.hero-sub',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: DURATION.base, ease: EASE.smooth },
      "-=0.2"
    )
    .fromTo('.hero-cta',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: DURATION.base, ease: EASE.smooth, stagger: 0.1 },
      "-=0.2"
    );

    gsap.fromTo('.hero-image',
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: DURATION.slow, ease: EASE.smooth, delay: 0.3 }
    );

    gsap.fromTo('.hero-float-card',
      { y: 20, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: DURATION.base, 
        ease: EASE.bounce,
        stagger: 0.2,
        delay: 0.6,
        onComplete: () => {
          gsap.to('.hero-float-card', {
            y: -10,
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            stagger: 0.3
          });
        }
      }
    );

    // 2. Navbar Background on Scroll
    ScrollTrigger.create({
      start: 'top -60',
      end: 99999,
      toggleClass: { className: 'bg-background/80', targets: '.navbar-container' },
      onEnter: () => gsap.to('.navbar-container', { backdropFilter: 'blur(8px)', duration: 0.2 }),
      onLeaveBack: () => gsap.to('.navbar-container', { backdropFilter: 'blur(0px)', duration: 0.2 }),
    });

    // 3. Stats CountUp
    const statsElements = document.querySelectorAll('.stat-number');
    if (statsElements.length > 0) {
      ScrollTrigger.create({
        trigger: '.stats-section',
        start: 'top 80%',
        once: true,
        onEnter: () => {
          statsElements.forEach(el => {
            const target = parseInt(el.getAttribute('data-target') || '0', 10);
            gsap.fromTo(el, { innerHTML: 0 }, {
              innerHTML: target,
              duration: 2,
              ease: "power2.out",
              snap: { innerHTML: 1 },
              onUpdate: function() {
                el.innerHTML = Math.ceil(Number(this.targets()[0].innerHTML)).toLocaleString('en-US');
              }
            });
          });
        }
      });
    }

    // 4. How It Works Steps
    gsap.fromTo('.step-card',
      { y: 30, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.step-card',
          start: 'top 80%',
        },
        y: 0,
        opacity: 1,
        duration: DURATION.base,
        ease: EASE.smooth,
        stagger: 0.2,
        clearProps: 'all'
      }
    );

    const connectorPath = document.querySelector('.step-connector path') as SVGPathElement;
    if (connectorPath) {
      const length = connectorPath.getTotalLength();
      gsap.set(connectorPath, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(connectorPath, {
        scrollTrigger: {
          trigger: '.step-connector',
          start: 'top 80%',
        },
        strokeDashoffset: 0,
        duration: 1.5,
        ease: "power2.inOut"
      });
    }

    // 5. Featured Doctors
    gsap.fromTo('.doctor-card',
      { y: 30, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.doctor-card',
          start: 'top 85%',
        },
        y: 0,
        opacity: 1,
        duration: DURATION.base,
        ease: EASE.smooth,
        stagger: 0.1,
        clearProps: 'all'
      }
    );

    // 6. Testimonials (Alternating Slide-in)
    gsap.utils.toArray<HTMLElement>('.testimonial-card').forEach((card, i) => {
      const isOdd = i % 2 !== 0;
      gsap.fromTo(card,
        { x: isOdd ? -50 : 50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
          },
          x: 0,
          opacity: 1,
          duration: DURATION.base,
          ease: EASE.smooth,
          clearProps: 'all'
        }
      );
    });

    // 7. CTA Banner
    gsap.fromTo('.cta-section',
      { scale: 0.95, opacity: 0 },
      {
        scrollTrigger: {
          trigger: '.cta-section',
          start: 'top 85%',
        },
        scale: 1,
        opacity: 1,
        duration: DURATION.slow,
        ease: EASE.smooth,
        clearProps: 'all'
      }
    );

  }, container);

  return () => ctx.revert();
}
