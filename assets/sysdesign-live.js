/* ============================================================
   sysdesign-live.js - "The tradeoff board"
   learn-system-design-with-phoebe

   One architecture, four meters, two requirement profiles.

   The lesson is not that more levers are better. It is that
   every lever spends one meter to buy another, and which
   trade is CORRECT depends entirely on the requirement you
   were given. The same lever (streaming) is a mistake under
   one profile and mandatory under the other. Switch profile
   without touching a single lever and watch the verdict flip.

   The arithmetic is a teaching model, not a benchmark of your
   platform. Every constant is written down in
   materials/official-course-map.md so you can argue with it.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- the baseline: Daybreak on day one -------------
     One Postgres. Dashboards query production directly. Cron
     runs the loads. Note that the baseline has the BEST
     freshness in the whole model - it is production - and the
     worst everything else. That is not a bug in the model. */
  var BASE = { lat: 9400, cost: 1180, fresh: 5, blast: 82 };
  var ASSETS = 42;            /* downstream tables, dashboards and models */
  var BLAST_FLOOR = 4;        /* nothing is ever fully isolated */

  var LEVERS = [
    { id: "replica", session: 3, name: "Read replica for analytics",
      eff: "latency x0.55 · cost +$260 · freshness +2 min · blast -6",
      why: "Stop analytics competing with checkout for the same buffer pool. Costs a machine and two minutes of replication lag, and it is the cheapest thing on this board." },
    { id: "warehouse", session: 3, name: "Columnar warehouse, nightly load",
      eff: "latency x0.30 · cost +$420 · freshness -> 1440 min · blast -14",
      why: "Column storage is the single biggest latency lever for analytical queries. It also makes your data a day old, because a nightly load is a nightly load. Read that trade twice." },
    { id: "incremental", session: 4, requires: "warehouse", name: "Incremental micro-batch every 15 min",
      eff: "freshness -> 18 min · cost +$180",
      why: "Load only what changed, fifteen minutes at a time. Needs the warehouse first, and needs every load to be idempotent or a retry doubles your revenue." },
    { id: "cache", session: 3, name: "Pre-aggregated marts",
      eff: "latency x0.35 · cost +$140 · freshness +6 min",
      why: "Compute the aggregate once on write instead of every time on read. The oldest trick on the board, and the one people skip because it feels like cheating." },
    { id: "contracts", session: 2, name: "Data contracts checked in CI",
      eff: "blast -34 · cost +$60",
      why: "The producer's build fails when a column they own changes shape. Biggest blast-radius lever here by a wide margin, and it buys nothing else - no latency, no freshness. Pure insurance." },
    { id: "retries", session: 5, name: "Retries, DLQ and idempotent writes",
      eff: "blast -12 · cost +$90 · freshness +3 min",
      why: "Handles the transient failure: a timeout, a throttle, a node that went away. Does nothing at all for a schema break, which is the failure you will actually get." },
    { id: "orchestrator", session: 4, name: "Dependency-aware orchestrator with SLAs",
      eff: "blast -16 · freshness -4 min · cost +$150",
      why: "Cron knows what time it is. An orchestrator knows what finished. That difference is what lets a failure stop at one branch instead of quietly feeding stale numbers to everything downstream." },
    { id: "stream", session: 3, profileDependent: true, name: "Stream the whole path",
      eff: "freshness -> 1 min · cost +$900 · blast +12 · latency x0.90",
      why: "Correct when the requirement is measured in minutes. Expensive theatre when the requirement is a dashboard somebody opens with coffee. This lever is not a trap and it is not free - it is a question about the requirement." },
    { id: "bigger", session: 1, trap: true, name: "Just buy a bigger box",
      eff: "latency x0.82 · cost +$980",
      why: "The non-design. It buys 18 percent of latency for the largest cost line on the board and moves no other meter at all. Marts buy more than three times as much for a seventh of the money." }
  ];

  var PROFILES = {
    daily: {
      key: "daily", label: "Morning ops dashboard",
      note: "Somebody opens it at 08:40 with coffee. Yesterday's numbers, complete and defensible.",
      budget: { lat: 2000, cost: 2800, fresh: 720, blast: 20 }
    },
    live: {
      key: "live", label: "Minute-level alerting",
      note: "A pager fires when checkout failures cross a threshold. Ten-minute-old data is a ten-minute outage nobody knew about.",
      budget: { lat: 800, cost: 3500, fresh: 5, blast: 20 }
    }
  };

  var METERS = [
    { k: "lat",   label: "p95 dashboard latency", unit: "ms",     fmt: function (v) { return Math.round(v).toLocaleString() + " ms"; } },
    { k: "cost",  label: "Platform cost",         unit: "$/mo",   fmt: function (v) { return "$" + Math.round(v).toLocaleString() + "/mo"; } },
    { k: "fresh", label: "Data freshness",        unit: "min old", fmt: function (v) { return v >= 60 ? (Math.round(v / 60 * 10) / 10) + " hr old" : Math.round(v) + " min old"; } },
    { k: "blast", label: "Blast radius",          unit: "%",      fmt: function (v) { return Math.round(v) + "% of " + ASSETS + " assets"; } }
  ];

  /* ---------- the model ------------------------------------ */
  function compute(on) {
    var lat = BASE.lat, cost = BASE.cost, fresh = BASE.fresh, blast = BASE.blast;

    if (on.replica)     { lat *= 0.55; cost += 260; fresh += 2;  blast -= 6; }
    if (on.warehouse)   { lat *= 0.30; cost += 420; fresh = 1440; blast -= 14; }
    if (on.incremental && on.warehouse) { fresh = 18; cost += 180; }
    if (on.cache)       { lat *= 0.35; cost += 140; fresh += 6; }
    if (on.contracts)   { cost += 60;  blast -= 34; }
    if (on.retries)     { cost += 90;  blast -= 12; fresh += 3; }
    if (on.orchestrator){ cost += 150; blast -= 16; fresh -= 4; }
    if (on.stream)      { fresh = 1;   cost += 900; blast += 12; lat *= 0.90; }
    if (on.bigger)      { lat *= 0.82; cost += 980; }

    return {
      lat: lat,
      cost: cost,
      fresh: Math.max(1, fresh),
      blast: Math.max(BLAST_FLOOR, Math.min(100, blast))
    };
  }

  function meets(m, profile) {
    var b = PROFILES[profile].budget;
    return { lat: m.lat <= b.lat, cost: m.cost <= b.cost, fresh: m.fresh <= b.fresh, blast: m.blast <= b.blast };
  }
  function score(m, profile) {
    var ok = meets(m, profile), n = 0;
    for (var k in ok) if (ok[k]) n++;
    return n;
  }

  /* ---------- the failure drill ----------------------------
     A producer renames order_total to gross_total. This is the
     failure you actually get, and it is not a transient. */
  function breakage(on) {
    var m = compute(on);
    if (on.contracts) {
      return {
        caught: true, broken: 0, stale: 0,
        head: "CI blocked it. Nothing downstream moved.",
        body: "The producer's own build went red with a diff of the contract they broke. They fixed it before it left their branch. This is the entire argument for contracts: the cost lands on the team that can actually fix it, at the moment it is cheapest."
      };
    }
    var broken = Math.max(1, Math.round(m.blast / 100 * ASSETS));
    var stale, detect;
    if (on.orchestrator) { detect = "The orchestrator missed its SLA and paged someone at 04:12."; stale = on.incremental ? 46 : 260; }
    else { detect = "Cron reported success. It ran the job. The job wrote nothing."; stale = on.incremental ? 700 : 1620; }
    return {
      caught: false, broken: broken, stale: stale,
      head: broken + " of " + ASSETS + " downstream assets broke.",
      body: detect + (on.retries
        ? " Retries fired five times and failed five times - a renamed column is not a transient, and retrying a contract break just costs you five identical stack traces."
        : " Nothing retried, because nothing knew.") +
        " The morning dashboard served numbers " + (stale >= 60 ? (Math.round(stale / 60 * 10) / 10) + " hours" : stale + " minutes") + " old, and it did not look broken. That is the part that costs you."
    };
  }

  /* ---------- UI ------------------------------------------- */
  var CSS = [
    "#sysdesign-live{margin:1.6rem 0}",
    ".sl{border:1px solid var(--hairline);border-radius:var(--radius);background:#fff;overflow:hidden}",
    ".sl-head{background:var(--indigo-deep);color:#fff;padding:.85rem 1.1rem;display:flex;gap:.8rem;align-items:center;flex-wrap:wrap}",
    ".sl-head h4{font-size:.95rem;font-weight:800;margin:0;flex:1;min-width:12rem}",
    ".sl-modes{display:flex;gap:.3rem;background:rgba(255,255,255,.14);padding:.22rem;border-radius:999px}",
    ".sl-modes button{border:0;background:transparent;color:#fff;font:700 .76rem Inter,sans-serif;padding:.3rem .8rem;border-radius:999px;cursor:pointer}",
    ".sl-modes button.on{background:var(--amber);color:var(--amber-ink)}",
    ".sl-req{padding:.7rem 1.1rem;background:var(--indigo-50);border-bottom:1px solid var(--hairline);font-size:.83rem;color:var(--ink)}",
    ".sl-req b{color:var(--indigo-deep)}",
    ".sl-body{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}",
    "@media(max-width:760px){.sl-body{grid-template-columns:1fr}}",
    ".sl-levers{padding:.9rem 1.1rem;border-right:1px solid var(--hairline)}",
    "@media(max-width:760px){.sl-levers{border-right:0;border-bottom:1px solid var(--hairline)}}",
    ".sl-levers h5{font-size:.72rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin:0 0 .5rem}",
    ".sl-lv{display:block;padding:.42rem .5rem;border-radius:9px;cursor:pointer;font-size:.85rem;line-height:1.45}",
    ".sl-lv:hover{background:var(--indigo-50)}",
    ".sl-lv input{margin-right:.5rem;accent-color:var(--indigo)}",
    ".sl-lv .eff{display:block;margin-left:1.45rem;font:600 .71rem ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}",
    ".sl-lv.on{background:var(--indigo-50)}",
    ".sl-lv.dep.on{background:var(--amber-50)}",
    ".sl-lv.trap.on{background:#FEF2F2}",
    ".sl-lv.trap.on .eff{color:#991B1B}",
    ".sl-lv.blocked{opacity:.45;cursor:not-allowed}",
    ".sl-why{margin:.15rem 0 .5rem 1.45rem;padding:.5rem .65rem;border-left:3px solid var(--indigo-soft);background:var(--paper);font-size:.79rem;color:var(--muted);border-radius:0 8px 8px 0}",
    ".sl-lv.trap.on + .sl-why{border-left-color:#FCA5A5}",
    ".sl-btns{display:flex;gap:.4rem;margin-top:.7rem;flex-wrap:wrap}",
    ".sl-btns button{border:1px solid var(--hairline);background:#fff;border-radius:999px;padding:.3rem .8rem;font:700 .74rem Inter,sans-serif;color:var(--ink);cursor:pointer}",
    ".sl-btns button:hover{border-color:var(--indigo);color:var(--indigo)}",
    ".sl-read{padding:.9rem 1.1rem;background:var(--paper)}",
    ".sl-m{margin-bottom:.75rem}",
    ".sl-m .mt{display:flex;justify-content:space-between;align-items:baseline;font-size:.79rem;color:var(--muted);font-weight:600}",
    ".sl-m .mv{font:800 1.18rem Inter,sans-serif;color:var(--ink);font-variant-numeric:tabular-nums}",
    ".sl-m .bar{height:9px;border-radius:999px;background:var(--hairline);margin-top:.3rem;overflow:hidden;position:relative}",
    ".sl-m .fill{height:100%;border-radius:999px;background:var(--indigo);transition:width .28s ease,background .28s ease}",
    ".sl-m.over .fill{background:#DC2626}",
    ".sl-m .bud{font:600 .7rem ui-monospace,Menlo,monospace;color:var(--muted)}",
    ".sl-m.over .bud{color:#991B1B}",
    ".sl-verdict{border-top:1px solid var(--hairline);padding:.8rem 1.1rem;font-size:.86rem;line-height:1.6}",
    ".sl-verdict b{font-size:1rem}",
    ".sl-verdict.pass{background:var(--indigo-50);color:var(--indigo-deep)}",
    ".sl-verdict.fail{background:#FEF2F2;color:#991B1B}",
    ".sl-break{border-top:1px solid var(--hairline);padding:.85rem 1.1rem;background:#fff}",
    ".sl-break button{border:1px solid #FCA5A5;background:#FEF2F2;color:#991B1B;border-radius:999px;padding:.4rem 1rem;font:800 .78rem Inter,sans-serif;cursor:pointer}",
    ".sl-break button:hover{background:#991B1B;color:#fff;border-color:#991B1B}",
    ".sl-out{margin-top:.6rem;font-size:.84rem;line-height:1.65;display:none}",
    ".sl-out.show{display:block}",
    ".sl-out .oh{font-weight:800;margin-bottom:.2rem}",
    ".sl-out.ok .oh{color:var(--indigo-deep)}",
    ".sl-out.bad .oh{color:#991B1B}",
    ".sl-foot{border-top:1px solid var(--hairline);padding:.6rem 1.1rem;font-size:.74rem;color:var(--muted);background:var(--paper)}"
  ].join("");

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function mount(host) {
    var st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    var on = {}, profile = "daily";
    LEVERS.forEach(function (l) { on[l.id] = false; });

    var shell = el("div", "sl");

    var head = el("div", "sl-head");
    head.appendChild(el("h4", null, "The tradeoff board · Daybreak platform"));
    var modes = el("div", "sl-modes");
    var bDaily = el("button", "on", "Morning dashboard");
    var bLive = el("button", null, "Minute alerting");
    modes.appendChild(bDaily); modes.appendChild(bLive);
    head.appendChild(modes);
    shell.appendChild(head);

    var req = el("div", "sl-req");
    shell.appendChild(req);

    var body = el("div", "sl-body");
    var left = el("div", "sl-levers");
    left.appendChild(el("h5", null, "Architecture decisions"));

    var rows = {};
    LEVERS.forEach(function (l) {
      var lab = el("label", "sl-lv" + (l.trap ? " trap" : "") + (l.profileDependent ? " dep" : ""));
      var cb = document.createElement("input");
      cb.type = "checkbox";
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(l.name));
      lab.appendChild(el("span", "eff", l.eff + " · session " + l.session));
      var why = el("div", "sl-why", l.why);
      why.style.display = "none";
      left.appendChild(lab);
      left.appendChild(why);
      rows[l.id] = { lab: lab, cb: cb, why: why, def: l };
      cb.addEventListener("change", function () {
        on[l.id] = cb.checked;
        paint();
      });
    });

    var btns = el("div", "sl-btns");
    var bAll = el("button", null, "Switch every design lever on");
    var bNone = el("button", null, "Back to day one");
    btns.appendChild(bAll); btns.appendChild(bNone);
    left.appendChild(btns);
    body.appendChild(left);

    var read = el("div", "sl-read");
    var meterEls = {};
    METERS.forEach(function (mt) {
      var wrap = el("div", "sl-m");
      var top = el("div", "mt");
      top.appendChild(el("span", null, mt.label));
      var bud = el("span", "bud");
      top.appendChild(bud);
      var val = el("div", "mv");
      var bar = el("div", "bar");
      var fill = el("div", "fill");
      bar.appendChild(fill);
      wrap.appendChild(top); wrap.appendChild(val); wrap.appendChild(bar);
      read.appendChild(wrap);
      meterEls[mt.k] = { wrap: wrap, val: val, fill: fill, bud: bud, def: mt };
    });
    body.appendChild(read);
    shell.appendChild(body);

    var verdict = el("div", "sl-verdict");
    shell.appendChild(verdict);

    var brk = el("div", "sl-break");
    var bBreak = el("button", null, "Ship a schema change upstream");
    brk.appendChild(bBreak);
    brk.appendChild(el("span", null, "  A producer renames order_total to gross_total on a Tuesday."))
      .style.cssText = "font-size:.8rem;color:var(--muted);margin-left:.5rem";
    var out = el("div", "sl-out");
    brk.appendChild(out);
    shell.appendChild(brk);

    shell.appendChild(el("div", "sl-foot",
      "A teaching model, not a benchmark. Every constant is listed in materials/official-course-map.md. The point is the shape of the trade, not the digits."));

    host.appendChild(shell);

    function paint() {
      var p = PROFILES[profile];
      req.innerHTML = "";
      req.appendChild(el("b", null, "The requirement: " + p.label + ". "));
      req.appendChild(document.createTextNode(p.note + " Budget: " +
        "p95 under " + p.budget.lat.toLocaleString() + " ms, cost under $" + p.budget.cost.toLocaleString() + "/mo, " +
        "data under " + (p.budget.fresh >= 60 ? (p.budget.fresh / 60) + " hr" : p.budget.fresh + " min") + " old, " +
        "blast radius under " + p.budget.blast + " percent."));

      /* incremental depends on the warehouse existing */
      var incBlocked = !on.warehouse;
      rows.incremental.lab.classList.toggle("blocked", incBlocked);
      rows.incremental.cb.disabled = incBlocked;
      if (incBlocked && on.incremental) { on.incremental = false; rows.incremental.cb.checked = false; }

      LEVERS.forEach(function (l) {
        var r = rows[l.id];
        r.lab.classList.toggle("on", !!on[l.id]);
        r.why.style.display = on[l.id] ? "block" : "none";
      });

      var m = compute(on), ok = meets(m, profile), n = score(m, profile);

      METERS.forEach(function (mt) {
        var e = meterEls[mt.k], v = m[mt.k], b = p.budget[mt.k];
        e.val.textContent = mt.fmt(v);
        e.bud.textContent = "budget " + mt.fmt(b);
        var pct = Math.min(100, v / b * 100);
        e.fill.style.width = pct.toFixed(1) + "%";
        e.wrap.classList.toggle("over", !ok[mt.k]);
      });

      verdict.className = "sl-verdict " + (n === 4 ? "pass" : "fail");
      verdict.innerHTML = "";
      verdict.appendChild(el("b", null, "Meets " + n + " of 4 budgets. "));
      verdict.appendChild(document.createTextNode(
        n === 4 ? "This architecture is correct for this requirement. Switch the requirement at the top without touching a single lever and read it again."
          : "Whatever you switch on next has to fix " + (4 - n) + " " + (4 - n === 1 ? "meter" : "meters") + " without breaking the ones already inside budget. That constraint is the job."));

      out.classList.remove("show");
      expose(m, n);
    }

    /* One stable object, mutated in place - a caller that grabs a reference
       must keep seeing live values after a repaint. */
    var api = {
      state: on, profile: profile, meters: null, score: 0,
      set: function (id, v) { on[id] = v; if (rows[id]) rows[id].cb.checked = !!v; paint(); },
      setAll: function () { bAll.click(); },
      reset: function () { bNone.click(); },
      setProfile: function (k) { (k === "live" ? bLive : bDaily).click(); },
      breakage: function () { return breakage(on); },
      compute: compute, LEVERS: LEVERS, PROFILES: PROFILES
    };
    window.SYS_LIVE = api;

    function expose(m, n) {
      api.profile = profile;
      api.meters = m;
      api.score = n;
    }

    bDaily.addEventListener("click", function () {
      profile = "daily"; bDaily.classList.add("on"); bLive.classList.remove("on"); paint();
    });
    bLive.addEventListener("click", function () {
      profile = "live"; bLive.classList.add("on"); bDaily.classList.remove("on"); paint();
    });
    bAll.addEventListener("click", function () {
      LEVERS.forEach(function (l) {
        var v = !l.trap && !l.profileDependent;
        on[l.id] = v; rows[l.id].cb.checked = v;
      });
      on.incremental = true; rows.incremental.cb.checked = true;
      paint();
    });
    bNone.addEventListener("click", function () {
      LEVERS.forEach(function (l) { on[l.id] = false; rows[l.id].cb.checked = false; });
      paint();
    });
    bBreak.addEventListener("click", function () {
      var b = breakage(on);
      out.className = "sl-out show " + (b.caught ? "ok" : "bad");
      out.innerHTML = "";
      out.appendChild(el("div", "oh", (b.caught ? "✓ " : "✗ ") + b.head));
      out.appendChild(el("div", null, b.body));
    });

    paint();
  }

  if (typeof document !== "undefined") {
    var host = document.getElementById("sysdesign-live");
    if (host) mount(host);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { compute: compute, meets: meets, score: score, breakage: breakage, LEVERS: LEVERS, PROFILES: PROFILES, BASE: BASE, ASSETS: ASSETS };
  }
})();
