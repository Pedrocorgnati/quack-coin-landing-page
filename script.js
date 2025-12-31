"use strict";
// QuackCoin Landing Page - TypeScript
class QuackCoinLandingPage {
    constructor() {
        this.countdownInterval = null;
        this.targetDate = new Date('2026-03-29T00:00:00');
        this.countdownElements = {
            days: document.getElementById('days'),
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds')
        };
        this.init();
    }
    init() {
        this.startCountdown();
        this.setupSmoothScroll();
        this.setupScrollAnimations();
        this.setupNavbarScroll();
        this.setupMobileMenu();
        this.setupWaitlistForm();
    }
    hasCountdown() {
        return Boolean(this.countdownElements.days &&
            this.countdownElements.hours &&
            this.countdownElements.minutes &&
            this.countdownElements.seconds);
    }
    startCountdown() {
        if (!this.hasCountdown()) {
            return;
        }
        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = this.targetDate.getTime() - now;
            if (distance < 0) {
                this.stopCountdown();
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            this.countdownElements.days.textContent = this.padZero(days);
            this.countdownElements.hours.textContent = this.padZero(hours);
            this.countdownElements.minutes.textContent = this.padZero(minutes);
            this.countdownElements.seconds.textContent = this.padZero(seconds);
        };
        updateCountdown();
        this.countdownInterval = window.setInterval(updateCountdown, 1000);
    }
    stopCountdown() {
        if (this.countdownInterval !== null) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (!this.hasCountdown()) {
            return;
        }
        this.countdownElements.days.textContent = '00';
        this.countdownElements.hours.textContent = '00';
        this.countdownElements.minutes.textContent = '00';
        this.countdownElements.seconds.textContent = '00';
    }
    padZero(num) {
        return num.toString().padStart(2, '0');
    }
    setupSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.getAttribute('href');
                if (target && target !== '#') {
                    const element = document.querySelector(target);
                    if (element) {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        const animatedElements = document.querySelectorAll('.feature-card, .use-case-card, .roadmap-item, .countdown-item');
        animatedElements.forEach(el => {
            el.classList.add('fade-element');
            observer.observe(el);
        });
    }
    setupNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll <= 0) {
                navbar.style.transform = 'translateY(0)';
                return;
            }
            if (currentScroll > lastScroll && currentScroll > 100) {
                // Scrolling down
                navbar.style.transform = 'translateY(-100%)';
            }
            else {
                // Scrolling up
                navbar.style.transform = 'translateY(0)';
            }
            lastScroll = currentScroll;
        });
    }
    setupMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-menu a');
        if (!hamburger || !navMenu)
            return;
        // Toggle menu on hamburger click
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!hamburger.contains(target) && !navMenu.contains(target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
    setupWaitlistForm() {
        const form = document.getElementById('waitlistForm');
        const status = document.getElementById('waitlistStatus');
        const submitButton = form === null || form === void 0 ? void 0 : form.querySelector('button[type="submit"]');
        if (!form || !status)
            return;
        this.applyAttribution(form);
        form.addEventListener('submit', async (event) => {
            var _a, _b, _c;
            event.preventDefault();
            status.classList.remove('error');
            const name = (_a = document.getElementById('waitlistName')) === null || _a === void 0 ? void 0 : _a.value.trim();
            const email = (_b = document.getElementById('waitlistEmail')) === null || _b === void 0 ? void 0 : _b.value.trim();
            const consent = (_c = document.getElementById('waitlistConsent')) === null || _c === void 0 ? void 0 : _c.checked;
            if (!name || !email || !consent) {
                status.textContent = 'Please fill name, email, and accept the consent.';
                status.classList.add('error');
                return;
            }
            const endpoint = (form.dataset.endpoint || '').trim();
            if (!endpoint) {
                status.textContent = 'Submission endpoint is not configured.';
                status.classList.add('error');
                return;
            }
            const payload = this.buildWaitlistPayload(form);
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
            }
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error('Request failed');
                }
                status.textContent = 'You are in! We will prioritize your invite.';
                form.reset();
                this.applyAttribution(form);
            }
            catch (error) {
                status.textContent = 'We could not submit your request. Try again soon.';
                status.classList.add('error');
            }
            finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Get my invite';
                }
            }
        });
    }
    applyAttribution(form) {
        const attribution = this.getAttribution();
        const mapping = {
            utmSource: attribution.utm_source,
            utmMedium: attribution.utm_medium,
            utmCampaign: attribution.utm_campaign,
            utmContent: attribution.utm_content,
            utmTerm: attribution.utm_term,
            referrerUrl: attribution.referrer,
            landingUrl: attribution.landing_url
        };
        Object.entries(mapping).forEach(([id, value]) => {
            const input = form.querySelector(`#${id}`);
            if (input) {
                input.value = value !== null && value !== void 0 ? value : '';
            }
        });
    }
    getAttribution() {
        const storageKey = 'quack_waitlist_utm';
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
        const params = new URLSearchParams(window.location.search);
        const urlUtm = {};
        let hasUrlUtm = false;
        utmKeys.forEach(key => {
            const value = params.get(key);
            if (value) {
                urlUtm[key] = value;
                hasUrlUtm = true;
            }
        });
        let storedUtm = {};
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (raw) {
                storedUtm = JSON.parse(raw);
            }
            if (hasUrlUtm) {
                window.localStorage.setItem(storageKey, JSON.stringify(urlUtm));
            }
        }
        catch (error) {
            storedUtm = {};
        }
        const attribution = hasUrlUtm ? urlUtm : storedUtm;
        return Object.assign(Object.assign({}, attribution), { referrer: document.referrer || undefined, landing_url: window.location.href });
    }
    buildWaitlistPayload(form) {
        const fields = this.collectHubSpotFields(form);
        const consentText = this.getConsentText();
        return {
            fields,
            context: {
                hutk: this.getHubSpotUtk(),
                pageUri: window.location.href,
                pageName: document.title
            },
            legalConsentOptions: {
                consent: {
                    consentToProcess: true,
                    text: consentText
                }
            }
        };
    }
    collectHubSpotFields(form) {
        const elements = Array.from(form.querySelectorAll('[data-hubspot-name]'));
        return elements.reduce((fields, element) => {
            var _a;
            const hubspotName = (_a = element.dataset.hubspotName) === null || _a === void 0 ? void 0 : _a.trim();
            if (!hubspotName) {
                return fields;
            }
            if (element.type === 'checkbox') {
                if (element.checked) {
                    fields.push({ name: hubspotName, value: 'true' });
                }
                return fields;
            }
            const value = element.value.trim();
            if (!value) {
                return fields;
            }
            fields.push({ name: hubspotName, value });
            return fields;
        }, []);
    }
    getConsentText() {
        var _a, _b;
        const consentRow = document.querySelector('.consent-row span');
        return ((_b = (_a = consentRow === null || consentRow === void 0 ? void 0 : consentRow.textContent) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : 'I agree to receive QuackCoin updates.');
    }
    getHubSpotUtk() {
        const cookieName = 'hubspotutk';
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const entry = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));
        if (!entry) {
            return undefined;
        }
        return entry.substring(cookieName.length + 1);
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuackCoinLandingPage();
    // Add particle effect on hero section
    createParticles();
});
// Particle effect for hero section
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero)
        return;
    const particleCount = 50;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(255, 215, 0, ${Math.random() * 0.5 + 0.3});
            border-radius: 50%;
            pointer-events: none;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: float-particle ${Math.random() * 10 + 10}s infinite ease-in-out;
            animation-delay: ${Math.random() * 5}s;
        `;
        hero.appendChild(particle);
        particles.push(particle);
    }
    // Add CSS animation for particles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float-particle {
            0%, 100% {
                transform: translate(0, 0) rotate(0deg);
                opacity: 0;
            }
            10%, 90% {
                opacity: 1;
            }
            50% {
                transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(360deg);
            }
        }

        .fade-element {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.8s ease, transform 0.8s ease;
        }

        .fade-element.fade-in {
            opacity: 1;
            transform: translateY(0);
        }

        .navbar {
            transition: transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}
// Easter egg: Quack sound on logo click (optional fun feature)
document.addEventListener('DOMContentLoaded', () => {
    const logos = document.querySelectorAll('.logo-img, .hero-logo, .section-logo, .footer-logo');
    let quackCount = 0;
    logos.forEach(logo => {
        logo.addEventListener('click', () => {
            quackCount++;
            // Only render QUACK and play sound from 4th click onwards
            if (quackCount >= 4) {
                // Play quack sound
                const audio = new Audio('public/quack.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.log('Audio play failed:', err));
                // Create quack text animation
                const quack = document.createElement('div');
                quack.textContent = 'QUACK!';
                quack.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 3rem;
                    font-weight: bold;
                    color: var(--primary-color);
                    text-shadow: 0 0 30px var(--glow-strong);
                    pointer-events: none;
                    animation: quack-animation 1s ease-out forwards;
                    z-index: 10000;
                `;
                document.body.appendChild(quack);
                // Add animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes quack-animation {
                        0% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(0.5);
                        }
                        50% {
                            transform: translate(-50%, -50%) scale(1.2);
                        }
                        100% {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(1.5);
                        }
                    }
                `;
                document.head.appendChild(style);
                setTimeout(() => {
                    quack.remove();
                    style.remove();
                }, 1000);
            }
        });
    });
});
