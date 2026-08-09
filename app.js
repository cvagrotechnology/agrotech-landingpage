/* ==========================================================================
   AGROTECH — App Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // -----------------------------------------------------------------------
  // 1. Sticky Header
  // -----------------------------------------------------------------------
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // -----------------------------------------------------------------------
  // 2. Mobile Menu Toggle
  // -----------------------------------------------------------------------
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mainNav = document.getElementById('main-nav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      const icon = mobileMenuBtn.querySelector('i');
      if (mainNav.classList.contains('active')) {
        icon.className = 'ri-close-line';
      } else {
        icon.className = 'ri-menu-line';
      }
    });

    // Close menu when a link is clicked
    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('active');
        mobileMenuBtn.querySelector('i').className = 'ri-menu-line';
      });
    });
  }

  // -----------------------------------------------------------------------
  // 3. Animated Counter (Trusted By Stats)
  // -----------------------------------------------------------------------
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const duration = 2000;
      const start = 0;
      const startTime = performance.now();

      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.floor(eased * target);

        if (target >= 1000) {
          counter.textContent = current.toLocaleString('id-ID');
        } else {
          counter.textContent = current;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          if (target >= 1000) {
            counter.textContent = target.toLocaleString('id-ID');
          } else {
            counter.textContent = target;
          }
        }
      }

      requestAnimationFrame(update);
    });
  }

  // Use IntersectionObserver to trigger counter animation
  const trustedSection = document.getElementById('trusted');
  if (trustedSection) {
    let counterTriggered = false;
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !counterTriggered) {
          counterTriggered = true;
          animateCounters();
        }
      });
    }, { threshold: 0.3 });

    counterObserver.observe(trustedSection);
  }

  // -----------------------------------------------------------------------
  // 4. Scroll Reveal Animations (Fade in elements)
  // -----------------------------------------------------------------------
  const fadeElements = document.querySelectorAll('.fade-in-right, .fade-in-left');
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  fadeElements.forEach(el => fadeObserver.observe(el));

  // -----------------------------------------------------------------------
  // 5. Active Nav Link Highlight
  // -----------------------------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  const allNavLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        allNavLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav);

  // -----------------------------------------------------------------------
  // 6. Contact Form Submission
  // -----------------------------------------------------------------------
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('form-name').value;
      const email = document.getElementById('form-email').value;
      const topic = document.getElementById('form-topic').value || 'Paket Solusi Terpadu';

      alert(`Terima kasih, ${name}!\n\nPermohonan demo mengenai "${topic}" telah kami terima. Tim konsultan Agrotech akan menghubungi Anda melalui email (${email}) atau WhatsApp dalam kurun waktu 1x24 jam.`);
      contactForm.reset();
    });
  }

  // -----------------------------------------------------------------------
  // 7. Smooth scroll for anchor links
  // -----------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

});
