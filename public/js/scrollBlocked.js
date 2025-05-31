// บล็อคการ scroll ที่เกิดจาก mouse wheel และ touchmove
window.addEventListener('wheel', e => e.preventDefault(), { passive: false });
window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// บล็อคการ scroll จากการกดปุ่มเลื่อน
window.addEventListener('keydown', e => {
    const keys = [32, 33, 34, 35, 36, 37, 38, 39, 40];
    if (keys.includes(e.keyCode)) {
        e.preventDefault();
    }
});