// JavaScript

// Co-pilot helped a lot, but I had to fix a few things—
// and add some comments so I could understand the intention of the code.

// Connect the game logic to the drawer, score display, and completion screen.
const drawer = document.querySelector("#drawer");
const utensils = [...drawer.querySelectorAll(".utensil")];
const scoreDisplay = document.querySelector("#score");
const timeDisplay = document.querySelector("#time");
const restartButton = document.querySelector("#restart");
const drawerHandle = document.querySelector("#drawer-handle");
const completionOverlay = document.querySelector("#completion");
const completionTimeDisplay = document.querySelector("#completion-time");
const personalBestDisplay = document.querySelector("#personal-best");
const completionRecord = document.querySelector("#completion-record");
const completionCloseButton = document.querySelector("#completion-close");
const playAgainButton = document.querySelector("#play-again");
const confettiCanvas = document.querySelector("#confetti");
const confettiContext = confettiCanvas.getContext("2d");
const personalBestKey = "organize-drawer-personal-best";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let score = 0;
let timerStartedAt = null;
let timerInterval = null;
let gameComplete = false;
let completionTimeout = null;
let confettiFrame = null;
let confettiResolve = null;
let drawerOffset = -86;
let handlePointerMoved = false;
let suppressHandleClick = false;

// Keep the timer display consistent and start timing on the first pickup.
function formatTime(milliseconds) {
    const tenths = Math.floor(milliseconds / 100);
    const minutes = Math.floor(tenths / 600);
    const seconds = Math.floor(tenths / 10) % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths % 10}`;
}

function updateTimer() {
    if (timerStartedAt !== null) {
        timeDisplay.textContent = formatTime(performance.now() - timerStartedAt);
    }
}

function startTimer() {
    if (timerStartedAt !== null) return;
    timerStartedAt = performance.now();
    timerInterval = window.setInterval(updateTimer, 100);
}

function stopTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
    updateTimer();
}

// Save the best time and show the final results once the drawer has closed.
function showCompletion(elapsed) {
    const savedBest = Number(localStorage.getItem(personalBestKey));
    const isNewPersonalBest = !Number.isFinite(savedBest) || savedBest <= 0 || elapsed < savedBest;
    const personalBest = isNewPersonalBest ? elapsed : savedBest;

    if (isNewPersonalBest) {
        localStorage.setItem(personalBestKey, String(personalBest));
    }

    completionTimeDisplay.textContent = formatTime(elapsed);
    personalBestDisplay.textContent = formatTime(personalBest);
    completionRecord.hidden = !isNewPersonalBest;
    completionOverlay.hidden = false;
    requestAnimationFrame(() => completionOverlay.classList.add("is-visible"));
    playAgainButton.focus();
}

// After the results are dismissed, let players manually pull the drawer. (For added fun!)
function enableManualDrawer() {
    drawer.style.animation = "none";
    drawerOffset = -86;
    drawer.style.setProperty("--drawer-offset", `${drawerOffset}%`);
    drawer.classList.add("manual-control");
}

function setDrawerOffset(offset) {
    drawerOffset = Math.max(-86, Math.min(0, offset));
    drawer.style.setProperty("--drawer-offset", `${drawerOffset}%`);
}

drawerHandle.addEventListener("pointerdown", (event) => {
    if (!drawer.classList.contains("manual-control") || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    handlePointerMoved = false;
    drawer.classList.add("is-dragging");
    drawerHandle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startOffset = drawerOffset;

    const moveDrawer = (moveEvent) => {
        const deltaY = moveEvent.clientY - startY;
        if (Math.abs(deltaY) > 3) handlePointerMoved = true;
        setDrawerOffset(startOffset + (deltaY / drawer.getBoundingClientRect().height) * 100);
    };

    const finishDrawerDrag = () => {
        drawerHandle.removeEventListener("pointermove", moveDrawer);
        drawerHandle.removeEventListener("pointerup", finishDrawerDrag);
        drawerHandle.removeEventListener("pointercancel", cancelDrawerDrag);
        drawer.classList.remove("is-dragging");
        setDrawerOffset(drawerOffset <= -43 ? -86 : 0);
        if (handlePointerMoved) {
            suppressHandleClick = true;
            window.setTimeout(() => {
                suppressHandleClick = false;
            }, 0);
        }
    };

    const cancelDrawerDrag = () => {
        drawerHandle.removeEventListener("pointermove", moveDrawer);
        drawerHandle.removeEventListener("pointerup", finishDrawerDrag);
        drawerHandle.removeEventListener("pointercancel", cancelDrawerDrag);
        drawer.classList.remove("is-dragging");
        setDrawerOffset(drawerOffset <= -43 ? -86 : 0);
    };

    drawerHandle.addEventListener("pointermove", moveDrawer);
    drawerHandle.addEventListener("pointerup", finishDrawerDrag);
    drawerHandle.addEventListener("pointercancel", cancelDrawerDrag);
});

drawerHandle.addEventListener("click", () => {
    if (suppressHandleClick || !drawer.classList.contains("manual-control")) return;
    setDrawerOffset(drawerOffset <= -43 ? 0 : -86);
});

// Assisted with the confetti animation that plays on game completion.
function playConfetti() {
    if (reducedMotion.matches) return Promise.resolve();

    const scale = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    confettiCanvas.width = Math.floor(width * scale);
    confettiCanvas.height = Math.floor(height * scale);
    confettiContext.setTransform(scale, 0, 0, scale, 0, 0);

    const colors = ["#d94f70", "#f2b84b", "#5a9e78", "#5b83bd", "#a36bc2"];
    const pieces = Array.from({ length: 150 }, () => ({
        x: Math.random() * width,
        y: -Math.random() * height * 0.7,
        velocityX: (Math.random() - 0.5) * 4,
        velocityY: 2 + Math.random() * 4,
        size: 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.16,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));
    const startedAt = performance.now();

    return new Promise((resolve) => {
        function drawConfetti(now) {
            confettiContext.clearRect(0, 0, width, height);
            pieces.forEach((piece) => {
                piece.x += piece.velocityX;
                piece.y += piece.velocityY;
                piece.velocityY += 0.035;
                piece.rotation += piece.spin;

                confettiContext.save();
                confettiContext.translate(piece.x, piece.y);
                confettiContext.rotate(piece.rotation);
                confettiContext.fillStyle = piece.color;
                confettiContext.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.65);
                confettiContext.restore();
            });

            if (now - startedAt < 1800) {
                confettiFrame = requestAnimationFrame(drawConfetti);
            } else {
                confettiContext.clearRect(0, 0, width, height);
                confettiFrame = null;
                confettiResolve = null;
                resolve();
            }
        }

        confettiResolve = resolve;
        confettiFrame = requestAnimationFrame(drawConfetti);
    });
}

function completeGame() {
    if (gameComplete) return;
    gameComplete = true;
    const elapsed = timerStartedAt === null ? 0 : performance.now() - timerStartedAt;
    stopTimer();
    completionTimeout = window.setTimeout(async () => {
        if (reducedMotion.matches) {
            drawer.style.animation = "none";
            drawer.style.transform = "translateY(-86%)";
        } else {
            drawer.style.animation = "drawer-close 1.1s cubic-bezier(0.22, 0.8, 0.25, 1) forwards";
        }

        await new Promise((resolve) => window.setTimeout(resolve, reducedMotion.matches ? 0 : 1100));
        if (!gameComplete) return;
        await playConfetti();
        if (gameComplete) showCompletion(elapsed);
    }, 600);
}

// Match each utensil with its own zone and return misplaced drops to the pile.
function isOverCorrectZone(utensil, clientX, clientY) {
    const zone = drawer.querySelector(`.zone.${utensil.dataset.name}`);
    const bounds = zone.getBoundingClientRect();
    return clientX >= bounds.left
        && clientX <= bounds.right
        && clientY >= bounds.top
        && clientY <= bounds.bottom;
}

function finishDrag(utensil, wasPlaced, event) {
    const droppedCorrectly = isOverCorrectZone(utensil, event.clientX, event.clientY);
    utensil.classList.remove("dragging");

    if (droppedCorrectly) {
        utensil.classList.add("placed");
        utensil.style.left = "";
        utensil.style.top = "";
        if (!wasPlaced) {
            score += 1;
            scoreDisplay.textContent = score;
        }
        if (score === utensils.length) completeGame();
        return;
    }

    if (wasPlaced) {
        utensil.classList.add("placed");
        utensil.style.left = "";
        utensil.style.top = "";
    } else {
        utensil.style.left = "";
        utensil.style.top = "";
    }
    utensil.classList.add("wrong");
}

utensils.forEach((utensil) => {
    utensil.addEventListener("pointerdown", (event) => {
        if (gameComplete || !event.isPrimary || event.button !== 0) return;

        utensil.classList.remove("wrong");
        const drawerBounds = drawer.getBoundingClientRect();
        const wasPlaced = utensil.classList.contains("placed");

        startTimer();
        utensil.classList.remove("placed");
        utensil.classList.add("dragging");
        utensil.setPointerCapture(event.pointerId);

        const moveUtensil = (moveEvent) => {
            const currentDrawerBounds = drawer.getBoundingClientRect();
            utensil.style.left = `${moveEvent.clientX - currentDrawerBounds.left}px`;
            utensil.style.top = `${moveEvent.clientY - currentDrawerBounds.top}px`;
        };

        const endDrag = (endEvent) => {
            utensil.removeEventListener("pointermove", moveUtensil);
            utensil.removeEventListener("pointerup", endDrag);
            utensil.removeEventListener("pointercancel", cancelDrag);
            finishDrag(utensil, wasPlaced, endEvent);
        };

        const cancelDrag = () => {
            utensil.removeEventListener("pointermove", moveUtensil);
            utensil.removeEventListener("pointerup", endDrag);
            utensil.removeEventListener("pointercancel", cancelDrag);
            utensil.classList.remove("dragging");
            if (wasPlaced) {
                utensil.classList.add("placed");
            }
            utensil.style.left = "";
            utensil.style.top = "";
        };

        utensil.addEventListener("pointermove", moveUtensil);
        utensil.addEventListener("pointerup", endDrag);
        utensil.addEventListener("pointercancel", cancelDrag);

        utensil.style.left = `${event.clientX - drawerBounds.left}px`;
        utensil.style.top = `${event.clientY - drawerBounds.top}px`;
    });
});

// Clear the current round and replay the drawer-opening animation.
function restartGame() {
    gameComplete = false;
    window.clearTimeout(completionTimeout);
    if (confettiFrame !== null) cancelAnimationFrame(confettiFrame);
    confettiFrame = null;
    confettiContext.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    if (confettiResolve !== null) {
        const resolveConfetti = confettiResolve;
        confettiResolve = null;
        resolveConfetti();
    }
    completionOverlay.classList.remove("is-visible");
    completionOverlay.hidden = true;
    stopTimer();
    timerStartedAt = null;
    score = 0;
    scoreDisplay.textContent = "0";
    timeDisplay.textContent = "0:00.0";

    utensils.forEach((utensil) => {
        utensil.classList.remove("dragging", "placed", "wrong");
        utensil.style.left = "";
        utensil.style.top = "";
    });

    drawer.classList.remove("manual-control", "is-dragging");
    drawer.style.removeProperty("--drawer-offset");
    drawer.style.transform = "";
    drawer.style.animation = "none";
    void drawer.offsetHeight;
    drawer.style.animation = "";
}

// Dismissing the results enables the drawer handle; restart and replay buttons begin a new round.
completionCloseButton.addEventListener("click", () => {
    completionOverlay.classList.remove("is-visible");
    window.setTimeout(() => {
        if (!completionOverlay.classList.contains("is-visible")) {
            completionOverlay.hidden = true;
            enableManualDrawer();
        }
    }, 350);
    restartButton.focus();
});

restartButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);