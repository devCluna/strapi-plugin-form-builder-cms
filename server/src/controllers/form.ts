const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function publicPageHtml(form: any): string {
  const title = escapeHtml(form.title || 'Form');
  const description = escapeHtml(form.description || '');
  const formId = form.id;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f9;
      color: #32324d;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 48px 20px;
    }
    .card {
      background: #fff;
      border: 1px solid #dcdce4;
      border-radius: 8px;
      padding: 40px 48px;
      width: 100%;
      max-width: 640px;
    }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
    .desc { font-size: 14px; color: #666687; margin: 0 0 28px; }
    @media (max-width: 600px) { .card { padding: 28px 20px; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${description ? `<p class="desc">${description}</p>` : ''}
    <div id="sfb-form-${formId}"></div>
  </div>
  <script
    src="/api/strapi-plugin-form-builder-cms/embed.js"
    data-form-id="${formId}"
    async
  ></script>
</body>
</html>`;
}

function embedScript(): string {
  return `(function () {
  var PLUGIN = 'strapi-plugin-form-builder-cms';

  function init() {
    document.querySelectorAll('script[data-form-id]').forEach(function (script) {
      var formId = script.getAttribute('data-form-id');
      var target = document.getElementById('sfb-form-' + formId);
      if (!target) return;

      var base = new URL(script.src).origin;
      injectStyles();

      fetch(base + '/api/' + PLUGIN + '/forms/' + formId + '/embed-schema')
        .then(function (r) { return r.json(); })
        .then(function (resp) {
          var form = resp && resp.data;
          if (!form) { target.textContent = 'Form not found.'; return; }
          mount(target, form, base);
        })
        .catch(function () { target.textContent = 'Could not load form.'; });
    });
  }

  function mount(el, form, base) {
    var formEl = document.createElement('form');
    formEl.className = 'sfb-form';
    // let the plugin's own validation + server errors drive messages instead of
    // the browser's native required bubble
    formEl.noValidate = true;

    var captchaCfg = (form.settings && form.settings.captcha) || null;
    var captchaOn = !!(captchaCfg && captchaCfg.provider && captchaCfg.provider !== 'none' && captchaCfg.siteKey);

    // honeypot: hidden field bots tend to fill; humans never see it
    if (form.settings && form.settings.enableHoneypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = '_fc_hp';
      hp.tabIndex = -1;
      hp.autocomplete = 'off';
      hp.setAttribute('aria-hidden', 'true');
      hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
      formEl.appendChild(hp);
    }

    var grid = document.createElement('div');
    grid.className = 'sfb-grid';
    (form.fields || []).forEach(function (field) {
      var node = renderField(field);
      if (node) grid.appendChild(node);
    });
    formEl.appendChild(grid);

    // hidden tracking fields: value comes from a URL query param (e.g. ?utm_source=…)
    // falling back to a configured default. Never visible; submitted + stored like any field.
    var params = new URLSearchParams(window.location.search);
    (form.fields || []).forEach(function (field) {
      if (field.type !== 'hidden') return;
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = field.name;
      var val = field.defaultValue != null ? String(field.defaultValue) : '';
      if (field.queryParam && params.get(field.queryParam) !== null) val = params.get(field.queryParam);
      hidden.value = val;
      formEl.appendChild(hidden);
    });

    if (captchaOn) mountCaptcha(formEl, captchaCfg);

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = 'sfb-btn';
    btn.textContent = (form.settings && form.settings.submitButtonText) || 'Submit';
    formEl.appendChild(btn);

    var submitText = (form.settings && form.settings.submitButtonText) || 'Submit';

    function clearErrors() {
      formEl.querySelectorAll('.sfb-field-error').forEach(function (el) { el.remove(); });
      formEl.querySelectorAll('.sfb-field').forEach(function (el) { el.classList.remove('sfb-field--error'); });
      var ge = formEl.querySelector('.sfb-error');
      if (ge) ge.remove();
    }

    function showFieldErrors(errors) {
      Object.keys(errors).forEach(function (name) {
        var fieldEl = formEl.querySelector('[data-field-name="' + name + '"]');
        if (!fieldEl) return;
        fieldEl.classList.add('sfb-field--error');
        var errEl = document.createElement('p');
        errEl.className = 'sfb-field-error';
        errEl.textContent = errors[name][0];
        fieldEl.appendChild(errEl);
      });
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      btn.disabled = true;
      btn.textContent = 'Sending…';

      // collect form data, handling checkbox-group arrays
      var data = {};
      new FormData(formEl).forEach(function (v, k) {
        if (k.endsWith('[]')) {
          var name = k.slice(0, -2);
          if (!data[name]) data[name] = [];
          data[name].push(v);
        } else {
          data[k] = v;
        }
      });

      // normalize the provider's token field to a single key the server expects
      if (captchaOn) {
        data._fc_captcha = data['cf-turnstile-response'] || data['g-recaptcha-response'] || '';
        delete data['cf-turnstile-response'];
        delete data['g-recaptcha-response'];

        // client-side guard: don't even hit the server without a challenge token
        if (!data._fc_captcha) {
          btn.disabled = false;
          btn.textContent = submitText;
          var ce = document.createElement('p');
          ce.className = 'sfb-error';
          ce.textContent = 'Please complete the verification challenge.';
          formEl.insertBefore(ce, btn);
          return;
        }
      }

      fetch(base + '/api/' + PLUGIN + '/forms/' + form.slug + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data }),
      })
        .then(function (r) {
          return r.json().then(function (body) {
            if (!r.ok) return Promise.reject(body);
            return body;
          });
        })
        .then(function () {
          var msg = document.createElement('p');
          msg.className = 'sfb-success';
          msg.textContent = (form.settings && form.settings.successMessage) || 'Form submitted successfully';
          el.innerHTML = '';
          el.appendChild(msg);
        })
        .catch(function (body) {
          btn.disabled = false;
          btn.textContent = submitText;
          // captcha tokens are single-use — reset the widget so the user can retry
          if (captchaOn && captchaCfg.provider === 'turnstile' && window.turnstile) window.turnstile.reset();
          if (captchaOn && captchaCfg.provider === 'recaptcha' && window.grecaptcha) window.grecaptcha.reset();
          if (body && body.errors && Object.keys(body.errors).length > 0) {
            showFieldErrors(body.errors);
          } else {
            var errEl = document.createElement('p');
            errEl.className = 'sfb-error';
            errEl.textContent = (body && body.message) ? body.message : 'Something went wrong. Please try again.';
            formEl.insertBefore(errEl, btn);
          }
        });
    });

    el.innerHTML = '';
    el.appendChild(formEl);
  }

  function renderField(field) {
    if (field.type === 'hidden') return null;

    if (field.type === 'divider') {
      var hr = document.createElement('hr');
      hr.className = 'sfb-divider';
      hr.style.gridColumn = '1 / -1';
      return hr;
    }

    if (field.type === 'heading') {
      var h = document.createElement('p');
      h.className = 'sfb-heading';
      h.style.gridColumn = '1 / -1';
      h.textContent = field.label || '';
      return h;
    }

    if (field.type === 'paragraph') {
      var p = document.createElement('p');
      p.className = 'sfb-paragraph';
      p.style.gridColumn = '1 / -1';
      p.textContent = field.label || '';
      return p;
    }

    var wrapper = document.createElement('div');
    wrapper.className = 'sfb-field';
    wrapper.setAttribute('data-field-name', field.name);
    if (field.width !== 'half') wrapper.style.gridColumn = '1 / -1';

    if (field.type !== 'checkbox') {
      var label = document.createElement('label');
      label.className = 'sfb-label';
      label.htmlFor = 'sfb-' + field.id;
      label.textContent = field.label || '';
      if (field.required) {
        var req = document.createElement('span');
        req.className = 'sfb-required';
        req.textContent = ' *';
        label.appendChild(req);
      }
      wrapper.appendChild(label);
    }

    var input = buildInput(field);
    if (input) wrapper.appendChild(input);

    if (field.helpText) {
      var help = document.createElement('p');
      help.className = 'sfb-help';
      help.textContent = field.helpText;
      wrapper.appendChild(help);
    }

    return wrapper;
  }

  function buildInput(field) {
    var id = 'sfb-' + field.id;

    if (field.type === 'textarea') {
      var ta = document.createElement('textarea');
      ta.id = id; ta.name = field.name; ta.className = 'sfb-input';
      ta.placeholder = field.placeholder || '';
      ta.required = !!field.required;
      ta.rows = 4;
      return ta;
    }

    if (field.type === 'select') {
      var sel = document.createElement('select');
      sel.id = id; sel.name = field.name; sel.className = 'sfb-input';
      sel.required = !!field.required;
      var def = document.createElement('option');
      def.value = ''; def.textContent = field.placeholder || 'Select an option…';
      sel.appendChild(def);
      (field.options || []).forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label || o.value;
        sel.appendChild(opt);
      });
      return sel;
    }

    if (field.type === 'radio') {
      var group = document.createElement('div');
      group.className = 'sfb-radio-group';
      (field.options || []).forEach(function (o) {
        var lbl = document.createElement('label');
        lbl.className = 'sfb-radio-label';
        var inp = document.createElement('input');
        inp.type = 'radio'; inp.name = field.name; inp.value = o.value;
        inp.required = !!field.required;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(o.label || o.value));
        group.appendChild(lbl);
      });
      return group;
    }

    if (field.type === 'checkbox-group') {
      var cgroup = document.createElement('div');
      cgroup.className = 'sfb-radio-group';
      (field.options || []).forEach(function (o) {
        var lbl = document.createElement('label');
        lbl.className = 'sfb-radio-label';
        var inp = document.createElement('input');
        inp.type = 'checkbox'; inp.name = field.name + '[]'; inp.value = o.value;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(o.label || o.value));
        cgroup.appendChild(lbl);
      });
      return cgroup;
    }

    if (field.type === 'checkbox') {
      var clbl = document.createElement('label');
      clbl.className = 'sfb-checkbox-label';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = id; cb.name = field.name; cb.value = '1';
      cb.required = !!field.required;
      clbl.appendChild(cb);
      clbl.appendChild(document.createTextNode(' ' + (field.label || '')));
      return clbl;
    }

    var typeMap = { text:'text', email:'email', number:'number', phone:'tel',
                    password:'password', url:'url', date:'date', time:'time' };
    var inp2 = document.createElement('input');
    inp2.type = typeMap[field.type] || 'text';
    inp2.id = id; inp2.name = field.name; inp2.className = 'sfb-input';
    inp2.placeholder = field.placeholder || '';
    inp2.required = !!field.required;
    return inp2;
  }

  function loadScript(src, id, cb) {
    if (document.getElementById(id)) { cb && cb(); return; }
    var s = document.createElement('script');
    s.id = id; s.src = src; s.async = true; s.defer = true;
    s.onload = function () { cb && cb(); };
    document.head.appendChild(s);
  }

  // poll until the provider's global is ready, then run cb (widgets mount dynamically)
  function whenReady(check, cb) {
    if (check()) { cb(); return; }
    var t = setInterval(function () { if (check()) { clearInterval(t); cb(); } }, 50);
  }

  function mountCaptcha(formEl, cfg) {
    var box = document.createElement('div');
    box.className = 'sfb-captcha';
    box.style.margin = '4px 0 16px';
    formEl.appendChild(box);

    var failed = false;
    function fail() {
      if (failed) return;
      failed = true;
      box.innerHTML = '';
      var m = document.createElement('p');
      m.className = 'sfb-error';
      m.textContent = 'Verification could not load. Please contact the site owner.';
      box.appendChild(m);
    }
    // fallback: an invalid site key renders nothing and fires no error — flag it after a grace period
    function guard() { setTimeout(function () { if (!box.querySelector('iframe')) fail(); }, 5000); }

    if (cfg.provider === 'turnstile') {
      loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', 'sfb-turnstile', function () {
        whenReady(function () { return window.turnstile; }, function () {
          try { window.turnstile.render(box, { sitekey: cfg.siteKey, 'error-callback': fail }); guard(); }
          catch (e) { fail(); }
        });
      });
    } else if (cfg.provider === 'recaptcha') {
      loadScript('https://www.google.com/recaptcha/api.js?render=explicit', 'sfb-recaptcha', function () {
        whenReady(function () { return window.grecaptcha && window.grecaptcha.render; }, function () {
          try { window.grecaptcha.render(box, { sitekey: cfg.siteKey, 'error-callback': fail }); guard(); }
          catch (e) { fail(); }
        });
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('sfb-css')) return;
    var s = document.createElement('style');
    s.id = 'sfb-css';
    s.textContent = [
      '.sfb-form { font-family: inherit; text-align: left; color: #32324d; line-height: 1.5; }',
      '.sfb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }',
      '.sfb-field { display: flex; flex-direction: column; gap: 4px; }',
      '.sfb-label { font-size: 13px; font-weight: 600; color: #32324d; }',
      '.sfb-required { color: #ee5e52; }',
      '.sfb-input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #dcdce4; border-radius: var(--sfb-radius, 4px); font-size: 14px; font-family: inherit; color: #32324d; background: #fff; box-sizing: border-box; outline: none; transition: border-color .15s; }',
      '.sfb-input:focus { border-color: var(--sfb-accent, #4945ff); box-shadow: 0 0 0 2px rgba(73,69,255,.15); }',
      'textarea.sfb-input { height: auto; padding: 8px 12px; resize: vertical; }',
      'select.sfb-input { appearance: none; cursor: pointer; }',
      '.sfb-radio-group { display: flex; flex-direction: column; gap: 8px; }',
      '.sfb-radio-label, .sfb-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #32324d; cursor: pointer; }',
      '.sfb-radio-label input, .sfb-checkbox-label input { accent-color: var(--sfb-accent, #4945ff); width: 16px; height: 16px; cursor: pointer; }',
      '.sfb-help { font-size: 12px; color: #666687; margin: 0; }',
      '.sfb-btn { background: var(--sfb-accent, #4945ff); color: #fff; border: none; border-radius: var(--sfb-radius, 4px); padding: 10px 24px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity .15s; }',
      '.sfb-btn:hover { opacity: .88; }',
      '.sfb-btn:disabled { opacity: .6; cursor: not-allowed; }',
      '.sfb-heading { font-size: 18px; font-weight: 700; color: #32324d; margin: 4px 0; }',
      '.sfb-paragraph { font-size: 14px; color: #666687; margin: 4px 0; line-height: 1.6; }',
      '.sfb-divider { border: none; border-top: 1px solid #dcdce4; margin: 4px 0; }',
      '.sfb-success { font-size: 15px; color: #27ae60; font-weight: 600; }',
      '.sfb-error { font-size: 13px; color: #ee5e52; margin-bottom: 12px; }',
      '.sfb-field-error { font-size: 12px; color: #ee5e52; margin: 4px 0 0; }',
      '.sfb-field--error .sfb-input, .sfb-field--error .sfb-radio-group { border-color: #ee5e52 !important; }',
      '.sfb-field--error > .sfb-label { color: #ee5e52; }',
    ].join('\\n');
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}

export default {
  async find(ctx: any) {
    const forms = await strapi.plugin(PLUGIN_ID).service('form').find(ctx.query);
    ctx.body = forms;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').findOne(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async create(ctx: any) {
    const form = await strapi.plugin(PLUGIN_ID).service('form').create(ctx.request.body);
    ctx.body = form;
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').update(Number(id), ctx.request.body);
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async delete(ctx: any) {
    const { id } = ctx.params;
    await strapi.plugin(PLUGIN_ID).service('form').delete(Number(id));
    ctx.status = 204;
  },

  async duplicate(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').duplicate(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async getPublicSchema(ctx: any) {
    const { slug } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchema(slug);
    if (!schema) return ctx.notFound('Form not found');
    ctx.body = schema;
  },

  async getPublicSchemaById(ctx: any) {
    const { id } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchemaById(Number(id));
    if (!schema) return ctx.notFound('Form not found');
    ctx.body = schema;
  },

  async serveEmbed(ctx: any) {
    ctx.set('Content-Type', 'application/javascript; charset=utf-8');
    ctx.set('Cache-Control', 'public, max-age=3600');
    ctx.body = embedScript();
  },

  async servePublicPage(ctx: any) {
    const { slug } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchema(slug);

    if (!schema || !schema.data) return ctx.notFound('Form not found');

    const form = schema.data;
    if (!form.settings?.publicPage) return ctx.notFound('This form does not have a public page enabled');

    ctx.set('Content-Type', 'text/html; charset=utf-8');

    // Strapi's global security middleware sets a strict CSP (script-src 'self') that would
    // block the CAPTCHA provider's script + iframe. Relax it just for this page when a
    // provider is configured — overrides the header set upstream by helmet.
    const provider = form.settings?.captcha?.provider;
    if (provider && provider !== 'none') {
      ctx.set('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com",
        "frame-src https://challenges.cloudflare.com https://www.google.com",
        "style-src 'self' 'unsafe-inline' https:",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
        "font-src 'self' https: data:",
      ].join(';'));
    }

    ctx.body = publicPageHtml(form);
  },
};
