// Supabase config — publishable/anon key, safe to expose in client-side code.
const SUPABASE_URL = 'https://qnovuaolxiajmhbwndgy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_S3J35mRX5K9xZsoBxmb6qA_EQUFKU8Z';
const supabaseClient =
  window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('.nav-links a').forEach((link) => {
      link.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  // Highlight active nav link based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  // Contact form: submits via FormSubmit's AJAX endpoint (no backend needed).
  // NOTE: the destination inbox must click a one-time confirmation link the
  // first time a submission is sent before messages start arriving for real.
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/goldie.marie@icloud.com';
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const success = document.querySelector('#form-success');
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      const data = new FormData(form);

      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        });
        if (!res.ok) throw new Error('Request failed');

        success.textContent = "Thanks! Your message has been received. We'll be in touch within one business day.";
        success.classList.remove('error');
        success.classList.add('show');
        form.reset();
      } catch (err) {
        success.textContent = 'Something went wrong sending your message. Please email us directly instead.';
        success.classList.add('show', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Best-effort: also save the lead to Supabase for tracking (founding
      // client slots, referral credit). Doesn't block the success message
      // above if it fails — the email via FormSubmit is the reliable path.
      if (supabaseClient) {
        supabaseClient
          .rpc('submit_lead', {
            p_name: data.get('name'),
            p_email: data.get('email'),
            p_project_type: data.get('project-type'),
            p_budget: data.get('budget'),
            p_referred_by: data.get('referred-by'),
            p_message: data.get('message'),
          })
          .then(({ error }) => {
            if (error) console.error('Supabase lead tracking failed:', error);
          });
      }
    });
  }

  // Live founding-client slots counter (services.html)
  const slotsEl = document.querySelector('#founding-slots-remaining');
  if (slotsEl && supabaseClient) {
    supabaseClient.rpc('founding_slots_remaining').then(({ data: remaining, error }) => {
      if (error) {
        console.error('Failed to load founding slots:', error);
        return;
      }
      if (remaining <= 0) {
        slotsEl.textContent = 'Founding client pricing is fully booked right now.';
      } else {
        const noun = remaining === 1 ? 'spot' : 'spots';
        slotsEl.textContent = `${remaining} ${noun} left at this price.`;
      }
    });
  }
});
