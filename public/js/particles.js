// ═══════════════════════════════════════════════════════════════════
// UI INTERACTIONS & COMPONENTS — EVIDENCE PROTECTION SYSTEM
// Theme: Captions — Sunlit Editing Desk
// (Particle animation and custom cursor removed per user instructions)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════ Custom Dropdown Initializer ═══════════════
;(function(){
  function buildCustomDropdown(select) {
    // Skip if already wrapped
    if (select.parentElement && select.parentElement.classList.contains('custom-select-wrap')) {
      rebuildOptions(select.parentElement, select);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'custom-select-wrap';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.tabIndex = 0;

    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);
    wrap.appendChild(select);

    // Handle disabled state
    if (select.disabled) trigger.classList.add('disabled');

    // Build options
    rebuildOptions(wrap, select);

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (trigger.classList.contains('disabled')) return;
      const isOpen = wrap.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) wrap.classList.add('open');
    });

    // Watch for dynamic changes to select (innerHTML, appendChild, disabled)
    const observer = new MutationObserver(() => {
      rebuildOptions(wrap, select);
      if (select.disabled) trigger.classList.add('disabled');
      else trigger.classList.remove('disabled');
    });
    observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  }

  function rebuildOptions(wrap, select) {
    const trigger = wrap.querySelector('.custom-select-trigger');
    const dropdown = wrap.querySelector('.custom-select-dropdown');
    dropdown.innerHTML = '';

    const opts = select.querySelectorAll('option');
    let hasSelected = false;

    opts.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'custom-select-option';
      div.textContent = opt.textContent;
      div.dataset.value = opt.value;

      if (opt.selected || (!hasSelected && i === select.selectedIndex)) {
        div.classList.add('selected');
        trigger.textContent = opt.textContent;
        hasSelected = true;
      }

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        trigger.textContent = opt.textContent;
        dropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        div.classList.add('selected');
        wrap.classList.remove('open');
      });

      dropdown.appendChild(div);
    });

    if (!hasSelected && opts.length > 0) {
      trigger.textContent = opts[0].textContent;
    }
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.custom-select-wrap.open').forEach(w => w.classList.remove('open'));
  }

  // Close on outside click
  document.addEventListener('click', closeAllDropdowns);
  // Close on Escape
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllDropdowns(); });

  // Init all selects on page load
  function initAll() {
    document.querySelectorAll('select').forEach(buildCustomDropdown);
  }

  // Run now and also expose for re-init
  initAll();
  window._refreshCustomDropdowns = initAll;
})();

// ═══════════════ Scroll Reveal & Stage Tab Animations ═══════════════
;(function(){
  document.querySelectorAll('.card, .b-card, .stat').forEach(el => el.classList.add('reveal'));
  
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  document.querySelectorAll('.stage-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setTimeout(() => {
        document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
      }, 50);
    });
  });
})();