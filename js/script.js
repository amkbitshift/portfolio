document.addEventListener('DOMContentLoaded', () => {
    // This part ensures GSAP and Flip are available.
    // If you get "gsap is not defined" errors, the script loading order or file existence is the problem.
    if (typeof gsap === 'undefined' || typeof Flip === 'undefined' || typeof Swup === 'undefined') {
        console.error("GSAP, Flip, or Swup is not loaded! Check script tags and file paths.");
        // Stop script execution here if dependencies are missing to prevent further errors.
        return; 
    }
    gsap.registerPlugin(Flip);

    // Initialize Swup
    const swup = new Swup({
        containers: ['#swup'], // The main content container that will be replaced
        animateHistoryBrowse: true, // For smooth back/forward button transitions
        // Swup will automatically intercept links with the same origin.
        linkSelector: 'a.swup-link', // Only links with this class will trigger Swup
    });

    const pageTransitionCurtain = document.querySelector('.page-transition-curtain');
    const firstPage = document.getElementById('first-page');
    const secondPage = document.getElementById('second-page');
    const secondPageGridContainer = document.querySelector('.second-page-grid-container');

    // --- Internal Page Slide Logic (First Page <-> Second Page on index.html) ---
    // This part is handled by custom JS and CSS, not Swup.
    const handleInternalPageSlide = (pageToShowId) => {
        const slideDuration = 1;

        if (pageToShowId === 'first-page') {
            firstPage.classList.remove('hidden');
            secondPage.classList.remove('active');
            if (secondPageGridContainer) {
                secondPageGridContainer.classList.remove('active'); // Deactivates grid animation on return
            }
            firstPage.style.zIndex = 2;
            secondPage.style.zIndex = 1;
        } else if (pageToShowId === 'second-page') {
            firstPage.classList.add('hidden');
            secondPage.classList.add('active');
            // Re-trigger staggered animation when second page becomes active
            setTimeout(() => {
                if (secondPageGridContainer) {
                    secondPageGridContainer.classList.add('active');
                }
            }, slideDuration * 1000); // After the main slide transition
        }
    };

    // Initial automatic transition on index.html load
    const initialHomepageAnimation = () => {
        const totalFirstPageAnimationDuration = 4100; // Based on CSS animations

        setTimeout(() => {
            handleInternalPageSlide('second-page');
        }, totalFirstPageAnimationDuration + 500); // Add a small buffer
    };

    // Run initial animation only on root index.html load
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        if (!window.location.hash || window.location.hash === '#first-page') {
            initialHomepageAnimation();
        } else if (window.location.hash === '#second-page') {
            handleInternalPageSlide('second-page'); // Instant switch if direct hash
        }
    }


    // --- Swup Hooks for "Curtain" Page Transition ---

    // This runs BEFORE Swup fetches new content
    swup.on('animationOutStart', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

        // Fade out current page's main content elements
        const currentContentArea = document.querySelector('#swup main.content-area');
        const currentSecondPageGridContainer = document.querySelector('#second-page .second-page-grid-container');

        if (currentSecondPageGridContainer && document.getElementById('second-page').classList.contains('active')) {
            // If on the second page of index.html, animate its grid items out
            tl.to(currentSecondPageGridContainer.children, {
                opacity: 0,
                y: 50, // Slide down slightly
                duration: 0.4,
                stagger: 0.05,
                overwrite: 'auto'
            }, 0); // Start immediately
        } else if (currentContentArea) {
            // For other sub-pages (contact, projects, about), fade out main content
            tl.to(currentContentArea, { opacity: 0, y: 50, duration: 0.4 }, 0);
        }

        // Animate the curtain to slide up and cover the screen
        tl.fromTo(pageTransitionCurtain,
            { y: '100%', visibility: 'visible' }, // Start off-screen below, make visible
            { y: '0%', // Slide up to cover
              duration: 0.7, // Curtain animation duration
              ease: 'power2.in',
              onComplete: () => {
                  // Once curtain covers, it's safe for Swup to replace content.
                  // Swup automatically waits for this hook's promise to resolve.
              }
            }, 0.2); // Start curtain animation slightly after content starts fading

        return tl.then(); // Return the timeline promise for Swup to wait
    });

    // This hook runs AFTER new content is loaded but BEFORE `animationInStart`
    swup.on('contentReplaced', () => {
        // Here, we reset the incoming content's opacity and position so GSAP can animate it in.
        // This targets all potential content areas within the #swup container on the new page.
        gsap.set(document.querySelector('#swup main.content-area, #swup .page'), { opacity: 0, y: 20 });
        gsap.set(document.querySelector('#swup header.second-page-nav'), { opacity: 0, y: -20 });

        // Also reset any grid item specific animations on the incoming second page
        if (document.getElementById('second-page')) {
            const incomingSecondPageGridContainer = document.querySelector('#second-page .second-page-grid-container');
            if (incomingSecondPageGridContainer) {
                gsap.set(incomingSecondPageGridContainer.children, { opacity: 0, y: 20 });
            }
        }
    });

    // Animation IN: Curtain slides down to reveal the new page
    swup.on('animationInStart', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        // Animate the curtain to slide down and disappear
        tl.to(pageTransitionCurtain, {
            y: '-100%', // Slide fully off-screen upwards
            duration: 0.7,
            ease: 'power2.out',
            onComplete: () => {
                // Reset curtain for next use
                gsap.set(pageTransitionCurtain, { y: '100%', visibility: 'hidden' });
            }
        }, 0); // Start curtain animation immediately

        // Animate in the new page content (nav and main content area)
        const newPageNav = document.querySelector('#swup header.second-page-nav');
        const newPageMainContent = document.querySelector('#swup main.content-area');

        if (newPageNav) {
            tl.to(newPageNav, { opacity: 1, y: 0, duration: 0.5 }, 0.2); // Animate nav in
        }
        if (newPageMainContent) {
            tl.to(newPageMainContent, { opacity: 1, y: 0, duration: 0.5 }, 0.3); // Animate main content in
        }

        // Re-trigger staggered grid animations if the incoming page is the second page of index.html
        if (document.getElementById('second-page')) {
            const incomingSecondPageGridContainer = document.querySelector('#second-page .second-page-grid-container');
            if (incomingSecondPageGridContainer) {
                tl.to(incomingSecondPageGridContainer.children, {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    stagger: 0.07,
                    ease: 'power2.out'
                }, 0.5); // Stagger grid items after main content
            }
        }

        return tl.then(); // Return the timeline promise for Swup to wait
    });


    // --- Event Listeners (ensure compatibility with Swup) ---

    // Event listener for the "EXPLORE MORE" button on the first page (manual slide)
    const scrollToSecondPageButton = document.querySelector('.scroll-to-second-page');
    if (scrollToSecondPageButton) {
        scrollToSecondPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleInternalPageSlide('second-page');
        });
    }

    // Handle navigation clicks for HOME link (internal slide on index.html)
    // Swup will handle all other .swup-link clicks automatically
    document.querySelectorAll('.second-page-nav nav a').forEach(anchor => {
        // Only target the HOME link when on index.html
        if ((anchor.getAttribute('href') === 'index.html' || anchor.getAttribute('href') === '#first-page') &&
            (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetHref = this.getAttribute('href');
                window.history.pushState(null, '', 'index.html#first-page'); // Explicitly set hash
                handleInternalPageSlide('first-page');
            });
        }
    });

    // This re-initialization function is critical for Swup as it replaces content.
    // It makes sure any JS that needs to run on elements on the new page gets run.
    function initPageScripts() {
        // Re-bind the 'Explore More' button if it's on the page
        const currentScrollToSecondPageButton = document.querySelector('.scroll-to-second-page');
        if (currentScrollToSecondPageButton) {
            // Remove previous listener to prevent duplicates
            currentScrollToSecondPageButton.removeEventListener('click', (e) => { e.preventDefault(); handleInternalPageSlide('second-page'); });
            currentScrollToSecondPageButton.addEventListener('click', (e) => { e.preventDefault(); handleInternalPageSlide('second-page'); });
        }

        // Ensure the initial visibility/active state for index.html's pages after content replacement
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
            if (!window.location.hash || window.location.hash === '#first-page') {
                gsap.set(firstPage, { opacity: 1, y: 0, zIndex: 2 });
                gsap.set(secondPage, { opacity: 0, y: '100vh', zIndex: 1 });
            } else if (window.location.hash === '#second-page') {
                gsap.set(firstPage, { opacity: 0, y: '-100vh', zIndex: 1 });
                gsap.set(secondPage, { opacity: 1, y: 0, zIndex: 2 });
                if (secondPageGridContainer) {
                    secondPageGridContainer.classList.add('active'); // Re-trigger grid animations
                }
            }
        }
    }

    // Call initPageScripts after initial DOMContentLoaded AND after every Swup content replacement
    initPageScripts();
    swup.on('contentReplaced', initPageScripts);

    // Handle browser's back/forward buttons for internal index.html sections
    window.addEventListener('popstate', () => {
        if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
            if (window.location.hash === '#second-page') {
                handleInternalPageSlide('second-page');
            } else {
                handleInternalPageSlide('first-page');
            }
        }
    });
});