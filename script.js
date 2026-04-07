// =============================================
// নুর মিডিয়া বল্লা - Main JavaScript
// =============================================

// ===== PARTICLE SYSTEM =====
function createParticles() {
  const container = document.getElementById('particles');
  const count = 30;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 15 + 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.width = (Math.random() * 3 + 1) + 'px';
    p.style.height = p.style.width;
    p.style.opacity = Math.random() * 0.5;
    container.appendChild(p);
  }
}

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  updateActiveLink();
});

function updateActiveLink() {
  const sections = ['home', 'about', 'services', 'media', 'contact'];
  const scrollPos = window.scrollY + 100;

  sections.forEach(id => {
    const section = document.getElementById(id);
    if (!section) return;
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    if (scrollPos >= top && scrollPos < bottom) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active');
        }
      });
    }
  });
}

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinksContainer = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinksContainer.classList.toggle('open');
});

navLinksContainer.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinksContainer.classList.remove('open');
  });
});

// Close on outside click
document.addEventListener('click', (e) => {
  if (!hamburger.contains(e.target) && !navLinksContainer.contains(e.target)) {
    hamburger.classList.remove('open');
    navLinksContainer.classList.remove('open');
  }
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const hrefVal = this.getAttribute('href');
    if (hrefVal.length > 1) {
      e.preventDefault();
      const target = document.querySelector(hrefVal);
      if (target) {
        const offsetTop = target.offsetTop - 80;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      }
    }
  });
});

// ===== INTERSECTION OBSERVER - FADE IN =====
function initFadeIn() {
  const elements = document.querySelectorAll(
    '.about-card, .service-card, .platform-card, .why-item, .contact-card, .section-header'
  );

  elements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ===== COUNTER ANIMATION =====
function animateCounter(el, target, suffix = '') {
  let current = 0;
  const increment = target / 60;
  const isFloat = target < 10;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    if (isFloat) {
      el.textContent = current.toFixed(1) + suffix;
    } else {
      el.textContent = Math.floor(current).toLocaleString('bn-BD') + suffix;
    }
  }, 25);
}

// Stats are already in Bengali numerals from HTML, no counter needed for static
// But let's add a subtle scale animation on scroll
function initStatsAnimation() {
  const statsSection = document.querySelector('.hero-stats');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-number').forEach((el, i) => {
          setTimeout(() => {
            el.style.transition = 'transform 0.5s ease, color 0.5s ease';
            el.style.transform = 'scale(1.1)';
            setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
          }, i * 100);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  observer.observe(statsSection);
}

// ===== CONTACT FORM =====
function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('nameInput').value;
  const phone = document.getElementById('phoneInput').value;
  const service = document.getElementById('serviceSelect').value;
  const message = document.getElementById('messageInput').value;

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
    পাঠানো হচ্ছে...
  `;

  // Build WhatsApp message
  const serviceLabels = {
    'islamic-media': 'ইসলামিক মিডিয়া',
    'cc-camera': 'সিসি ক্যামেরা ইন্সটলেশন',
    'projector': 'প্রজেক্টর ভাড়া',
    'other': 'অন্যান্য'
  };

  const waMessage = encodeURIComponent(
    `নুর মিডিয়া বল্লা ওয়েবসাইট থেকে নতুন বার্তা:\n\n` +
    `নাম: ${name}\n` +
    `ফোন: ${phone}\n` +
    `সেবা: ${serviceLabels[service] || service}\n` +
    `বার্তা: ${message}`
  );

  setTimeout(() => {
    // Show success
    document.getElementById('formSuccess').style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      বার্তা পাঠান
    `;

    // Redirect to WhatsApp
    window.open(`https://wa.me/8801712908124?text=${waMessage}`, '_blank');

    // Reset form
    e.target.reset();
    setTimeout(() => {
      document.getElementById('formSuccess').style.display = 'none';
    }, 5000);
  }, 1200);
}

// ===== ADD SPIN ANIMATION =====
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);

// ===== CURSOR TRAIL ON HERO =====
let lastTime = 0;
document.querySelector('.hero').addEventListener('mousemove', (e) => {
  const now = Date.now();
  if (now - lastTime < 60) return;
  lastTime = now;

  const sparkle = document.createElement('div');
  sparkle.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    width: 4px; height: 4px;
    background: rgba(197, 160, 40, 0.6);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    animation: sparkFade 0.8s forwards;
  `;
  document.body.appendChild(sparkle);

  if (!document.getElementById('sparkStyle')) {
    const ss = document.createElement('style');
    ss.id = 'sparkStyle';
    ss.textContent = `
      @keyframes sparkFade {
        0% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(3); }
      }
    `;
    document.head.appendChild(ss);
  }

  setTimeout(() => sparkle.remove(), 800);
});

// ===== SERVICE CARD GLOW ON HOVER =====
document.querySelectorAll('.service-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const glow = card.querySelector('.service-glow');
    if (glow) {
      glow.style.left = (x - 100) + 'px';
      glow.style.top = (y - 100) + 'px';
    }
  });
});

// ===== TYPING EFFECT FOR HERO TAGLINE (Optional Enhancement) =====
function initTypingEffect() {
  // Already set, so we just animate sentence with highlight
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  initFadeIn();
  initStatsAnimation();
});

// Announce loaded
console.log(
  '%c🌙 নুর মিডিয়া বল্লা %c Website Loaded',
  'color: #c5a028; font-size:16px; font-weight: bold;',
  'color: #4ec988; font-size:14px;'
);
