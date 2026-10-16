(function () {
  "use strict";

  const VAT = 1.25;
  const fmt = new Intl.NumberFormat("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const kr = (n) => fmt.format(n) + " kr.";

  // Flad datastrukturen ud til én liste
  const products = [];
  window.PRICE_SECTIONS.forEach((s) => {
    s.items.forEach(([sku, name, size, ean, pp, rrp]) => {
      const net = rrp ? rrp / VAT : null;
      products.push({
        sku, name, size, ean, pp, rrp,
        type: s.type, group: s.group, cat: s.cat,
        sizeNum: parseFloat(String(size).replace(",", ".")) || 0,
        margin: net ? (net - pp) / net : null,
        haystack: norm([sku, name, ean, s.cat, s.group, s.type].join(" ")),
      });
    });
  });

  function norm(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function highlight(text, tokens) {
    if (!tokens.length) return esc(text);
    const n = norm(text);
    const marks = new Array(text.length).fill(false);
    tokens.forEach((t) => {
      let i = n.indexOf(t);
      while (t && i !== -1) {
        for (let k = i; k < i + t.length; k++) marks[k] = true;
        i = n.indexOf(t, i + t.length);
      }
    });
    let out = "", open = false;
    for (let i = 0; i < text.length; i++) {
      if (marks[i] && !open) { out += "<mark>"; open = true; }
      if (!marks[i] && open) { out += "</mark>"; open = false; }
      out += esc(text[i]);
    }
    return out + (open ? "</mark>" : "");
  }

  // Elementer
  const $ = (id) => document.getElementById(id);
  const q = $("q"), groupSel = $("group"), catSel = $("cat"), tbody = $("tbody");
  const typeBtns = [...document.querySelectorAll("#type-filter button")];
  const resetBtn = $("reset"), empty = $("empty"), tableWrap = document.querySelector(".table-wrap");

  const state = { q: "", type: "", group: "", cat: "", sort: null, dir: 1 };

  // Læs evt. tilstand fra URL (så et link kan deles med søgningen)
  const params = new URLSearchParams(location.search);
  ["q", "type", "group", "cat"].forEach((k) => { if (params.get(k)) state[k] = params.get(k); });

  const unique = (arr) => [...new Set(arr)];
  unique(products.map((p) => p.group)).forEach((g) => groupSel.add(new Option(g, g)));

  function fillCats() {
    const pool = products.filter((p) => (!state.type || p.type === state.type) && (!state.group || p.group === state.group));
    const cats = unique(pool.map((p) => p.cat));
    if (state.cat && !cats.includes(state.cat)) state.cat = "";
    catSel.length = 1;
    cats.forEach((c) => catSel.add(new Option(c, c)));
    catSel.value = state.cat;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    ["q", "type", "group", "cat"].forEach((k) => state[k] && p.set(k, state[k]));
    const s = p.toString();
    history.replaceState(null, "", s ? "?" + s : location.pathname);
  }

  function render() {
    const tokens = norm(state.q).split(/\s+/).filter(Boolean);
    let list = products.filter((p) =>
      (!state.type || p.type === state.type) &&
      (!state.group || p.group === state.group) &&
      (!state.cat || p.cat === state.cat) &&
      tokens.every((t) => p.haystack.includes(t))
    );

    if (state.sort) {
      const k = state.sort, d = state.dir;
      list = list.slice().sort((a, b) => {
        const av = a[k], bv = b[k];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (typeof av === "string" ? av.localeCompare(bv, "da", { numeric: true }) : av - bv) * d;
      });
    }

    // KPI'er
    $("kpi-count").textContent = list.length;
    $("kpi-count-sub").textContent = "af " + products.length + " i alt";
    $("kpi-cats").textContent = unique(list.map((p) => p.type + p.group + p.cat)).length;
    $("kpi-avg").textContent = list.length ? kr(list.reduce((s, p) => s + p.pp, 0) / list.length) : "–";
    const withM = list.filter((p) => p.margin != null);
    $("kpi-margin").textContent = withM.length
      ? Math.round((withM.reduce((s, p) => s + p.margin, 0) / withM.length) * 100) + " %"
      : "–";

    $("result-count").textContent = list.length === products.length
      ? "Viser alle " + list.length + " produkter"
      : "Viser " + list.length + " af " + products.length + " produkter";

    resetBtn.hidden = !(state.q || state.type || state.group || state.cat || state.sort);
    empty.hidden = list.length > 0;
    tableWrap.hidden = list.length === 0;

    // Gruppér efter sektion, når der ikke er valgt en sortering
    let html = "", lastKey = null;
    const counts = {};
    if (!state.sort) list.forEach((p) => { const k = p.type + "|" + p.group + "|" + p.cat; counts[k] = (counts[k] || 0) + 1; });

    list.forEach((p) => {
      const key = p.type + "|" + p.group + "|" + p.cat;
      if (!state.sort && key !== lastKey) {
        html += `<tr class="group-row"><td colspan="7">${esc(p.type === "Spa" ? "Spa Professionals" : p.type)} · ${esc(p.group)} · ${esc(p.cat)}<span class="group-count">${counts[key]}</span></td></tr>`;
        lastKey = key;
      }
      html += `<tr>
        <td class="c-sku"><button class="copy sku" data-copy="${esc(p.sku)}" title="Kopiér SKU">${highlight(p.sku, tokens)}</button></td>
        <td class="c-name"><div class="name">${highlight(p.name, tokens)}</div>
          <div class="meta"><span class="tag tag-${p.type}">${p.type}</span><span>${esc(p.cat)}</span></div></td>
        <td class="c-size size">${esc(p.size)}</td>
        <td class="c-ean col-ean">${p.ean ? `<button class="copy ean" data-copy="${esc(p.ean)}" title="Kopiér stregkode">${highlight(p.ean, tokens)}</button>` : '<span class="dash">–</span>'}</td>
        <td class="c-pp num pp">${kr(p.pp)}</td>
        <td class="c-rrp num">${p.rrp ? kr(p.rrp) : '<span class="dash">–</span>'}</td>
        <td class="c-margin num">${p.margin != null ? `<span class="margin">${Math.round(p.margin * 100)} %</span>` : '<span class="dash">–</span>'}</td>
      </tr>`;
    });
    tbody.innerHTML = html;

    document.querySelectorAll("thead th").forEach((th) => {
      if (th.dataset.sort === state.sort) th.setAttribute("aria-sort", state.dir === 1 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    });
    syncUrl();
  }

  // Hændelser
  let t;
  q.value = state.q;
  q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value.trim(); render(); }, 80); });

  typeBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.type === state.type);
    b.addEventListener("click", () => {
      state.type = b.dataset.type;
      typeBtns.forEach((x) => x.classList.toggle("active", x === b));
      fillCats(); render();
    });
  });

  groupSel.value = state.group;
  groupSel.addEventListener("change", () => { state.group = groupSel.value; fillCats(); render(); });
  catSel.addEventListener("change", () => { state.cat = catSel.value; render(); });

  document.querySelectorAll("thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (state.sort !== k) { state.sort = k; state.dir = 1; }
      else if (state.dir === 1) state.dir = -1;
      else state.sort = null;
      render();
    });
  });

  resetBtn.addEventListener("click", () => {
    Object.assign(state, { q: "", type: "", group: "", cat: "", sort: null, dir: 1 });
    q.value = ""; groupSel.value = "";
    typeBtns.forEach((x) => x.classList.toggle("active", x.dataset.type === ""));
    fillCats(); render(); q.focus();
  });

  // "/" fokuserer søgefeltet, Escape rydder
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== q && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); q.focus(); q.select();
    }
    if (e.key === "Escape" && document.activeElement === q && q.value) {
      q.value = ""; state.q = ""; render();
    }
  });

  // Kopiér SKU / stregkode
  const toast = $("toast");
  let tt;
  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast.textContent = "Kopieret: " + btn.dataset.copy;
    } catch {
      toast.textContent = "Kunne ikke kopiere";
    }
    toast.classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(() => toast.classList.remove("show"), 1600);
  });

  fillCats();
  render();
})();
