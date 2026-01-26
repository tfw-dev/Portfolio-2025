import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ANIMATION_CONFIG, isAnimationEnabled } from '../config/scrollAnimations';

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
export function useScrollAnimations(refs, options = {}) {
  const { enabled = true } = options;

  useLayoutEffect(() => {
    if (!enabled) return;

    const {
      page: pageRef,
      scaleProxy,
      motionProxy,
      cameraProxy,
      timelines,
    } = refs;

    // Safety check - don't run if refs aren't available
    if (!pageRef?.current) return;

    const context = gsap.context(() => {
      // Hero Timeline
      if (isAnimationEnabled('hero')) {
        const heroTL = gsap.timeline({
          defaults: { ease: 'in' },
          scrollTrigger: {
            trigger: pageRef.current,
            start: 'top top',
            scrub: 1,
            pin: false,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        if (timelines?.current) {
          timelines.current['hero'] = heroTL;
        }

        const config = ANIMATION_CONFIG.hero;

        heroTL.addLabel('start');

        // Blob animations
        if (scaleProxy?.current && motionProxy?.current) {
          heroTL.to(motionProxy.current, {
            stage: config.motion.scrollStage,
            duration: config.motion.transitionDuration,
          }, '<');

          heroTL.to(scaleProxy.current.center, {
            y: config.blob.centerOffset.start,
            duration: config.blob.shrinkDuration,
            ease: 'power2.out',
          });

          heroTL.to(scaleProxy.current, {
            size: config.blob.shrinkSize,
            duration: config.blob.shrinkDuration,
            ease: 'power2.out',
          }, '<');

          heroTL.to(scaleProxy.current, {
            size: config.blob.expandSize,
            duration: config.blob.expandDuration,
            ease: 'power2.out',
          }, '>');

          heroTL.to(motionProxy.current, {
            stage: config.motion.endStage,
            duration: config.motion.transitionDuration,
          }, '<');

          heroTL.to(scaleProxy.current.center, {
            y: config.blob.centerOffset.end,
            duration: config.blob.expandDuration,
            ease: 'power2.out',
          }, '>');
        }

        // Camera animations
        if (cameraProxy?.current?.position) {
          heroTL.to(cameraProxy.current.position, {
            z: config.camera.zoomToZ,
            duration: config.camera.duration,
            ease: 'power2.out',
          }, '<');

          heroTL.to(cameraProxy.current.position, {
            y: config.camera.panToY,
            duration: config.camera.duration,
            ease: 'power2.out',
          }, '<');
        }
      }

      // Services Timeline
      if (isAnimationEnabled('services')) {
        setupServicesTimeline(pageRef, scaleProxy, timelines);
      }

      // Portfolio Timeline
      if (isAnimationEnabled('portfolio')) {
        setupPortfolioTimeline(heroTL, pageRef);
      }
    }, pageRef);

    return () => context.revert();
  }, [refs, enabled]);
}

/**
 * Sets up the services carousel scroll timeline
 */
function setupServicesTimeline(pageRef, scaleProxy, timelines) {
  const servicesSection = document.getElementById('services');
  const serviceItems = servicesSection
    ? Array.from(servicesSection.querySelectorAll('.service-item'))
    : [];

  if (serviceItems.length === 0) return;

  const config = ANIMATION_CONFIG.services;
  const { pxPerSecond, fadeInDuration, fadeOutDuration, dwellTime } = config;

  // Initial state
  gsap.set(serviceItems, { autoAlpha: 0, yPercent: 10 });
  gsap.set(servicesSection, { display: 'block' });

  const servicesTL = gsap.timeline({ defaults: { ease: 'none' } });

  if (timelines?.current) {
    timelines.current['services'] = servicesTL;
  }

  // Fade in services section
  servicesTL.to(servicesSection, { autoAlpha: 1, duration: fadeInDuration });
  servicesTL.addLabel('start');

  // First item
  servicesTL
    .fromTo(
      serviceItems[0],
      { autoAlpha: 0, yPercent: 10 },
      { autoAlpha: 1, yPercent: 0, duration: fadeInDuration, ease: 'power2.out' }
    )
    .to({}, { duration: dwellTime });

  // Subsequent items
  for (let i = 0; i < serviceItems.length - 1; i++) {
    const curr = serviceItems[i];
    const next = serviceItems[i + 1];
    const serviceTitle = document.getElementById('serviceTitle');

    servicesTL
      .to(curr, { autoAlpha: 0, yPercent: -10, duration: fadeOutDuration, ease: 'power2.in' })
      .fromTo(
        next,
        { autoAlpha: 0, yPercent: 10 },
        { autoAlpha: 1, yPercent: 0, duration: fadeInDuration, ease: 'power2.out' }
      );

    // Scramble text effect (if Services data available)
    if (serviceTitle && window.Services) {
      servicesTL.to(
        serviceTitle,
        {
          duration: 3,
          scrambleText: {
            text: window.Services[i + 1]?.title || '',
            revealDelay: 1,
            speed: 0.9,
            newClass: 'myClass',
          },
        },
        '<'
      );
    }

    servicesTL.to({}, { duration: dwellTime });
  }

  // Create ScrollTrigger
  ScrollTrigger.create({
    animation: servicesTL,
    trigger: servicesSection,
    start: 'top top',
    end: () => '+=' + servicesTL.duration() * pxPerSecond,
    scrub: 1,
    pin: true,
    invalidateOnRefresh: true,
    anticipatePin: 1,
  });

  // Blob movement during services
  if (scaleProxy?.current) {
    gsap.to(scaleProxy.current, {
      size: 2.4,
      duration: 5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: servicesSection,
        start: 'top top',
        end: () => '+=' + servicesTL.duration() * pxPerSecond,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    const totalY = 0.01 * (serviceItems.length - 1);
    gsap.to(scaleProxy.current.center, {
      y: `+=${totalY}`,
      ease: 'none',
      scrollTrigger: {
        trigger: servicesSection,
        start: 'top+=100 top',
        end: () => '+=' + servicesTL.duration() * pxPerSecond,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  }
}

/**
 * Sets up portfolio card animations
 */
function setupPortfolioTimeline(heroTL, pageRef) {
  if (!heroTL) return;

  const config = ANIMATION_CONFIG.portfolio;
  const portfolioCards = document.querySelectorAll('#portfolio .card');

  if (portfolioCards.length === 0) return;

  heroTL.addLabel('portfolioStart', '>');
  heroTL.fromTo(
    portfolioCards,
    { autoAlpha: 0, y: 40 },
    {
      autoAlpha: 1,
      y: 0,
      stagger: config.stagger,
      duration: config.duration,
    },
    'portfolioStart'
  );
  heroTL.addLabel('portfolioEnd');
}
