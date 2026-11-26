/* The modality card: one card per healing modality, built from the data in modalities.js (made by build.py).
   Kept apart from the mandala so other mandalas can load the same card:

     <script src="https://erinsarita.github.io/healing-mandala/modalities.js"></script>
     <script src="https://erinsarita.github.io/healing-mandala/modality-card.js"></script>
     ...
     el.innerHTML = ModalityCard.render(MODALITIES.modalities[0], MODALITIES);

   The card brings its own styles. It uses the host page's colour tokens when they exist
   (--surface, --ink, --muted, --line, --bg, --display, --body) and each type's colours as
   --t-<type> (the deeper colour) and --t-<type>-tint (the lighter one), with fallbacks. */
(function(){
  "use strict";

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const typeKey = t => String(t).toLowerCase().replace(/[^a-z]+/g, "");

  // Words in the sheet that say a link has not been checked yet; they are shown as a small label.
  const FLAG = /\((?:[^()]*?(?:not verified|from module notes)[^()]*)\)|\bNot verified\b\.?/gi;
  // Web addresses written without https://, such as "iahp.com" or "emdria.org/find-an-emdr-therapist".
  const URL = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|org|net|info|edu|de|uk|co\.uk)(?:\/[\w\-./%#?=&]*[\w/])?)/gi;
  // Names in the sheet that stand for a directory named in the brief.
  const NAMED = {"APPPAH Practitioner Directory": "https://birthpsychology.com/"};

  function flagged(text){
    // escape, then mark the "not verified" and "from module notes" notes
    let out = "", last = 0;
    text.replace(FLAG, (m, i) => { out += esc(text.slice(last, i)) + `<span class="mc-flag">${esc(m.replace(/^\(|\)$/g, "").replace(/\.$/, ""))}</span>`; last = i + m.length; return m; });
    return out + esc(text.slice(last));
  }
  function linked(text){
    let html = "", last = 0;
    for (const [name, href] of Object.entries(NAMED)) {
      const i = text.indexOf(name);
      if (i >= 0 && !URL.test(text)) {
        URL.lastIndex = 0;
        return flagged(text.slice(0, i)) + `<a href="${href}" target="_blank" rel="noopener">${esc(name)}</a>` + flagged(text.slice(i + name.length));
      }
      URL.lastIndex = 0;
    }
    text.replace(URL, (m, _u, i) => {
      const href = /^https?:/i.test(m) ? m : "https://" + m;
      html += flagged(text.slice(last, i)) + `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(m)}</a>`;
      last = i + m.length; return m;
    });
    return html + flagged(text.slice(last));
  }

  // "Does it hurt? No, the touch is very light. Is it safe? ..." -> question and answer pairs, words unchanged
  function qa(text){
    const parts = text.match(/[^.?!]+(?:[.?!]+|$)/g) || [];
    const pairs = [];
    parts.map(s => s.trim()).filter(Boolean).forEach(s => {
      if (s.endsWith("?") || !pairs.length) pairs.push({q: s.endsWith("?") ? s : "", a: s.endsWith("?") ? "" : s});
      else pairs[pairs.length - 1].a += (pairs[pairs.length - 1].a ? " " : "") + s;
    });
    if (!pairs.some(p => p.q)) return `<p>${esc(text)}</p>`;
    return `<dl class="mc-qa">${pairs.map(p => (p.q ? `<dt>${esc(p.q)}</dt>` : "") + (p.a ? `<dd>${esc(p.a)}</dd>` : "")).join("")}</dl>`;
  }

  function evidenceBadge(level, data, small){
    const levels = (data && data.evidence) || ["Research-based", "Some research", "Case reports", "Practice-based"];
    const n = levels.length - levels.indexOf(level);
    const pips = levels.map((_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
    return `<span class="mc-ev${small ? " sm" : ""}" title="Evidence level: ${esc(level)}" aria-label="Evidence level: ${esc(level)}"><span class="mc-pips" aria-hidden="true">${pips}</span><span class="mc-evt">${esc(level)}</span></span>`;
  }

  function section(title, body, cls){
    return body ? `<section class="mc-sec${cls ? " " + cls : ""}"><h3>${title}</h3>${body}</section>` : "";
  }
  const para = t => t ? `<p>${esc(t)}</p>` : "";
  const placeholder = what => `<p class="mc-todo"><span class="mc-flag">Placeholder</span> ${what}</p>`;

  // The one general line that closes every "Reach out if" section (and the host page may show it elsewhere).
  const CRISIS = "Thoughts of self-harm, severe depression, or a medical emergency: call or text 988, or call 911.";
  function crisisLine(){
    const html = esc(CRISIS).replace("text 988", `text <a href="tel:988">988</a>`).replace("call 911", `call <a href="tel:911">911</a>`);
    return `<p class="mc-crisis">${html}</p>`;
  }
  // a heart held in an open hand
  const CARE_ICON = `<svg class="mc-reach-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 11C9.5 9.2 8 7.9 8 6.3 8 5.1 8.9 4.2 10 4.2c.9 0 1.6.5 2 1.2.4-.7 1.1-1.2 2-1.2 1.1 0 2 .9 2 2.1 0 1.6-1.5 2.9-4 4.7z" fill="currentColor" fill-opacity=".22"/><path d="M3 14h3l3 1h3.2a1.5 1.5 0 0 1 0 3H9"/><path d="M12.2 18l4.6-1.8 2.7-1.4a1.4 1.4 0 0 1 1.5 2.3l-5.6 3.3a3 3 0 0 1-2.3.4L6 19.5H3"/></svg>`;

  function render(m, data){
    const k = typeKey(m.type);
    const stages = (data && data.stages) || m.stages.map(s => s.stage);
    const fits = new Map(m.stages.map(s => [s.stage, s.text]));
    const strip = `<ol class="mc-strip" aria-label="When it fits">${stages.map(s =>
      `<li class="${fits.has(s) ? "on" : ""}"><span>${esc(s)}</span>${fits.has(s) ? "" : `<span class="mc-sr"> (not listed)</span>`}</li>`).join("")}</ol>`;
    const when = strip + `<ul class="mc-when">${m.stages.map(s => `<li><b>${esc(s.stage)}</b> ${esc(s.text)}</li>`).join("")}</ul>`;
    const find = m.find ? `<ul class="mc-find">${m.find.split(/\s*\|\s*/).map(x => `<li>${linked(x)}</li>`).join("")}</ul>` : "";

    return `<article class="mc" style="--mc-c:var(--t-${k}, #6E8B57);--mc-tint:var(--t-${k}-tint, #CFDDBE)">
  <header class="mc-head">
    <div class="mc-tags"><span class="mc-type">${esc(m.type)}</span>${evidenceBadge(m.evidence, data)}</div>
    <h2 tabindex="-1">${esc(m.name)}</h2>
    <p class="mc-def">${esc(m.definition)}</p>
  </header>
  ${section("For the educator: in plain words", para(m.plain), "mc-plain")}
  <div class="mc-two">
    ${section("Who it is for", para(m.who))}
    ${section("What it addresses", para(m.addresses))}
  </div>
  ${section("When it fits", when)}
  ${section("What a session looks like", para(m.session))}
  ${section("Questions a family might ask", m.questions ? qa(m.questions) : "")}
  ${section("How to offer it", m.offer ? `<blockquote>${esc(m.offer)}</blockquote>` : "")}
  ${section("Be careful about", para(m.careful), "mc-care")}
  <div class="mc-path">
    <section class="mc-step"><h3><span class="mc-n">1</span>Explore it yourself</h3>${m.selfHelp ? para(m.selfHelp) : placeholder("Self-help elements are not filled in for this modality yet.")}</section>
    <section class="mc-step"><h3><span class="mc-n">2</span>Go deeper with a practitioner</h3>
      ${m.practitioner ? `<h4>Who can practice it</h4>${para(m.practitioner)}` : ""}
      ${find ? `<h4>Find a practitioner</h4>${find}` : ""}
    </section>
    <section class="mc-step mc-reach"><h3><span class="mc-n">3</span>Reach out if${CARE_ICON}</h3>${m.reachOut ? para(m.reachOut) : placeholder("“Reach out if” is not filled in for this modality yet.")}${crisisLine()}</section>
  </div>
  <div class="mc-roots">
    ${section("Founder or key figures", para(m.founder))}
    ${section("Origin", para(m.origin))}
    ${section("Module 12 source", para(m.source))}
  </div>
</article>`;
  }

  const CSS = `
.mc{display:grid;gap:16px}
.mc,.mc-ev{--mc-surface:var(--surface,#fff);--mc-ink:var(--ink,#2E3A2B);--mc-muted:var(--muted,#5C6655);--mc-line:var(--line,#DEDACB);--mc-bg:var(--bg,#F5F3EC)}
.mc h2{font-family:var(--display,Georgia,serif);font-weight:400;font-size:32px;line-height:1.12;margin:0;text-wrap:balance}
.mc h2:focus{outline:none}
.mc h3{margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--mc-muted);font-weight:700}
.mc h4{margin:6px 0 0;font-size:13px;font-weight:700;color:var(--mc-ink)}
.mc p{margin:0}
.mc-head{display:grid;gap:10px;border-top:6px solid var(--mc-c);padding-top:14px}
.mc-def{font-size:17px}
.mc-tags{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mc-type{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mc-ink);background:var(--mc-tint);border-radius:999px;padding:3px 11px 3px 8px}
.mc-type::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--mc-c)}
.mc-ev{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--mc-ink);border:1px solid var(--mc-line);border-radius:999px;padding:2px 10px 2px 8px;background:var(--mc-surface);white-space:nowrap}
.mc-ev.sm{font-size:11.5px;padding:1px 8px 1px 6px;gap:5px}
.mc-pips{display:inline-flex;gap:2px}
.mc-pips i{width:5px;height:12px;border-radius:2px;background:var(--mc-line)}
.mc-pips i.on{background:var(--mc-ink)}
.mc-ev.sm .mc-pips i{width:4px;height:10px}
.mc-sec{display:grid;gap:6px;align-content:start}
.mc-plain{background:color-mix(in srgb, var(--mc-tint) 55%, var(--mc-surface));border-radius:12px;padding:12px 14px}
.mc-plain p{font-size:16.5px}
.mc-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media (max-width:520px){.mc-two{grid-template-columns:1fr}}
.mc-strip{list-style:none;margin:2px 0 4px;padding:0;display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
.mc-strip li{font-size:11.5px;line-height:1.2;text-align:center;padding:6px 2px;border-radius:6px;border:1px dashed var(--mc-line);color:var(--mc-muted)}
.mc-strip li.on{background:var(--mc-tint);border:2px solid var(--mc-c);color:var(--mc-ink);font-weight:700}
@media (max-width:420px){.mc-strip{grid-template-columns:repeat(3,1fr)}}
.mc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.mc-when{margin:0;padding-left:18px;display:grid;gap:5px}
.mc-when b{font-weight:700}
.mc-qa{margin:0;display:grid;gap:4px}
.mc-qa dt{font-family:var(--display,Georgia,serif);font-size:17px;margin-top:4px}
.mc-qa dd{margin:0 0 4px;color:var(--mc-ink)}
.mc blockquote{margin:0;padding:8px 14px;border-left:3px solid var(--mc-c);font-family:var(--display,Georgia,serif);font-size:17.5px;line-height:1.4}
.mc-care{border:1px solid var(--mc-line);border-radius:12px;padding:12px 14px}
.mc-path{display:grid;gap:10px;margin-top:4px}
.mc-step{display:grid;gap:6px;background:var(--mc-surface);border:1px solid var(--mc-line);border-radius:14px;padding:14px 16px}
.mc-step h3{display:flex;align-items:center;gap:10px;font-family:var(--display,Georgia,serif);font-size:20px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--mc-ink)}
.mc-n{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--mc-tint);color:var(--mc-ink);font-family:var(--body,system-ui,sans-serif);font-size:13px;font-weight:700;flex:none}
.mc-find{margin:0;padding-left:18px;display:grid;gap:5px}
/* Reach out if: a soft warm tint and a small icon, caring rather than alarming */
.mc,.mc-crisis{--mc-warm:var(--care,#EEC5A3)}
.mc-reach{background:color-mix(in srgb, var(--mc-warm) 24%, var(--mc-surface));border-color:color-mix(in srgb, var(--mc-warm) 60%, var(--mc-line))}
.mc-reach .mc-n{background:color-mix(in srgb, var(--mc-warm) 75%, var(--mc-surface))}
.mc-reach-ic{margin-left:auto;width:28px;height:28px;flex:none;color:color-mix(in srgb, #C27257 72%, var(--mc-ink,#2E3A2B))}
.mc-crisis{margin:0;font-size:14.5px;line-height:1.5;border-top:1px dashed color-mix(in srgb, var(--mc-warm) 75%, var(--mc-line,#DEDACB));padding-top:8px;margin-top:2px}
.mc-crisis a{font-weight:700;color:inherit;text-underline-offset:2px}
.mc a{color:var(--mc-ink);text-underline-offset:2px;overflow-wrap:anywhere}
.mc-flag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mc-muted);border:1px dashed var(--mc-muted);border-radius:5px;padding:0 5px;margin-left:4px;line-height:1.6;vertical-align:1px}
.mc-todo{color:var(--mc-muted);font-size:14.5px;border:1px dashed var(--mc-line);border-radius:10px;padding:8px 10px}
.mc-todo .mc-flag{margin:0 4px 0 0}
.mc-roots{display:grid;gap:12px;border-top:1px solid var(--mc-line);padding-top:14px;font-size:14.5px}
.mc-roots p{color:var(--mc-ink)}
`;
  function injectCSS(){
    if (document.getElementById("mc-style")) return;
    const s = document.createElement("style"); s.id = "mc-style"; s.textContent = CSS;
    document.head.prepend(s);   // first, so the host page can override any of it
  }
  if (typeof document !== "undefined") injectCSS();

  window.ModalityCard = {render, evidenceBadge, typeKey, esc, linked, crisisLine, CRISIS, CARE_ICON};
})();
