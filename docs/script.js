document.addEventListener('DOMContentLoaded', () => {
    
    // Create floating geometric particles in the background
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        initParticles(particlesContainer);
    }

    // Add card link click handlers (easter egg style, visual only)
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Ripple effect
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.left = `${e.clientX - card.getBoundingClientRect().left}px`;
            ripple.style.top = `${e.clientY - card.getBoundingClientRect().top}px`;
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.width = '10px';
            ripple.style.height = '10px';
            ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            ripple.style.borderRadius = '50%';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.pointerEvents = 'none';
            
            card.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

});

function initParticles(container) {
    const numParticles = 30;
    const colors = ['#06b6d4', '#d946ef', '#8b5cf6', 'rgba(255, 255, 255, 0.2)'];
    const shapes = ['square', 'circle', 'triangle'];

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 15 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
        
        particle.style.position = 'absolute';
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        particle.style.opacity = Math.random() * 0.5 + 0.1;
        
        // Shape styling
        if (shapeType === 'circle') {
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = color;
        } else if (shapeType === 'square') {
            particle.style.backgroundColor = color;
        } else if (shapeType === 'triangle') {
            particle.style.width = '0';
            particle.style.height = '0';
            particle.style.backgroundColor = 'transparent';
            particle.style.borderLeft = `${size/2}px solid transparent`;
            particle.style.borderRight = `${size/2}px solid transparent`;
            particle.style.borderBottom = `${size}px solid ${color}`;
        }

        // Animation
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200;
        const rot = Math.random() * 360;

        particle.animate([
            { transform: 'translate(0, 0) rotate(0deg)' },
            { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)` },
            { transform: 'translate(0, 0) rotate(0deg)' }
        ], {
            duration: duration * 1000,
            delay: delay * 1000,
            iterations: Infinity,
            easing: 'ease-in-out'
        });

        container.appendChild(particle);
    }

    // Add ripple keyframes dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes ripple {
            0% { width: 0; height: 0; opacity: 1; }
            100% { width: 300px; height: 300px; opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
