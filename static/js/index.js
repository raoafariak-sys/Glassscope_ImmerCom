/* GlassScope project page: pipeline stage selector and BibTeX copy button.
   Without JavaScript every stage explanation stays visible and the stage buttons stay disabled. */
(function () {
  'use strict';

  /* ---------- Pipeline stages (WAI-ARIA tabs, automatic activation) ---------- */

  function initPipeline(list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[data-stage]'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    });
    if (!tabs.length || panels.indexOf(null) !== -1) {
      // Markup is incomplete: fall back to the no-JS layout (all panels listed, matching instructions).
      document.documentElement.classList.replace('js', 'no-js');
      return;
    }

    function select(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var selected = i === index;
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle('is-selected', selected);
        panels[i].hidden = !selected;
      });
      if (moveFocus) tabs[index].focus();
    }

    // On narrow screens the panel can sit below the fold; bring its top into view after a tap or click.
    function revealPanel(panel) {
      var top = panel.getBoundingClientRect().top;
      if (top > window.innerHeight - 96) {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollBy({ top: top - window.innerHeight * 0.45, behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'Pipeline stages');

    tabs.forEach(function (tab, i) {
      var name = tab.querySelector('.gs-stage-name');
      var note = tab.querySelector('.gs-stage-note');
      tab.disabled = false;
      tab.setAttribute('role', 'tab');
      if (name) {
        name.id = tab.id + '-name';
        tab.setAttribute('aria-labelledby', name.id);
        panels[i].setAttribute('aria-labelledby', name.id);
      }
      if (note) {
        note.id = tab.id + '-note';
        tab.setAttribute('aria-describedby', note.id);
      }
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].tabIndex = 0;

      tab.addEventListener('click', function () {
        select(i, false);
        revealPanel(panels[i]);
      });

      tab.addEventListener('keydown', function (event) {
        var last = tabs.length - 1;
        var next;
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            next = i === last ? 0 : i + 1;
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            next = i === 0 ? last : i - 1;
            break;
          case 'Home':
            next = 0;
            break;
          case 'End':
            next = last;
            break;
          default:
            return;
        }
        event.preventDefault();
        select(next, true);
      });
    });

    var initial = tabs.findIndex(function (tab) {
      return tab.hasAttribute('data-initial');
    });
    select(initial === -1 ? 0 : initial, false);
  }

  /* ---------- Copy BibTeX ---------- */

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '0';
      area.style.left = '0';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (err) {
        copied = false;
      }
      document.body.removeChild(area);
      if (copied) {
        resolve();
      } else {
        reject(new Error('Copy command was rejected'));
      }
    });
  }

  function copyText(text) {
    // The async Clipboard API needs a secure context; file:// and plain http fall back.
    if (navigator.clipboard && window.isSecureContext) {
      try {
        return navigator.clipboard.writeText(text).catch(function () {
          return legacyCopy(text);
        });
      } catch (err) {
        // Some embedding policies make writeText throw synchronously.
        return legacyCopy(text);
      }
    }
    return legacyCopy(text);
  }

  function initCopy(button) {
    var source = document.getElementById(button.getAttribute('data-copy-target'));
    var status = document.getElementById(button.getAttribute('data-copy-status'));
    var label = button.querySelector('[data-copy-label]');
    if (!source || !status || !label) return;

    var resetTimer = null;

    function report(buttonText, message, holdMs) {
      label.textContent = buttonText;
      // Clear first so a repeated, identical message is announced again by the live region.
      status.textContent = '';
      window.setTimeout(function () {
        status.textContent = message;
      }, 50);
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        label.textContent = 'Copy';
        status.textContent = '';
      }, holdMs);
    }

    button.hidden = false;
    button.addEventListener('click', function () {
      copyText(source.textContent).then(
        function () {
          report('Copied', 'BibTeX copied to the clipboard.', 2500);
        },
        function () {
          report('Copy', 'Copying failed. Select the BibTeX text and copy it with your keyboard.', 8000);
        }
      ).then(function () {
        button.focus();
      });
    });
  }

  /* ---------- Init ---------- */

  function init() {
    var stageList = document.querySelector('[data-stage-list]');
    if (stageList) initPipeline(stageList);
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy-target]'), initCopy);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
