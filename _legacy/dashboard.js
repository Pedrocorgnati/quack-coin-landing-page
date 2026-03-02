"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.localStorage.removeItem('quack_login_ok');
            window.location.href = 'index.html';
        });
    }
    const claimButton = document.getElementById('claimQuackButton');
    if (!claimButton) {
        return;
    }
    const storageKey = 'quack_daily_claim';
    let countdownTimer = null;
    let quackTimer = null;
    const formatTime = (msRemaining) => {
        const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };
    const updateButtonState = (remainingMs) => {
        if (remainingMs <= 0) {
            claimButton.textContent = 'Claim your daily Quack';
            claimButton.disabled = false;
            return;
        }
        claimButton.textContent = formatTime(remainingMs);
        claimButton.disabled = true;
    };
    const playQuack = () => {
        const audio = new Audio('public/quack.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => undefined);
    };
    const startCountdown = (targetTime) => {
        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        if (quackTimer) {
            clearInterval(quackTimer);
        }
        const tick = () => {
            const remaining = targetTime - Date.now();
            updateButtonState(remaining);
            if (remaining <= 0) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                clearInterval(quackTimer);
                quackTimer = null;
                window.localStorage.removeItem(storageKey);
            }
        };
        tick();
        countdownTimer = window.setInterval(tick, 1000);
        quackTimer = window.setInterval(playQuack, 60000);
    };
    const storedTarget = window.localStorage.getItem(storageKey);
    if (storedTarget) {
        const targetTime = Number(storedTarget);
        if (!Number.isNaN(targetTime)) {
            startCountdown(targetTime);
        }
    }
    claimButton.addEventListener('click', () => {
        playQuack();
        const targetTime = Date.now() + 24 * 60 * 60 * 1000;
        window.localStorage.setItem(storageKey, String(targetTime));
        startCountdown(targetTime);
    });

    const socialButtons = {
        igfollowQuackButton: 'https://www.instagram.com',
        XfollowQuackButton: 'https://www.x.com',
        tiktokfollowQuackButton: 'https://www.tiktok.com',
        youtubefollowQuackButton: 'https://www.youtube.com',
        facebookfollowQuackButton: 'https://www.facebook.com',
        linkedinfollowQuackButton: 'https://www.linkedin.com'
    };
    Object.entries(socialButtons).forEach(([id, target]) => {
        const button = document.getElementById(id);
        if (!button) {
            return;
        }
        button.addEventListener('click', () => {
            playQuack();
            window.open(target, '_blank', 'noopener');
        });
    });
});
