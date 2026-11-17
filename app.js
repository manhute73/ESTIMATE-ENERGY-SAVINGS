(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const GROUPS = {
    equip:  [{ key: 'equip', title: 'Freezer Equipment', def: 'unknown', opts: [
      ['hfc35', 'HFC / Freon Single and Parallel @ -35F'], ['hfc25', 'HFC / Freon Single and Parallel @ -25F'],
      ['nh3screw25', 'Ammonia Single Stage Screw @ -25F'], ['nh3two35', 'Ammonia Two Stage @ -35F'],
      ['nh3two25', 'Ammonia Two Stage @ -25F'], ['unknown', 'Unknown']] }],
    comp:   [{ key: 'cond', title: 'Condenser Type', opts: [['water', 'Water Condenser'], ['air', 'Air Condenser'], ['unknown', 'Unknown']] },
             { key: 'load', title: 'Compressor Load Control', opts: [['onoff', 'On/Off'], ['slide', 'Slide Valve'], ['vfd', 'Variable Frequency Drive (VFD)'], ['unknown', 'Unknown']] }],
    defrost:[{ key: 'defType', title: 'Defrost Type', opts: [['hotgas', 'Hot Gas Bypass'], ['electric', 'Electric'], ['unknown', 'Unknown']] },
             { key: 'defSched', title: 'Defrost Schedule', opts: [['timer', 'Timers/Schedule'], ['smart', 'Smart/Demand'], ['unknown', 'Unknown']] }],
    solar:  [{ key: 'solar', title: 'Excess Solar PV Generation', opts: [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Unknown']] }]
  };
  const ICONS = ['size', 'equip', 'comp', 'defrost', 'solar', 'rate'];

  // Approx. industrial rates, cents/kWh. PLACEHOLDER: replace with current EIA data.
  const STATES = {AL:['Alabama',7.5],AK:['Alaska',17],AZ:['Arizona',8],AR:['Arkansas',7],CA:['California',17],CO:['Colorado',9],CT:['Connecticut',14],DE:['Delaware',9],FL:['Florida',9],GA:['Georgia',8],HI:['Hawaii',30],ID:['Idaho',7],IL:['Illinois',9],IN:['Indiana',9],IA:['Iowa',8],KS:['Kansas',9],KY:['Kentucky',8],LA:['Louisiana',7],ME:['Maine',12],MD:['Maryland',10],MA:['Massachusetts',16],MI:['Michigan',9],MN:['Minnesota',9],MS:['Mississippi',8],MO:['Missouri',8],MT:['Montana',8],NE:['Nebraska',8],NV:['Nevada',8],NH:['New Hampshire',14],NJ:['New Jersey',12],NM:['New Mexico',8],NY:['New York',9],NC:['North Carolina',8],ND:['North Dakota',8],OH:['Ohio',8],OK:['Oklahoma',7],OR:['Oregon',8],PA:['Pennsylvania',9],RI:['Rhode Island',15],SC:['South Carolina',8],SD:['South Dakota',9],TN:['Tennessee',8],TX:['Texas',7],UT:['Utah',7],VT:['Vermont',12],VA:['Virginia',9],WA:['Washington',6],WV:['West Virginia',8],WI:['Wisconsin',9],WY:['Wyoming',7]};

  const app = $('#app'), errEl = $('#err');
  const S = { step: 0 };           // state
  let activeField = $('#sqft');
  const LAST_WIZARD = 6;

  // ---- build option groups
  Object.entries(GROUPS).forEach(([id, groups]) => {
    const host = $('#g-' + id);
    groups.forEach(g => {
      if (g.def) S[g.key] = g.def;
      const col = document.createElement('div');
      col.innerHTML = `<h3>${g.title}</h3>` + g.opts.map(([v, t]) =>
        `<button type="button" class="opt" role="radio" data-key="${g.key}" data-val="${v}" aria-checked="${S[g.key] === v}"><i></i>${t}</button>`).join('');
      host.appendChild(col);
    });
  });
  document.addEventListener('click', e => {
    const o = e.target.closest('.opt');
    if (!o) return;
    S[o.dataset.key] = o.dataset.val;
    $$(`.opt[data-key="${o.dataset.key}"]`).forEach(b => b.setAttribute('aria-checked', b === o));
    setErr('');
  });

  // ---- sidebar
  $('.side ol').innerHTML = ICONS.map((n, i) => `<li data-i="${i + 1}"><svg><use href="#i-${n}"/></svg></li>`).join('');

  // ---- keypads
  $$('.keypad').forEach(k => {
    const extra = k.dataset.extra;
    const keys = ['1','2','3','4','5','6','7','8','9', extra, '0', 'DEL'];
    k.innerHTML = keys.map(x => `<button type="button" class="${x === 'DEL' ? 'del' : ''}" data-k="${x}">${x}</button>`).join('');
  });
  $$('.fields input').forEach(inp => inp.addEventListener('focus', () => activeField = inp));
  document.addEventListener('click', e => {
    const b = e.target.closest('.keypad button');
    if (!b) return;
    const f = activeField, k = b.dataset.k;
    if (k === 'DEL') f.value = f.value.slice(0, -1);
    else if (k === '-') { if (f.value === '') f.value = '-'; else f.value = f.value.startsWith('-') ? f.value.slice(1) : '-' + f.value; }
    else if (k === '.') { if (!f.value.includes('.')) f.value += f.value ? '.' : '0.'; }
    else if (f.value.length < 8) f.value += k;
    if (f.id === 'rate') $('#state').value = '';
    setErr('');
  });
  $('#rate').addEventListener('input', () => $('#state').value = '');

  // ---- states
  const sel = $('#state');
  Object.entries(STATES).forEach(([c, [n, r]]) => sel.add(new Option(`${n} (${r}¢)`, c)));
  sel.addEventListener('change', () => { if (sel.value) $('#rate').value = STATES[sel.value][1]; setErr(''); });

  // ---- navigation
  function setErr(m) { errEl.textContent = m; }
  function go(n) {
    S.step = n; app.dataset.step = n; setErr('');
    $$('.screen').forEach(s => s.hidden = +s.dataset.screen !== n);
    $$('.side li').forEach(li => li.classList.toggle('on', +li.dataset.i === n));
    $('#next').textContent = n === LAST_WIZARD ? 'Calculate Savings' : 'Next';
    if (n === 1) { activeField = $('#sqft'); }
    if (n === 6) { activeField = $('#rate'); }
    if (n === 7) showResult();
    if (n === 8) showReport();
  }
  function valid(n) {
    if (n === 1) {
      const a = parseFloat($('#sqft').value), t = parseFloat($('#temp').value);
      if (!(a > 0)) return 'Enter the freezer square footage.';
      if (isNaN(t) || t < -100 || t > 60) return 'Enter a temperature set point between -100 and 60 °F.';
      S.sqft = a; S.temp = t;
    }
    const need = { 3: ['cond', 'load'], 4: ['defType', 'defSched'], 5: ['solar'] }[n];
    if (need && need.some(k => !S[k])) return 'Select an option in each column, or choose Unknown.';
    if (n === 6) {
      const r = parseFloat($('#rate').value);
      if (!(r > 0)) return 'Enter a kWh rate or select a state.';
      S.rateCents = r;
    }
    return '';
  }
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { if (+g.dataset.go === 0) resetAll(); go(+g.dataset.go); }
  });
  $('#back').onclick = () => go(S.step - 1);
  $('#next').onclick = () => { const m = valid(S.step); m ? setErr(m) : go(S.step + 1); };

  function resetAll() {
    ['sqft', 'temp', 'rate'].forEach(i => $('#' + i).value = '');
    sel.value = '';
    ['cond', 'load', 'defType', 'defSched', 'solar'].forEach(k => delete S[k]);
    S.equip = 'unknown';
    $$('.opt').forEach(b => b.setAttribute('aria-checked', S[b.dataset.key] === b.dataset.val));
  }

  // ---- results
  let R = null;
  const fmt = n => n.toLocaleString('en-US');
  function showResult() {
    R = VoxCalc.estimate({ sqft: S.sqft, temp: S.temp, equip: S.equip, cond: S.cond, load: S.load,
      defType: S.defType, defSched: S.defSched, solar: S.solar, rateCents: S.rateCents });
    $('#pct').textContent = $('#o-pct').textContent = R.pct + '%';
    $('#o-usd').textContent = '$' + fmt(R.annualUsd) + '*';
    $('#o-base').textContent = '*Based on Estimated Refrigeration kWh/Mo. of ' + fmt(R.monthlyKwh);
    const c = 2 * Math.PI * 44;
    $('#arc').style.transition = 'none'; $('#arc').setAttribute('stroke-dasharray', `0 ${c}`);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $('#arc').style.transition = 'stroke-dasharray 1s ease';
      $('#arc').setAttribute('stroke-dasharray', `${c * R.pct / 100} ${c}`);
    }));
  }
  function showReport() {
    const label = (k, v) => (GROUPS[k === 'equip' ? 'equip' : ''] || [])[0];
    const name = (key, val) => { for (const gs of Object.values(GROUPS)) for (const g of gs) if (g.key === key) return g.opts.find(o => o[0] === val)[1]; };
    const rows = [
      ['Freezer size', fmt(S.sqft) + ' sqft'], ['Temperature set point', S.temp + ' °F'],
      ['Equipment', name('equip', S.equip)], ['Condenser', name('cond', S.cond)], ['Compressor load control', name('load', S.load)],
      ['Defrost type', name('defType', S.defType)], ['Defrost schedule', name('defSched', S.defSched)],
      ['Excess solar PV', name('solar', S.solar)], ['Electricity rate', S.rateCents + ' ¢/kWh'],
      ['Est. refrigeration kWh / month', fmt(R.monthlyKwh)], ['Energy reduction', R.pct + '%'],
      ['Annual estimated savings', '$' + fmt(R.annualUsd)]];
    $('#r-table').innerHTML = rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  }

  go(0);
})();
