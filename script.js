// CV Interactive Enhancements
document.addEventListener('DOMContentLoaded', () => {
    const prefersMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

    // Skill tag hover glow effect
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('mouseenter', () => {
            tag.style.transform = 'translateY(-1px) scale(1.03)';
        });
        tag.addEventListener('mouseleave', () => {
            tag.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Smooth header parallax on scroll
    const header = document.querySelector('.header');
    if (header && prefersMotion) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            if (scrolled < 400) {
                header.style.transform = `translateY(${scrolled * 0.08}px)`;
                header.style.opacity = Math.max(0.85, 1 - scrolled * 0.0008);
            }
        }, { passive: true });
    }

    // Print timestamp
    window.addEventListener('beforeprint', () => {
        console.log(`CV printed at: ${new Date().toISOString()}`);
    });
});
