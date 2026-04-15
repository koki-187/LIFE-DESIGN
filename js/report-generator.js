/**
 * ReportGenerator - html2pdf.js ベースのPDFレポート生成モジュール
 * Japanese text is rendered via browser fonts (Noto Sans JP / Yu Gothic)
 * CDN: https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js
 *
 * Note: Psychology/behavioral analysis data is intentionally EXCLUDED.
 *       This report is client-facing; psychology data is for internal use only.
 */
var ReportGenerator = (function () {
  'use strict';

  var RG = {};

  /* ------------------------------------------------------------------ */
  /* Formatting helpers                                                   */
  /* ------------------------------------------------------------------ */
  function _fmt(n) { return (n || 0).toLocaleString('ja-JP'); }
  function _man(n) { return Math.round((n || 0) / 10000).toLocaleString('ja-JP') + '万円'; }
  function _yen(n) { return (n || 0).toLocaleString('ja-JP') + '円'; }
  function _pct(n) { return (n || 0).toFixed(1) + '%'; }
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------------------------------------------ */
  /* No-op font init (html2pdf uses browser fonts)                        */
  /* ------------------------------------------------------------------ */
  RG.initFont = function () { return Promise.resolve(); };

  /* ------------------------------------------------------------------ */
  /* Inline CSS                                                           */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap");',
    '.report-wrap { font-family: "Noto Sans JP", "Yu Gothic", "\u6e38\u30b4\u30b7\u30c3\u30af", sans-serif; margin:0; padding:0; }',
    '.a4-page { width:210mm; min-height:297mm; padding:15mm 18mm; background:#fff; box-sizing:border-box;',
    '  page-break-after:always; position:relative; overflow:hidden; }',
    '.page-break { page-break-before:always; }',
    '.navy { color:#1a237e; } .gold { color:#c9a84c; }',
    '.page-header { background:#1a237e; color:white; padding:8mm 18mm; margin:-15mm -18mm 8mm; }',
    '.page-header .logo-line { font-size:9pt; letter-spacing:3px; color:#c9a84c; font-weight:700; }',
    '.page-header .page-title { font-size:14pt; font-weight:700; margin-top:2mm; }',
    '.page-footer { position:absolute; bottom:8mm; left:18mm; right:18mm; font-size:8pt; color:#999;',
    '  border-top:1px solid #e0e0e0; padding-top:3mm; display:flex; justify-content:space-between; }',
    '.info-table { width:100%; border-collapse:collapse; margin:4mm 0; font-size:10pt; }',
    '.info-table th { background:#1a237e; color:white; padding:3mm 4mm; text-align:left; font-weight:500; width:35%; }',
    '.info-table td { padding:3mm 4mm; border-bottom:1px solid #e8e8e8; }',
    '.info-table tr:nth-child(even) td { background:#f8f9ff; }',
    '.compare-table { width:100%; border-collapse:collapse; font-size:9pt; }',
    '.compare-table th { background:#1a237e; color:white; padding:2.5mm 3mm; text-align:center; }',
    '.compare-table td { padding:2.5mm 3mm; border:1px solid #e0e0e0; text-align:center; }',
    '.compare-table tr:nth-child(even) td { background:#f8f9ff; }',
    '.compare-table td:first-child { text-align:left; font-weight:500; }',
    '.result-card { background:#f8f9ff; border-left:4px solid #1a237e; padding:4mm; margin:3mm 0; border-radius:2mm; }',
    '.result-card.gold-card { border-left-color:#c9a84c; background:#fffdf5; }',
    '.result-card.success { border-left-color:#2e7d32; background:#f1f8f1; }',
    '.highlight-box { background:#1a237e; color:white; padding:5mm; border-radius:3mm; margin:3mm 0; }',
    '.highlight-box .amount { font-size:22pt; font-weight:700; color:#c9a84c; }',
    '.kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:3mm; margin:4mm 0; }',
    '.kpi-card { background:#f8f9ff; border:1px solid #e0e0e0; padding:3mm; text-align:center; border-radius:2mm; }',
    '.kpi-card .kpi-value { font-size:16pt; font-weight:700; color:#1a237e; }',
    '.kpi-card .kpi-label { font-size:8pt; color:#666; margin-top:1mm; }',
    '.risk-safe { color:#2e7d32; font-weight:700; }',
    '.risk-moderate { color:#f57f17; font-weight:700; }',
    '.risk-risky { color:#c62828; font-weight:700; }',
    '.section-title { font-size:12pt; font-weight:700; color:#1a237e; border-bottom:2px solid #c9a84c;',
    '  padding-bottom:2mm; margin:6mm 0 4mm; }',
    '.recommendation-list { padding-left:5mm; }',
    '.recommendation-list li { margin:2mm 0; font-size:10pt; line-height:1.6; }',
    '.timeline-item { display:flex; align-items:flex-start; margin:3mm 0; }',
    '.timeline-dot { width:8mm; height:8mm; background:#1a237e; border-radius:50%; flex-shrink:0;',
    '  display:flex; align-items:center; justify-content:center; color:white; font-size:8pt;',
    '  font-weight:700; margin-right:4mm; margin-top:1mm; }',
    '.timeline-content { flex:1; }',
    '.two-col { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }',
    '.progress-bar-wrap { background:#e0e0e0; border-radius:2mm; height:5mm; margin:2mm 0; }',
    '.progress-bar-fill { background:#1a237e; border-radius:2mm; height:5mm; }',
    '.gold-row td { background:#fffdf5 !important; font-weight:700; color:#c9a84c; }',
    '.disclaimer-box { background:#f5f5f5; border:1px solid #e0e0e0; padding:5mm; border-radius:2mm;',
    '  font-size:8pt; color:#666; line-height:1.7; margin:4mm 0; }',
    '.sign-table { width:100%; border-collapse:collapse; font-size:9pt; margin-top:4mm; }',
    '.sign-table td { border:1px solid #ccc; padding:3mm 4mm; height:10mm; }',
    '.sign-table th { background:#f0f0f0; padding:3mm 4mm; border:1px solid #ccc; font-weight:500; width:25%; }',
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /* Page 1: Cover Page                                                   */
  /* ------------------------------------------------------------------ */
  function _page1(d) {
    var name = _esc(d.clientName || '\u304a\u5ba2\u69d8');
    var date = _esc(d.reportDate || new Date().toLocaleDateString('ja-JP'));
    return [
      '<div class="a4-page" style="background:linear-gradient(160deg,#0d1642 60%,#1a237e 100%);',
      '  display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">',
      '  <div style="position:absolute;top:0;left:0;right:0;height:4mm;',
      '    background:linear-gradient(90deg,#c9a84c,#d4b96a,#c9a84c);"></div>',
      '  <div style="margin-bottom:12mm;">',
      '    <div style="font-size:9pt;letter-spacing:6px;color:#c9a84c;text-transform:uppercase;margin-bottom:2mm;">AFP Life Planning</div>',
      '    <div style="font-size:28pt;font-weight:700;color:white;letter-spacing:4px;line-height:1.2;">LIFE DESIGN</div>',
      '    <div style="font-size:28pt;font-weight:700;color:#c9a84c;letter-spacing:8px;">PARTNER</div>',
      '    <div style="width:60mm;height:0.5mm;background:#c9a84c;margin:4mm auto;"></div>',
      '    <div style="font-size:11pt;color:#aab0cc;letter-spacing:2px;">\u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30fb\u30ec\u30dd\u30fc\u30c8</div>',
      '  </div>',
      '  <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(201,168,76,0.4);',
      '    padding:8mm 20mm;border-radius:3mm;margin:8mm 0;">',
      '    <div style="font-size:9pt;color:#c9a84c;letter-spacing:2px;margin-bottom:3mm;">\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u69d8</div>',
      '    <div style="font-size:22pt;font-weight:700;color:white;">' + name + ' \u69d8</div>',
      '  </div>',
      '  <div style="margin-top:8mm;color:#aab0cc;font-size:9pt;">' + date + '</div>',
      '  <div style="margin-top:2mm;color:rgba(170,176,204,0.6);font-size:8pt;">\u672c\u8cc7\u6599\u306f\u304a\u5ba2\u69d8\u5c02\u7528\u306e\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u30cb\u30f3\u30b0\u8cc7\u6599\u3067\u3059</div>',
      '  <div style="position:absolute;bottom:0;left:0;right:0;height:4mm;',
      '    background:linear-gradient(90deg,#c9a84c,#d4b96a,#c9a84c);"></div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page 2: Life Plan Overview                                           */
  /* ------------------------------------------------------------------ */
  function _page2(d) {
    var cs = d.clientSummary || {};
    var ls = d.lifeStage || {};
    var needs = ls.housingNeeds || [];
    var age = cs.age || '\u2014';

    var events = [
      { label: '\u73fe\u5728', desc: _esc(cs.currentHousing || '\u73fe\u5c45\u4f4f\u4e2d') },
      { label: '+5\u5e74', desc: '\u751f\u6d3b\u57fa\u76e4\u306e\u5b89\u5b9a' },
      { label: '+10\u5e74', desc: '\u4f4f\u5b85\u53d6\u5f97\u30fb\u8cc7\u7523\u5f62\u6210' },
      { label: '\u4f4f\u5b85\u53d6\u5f97', desc: _esc(cs.purpose || '\u4e0d\u52d5\u7523\u8cfc\u5165\u691c\u8a0e') },
      { label: '\u5b50\u80b2\u3066\u5b8c\u4e86', desc: '\u6559\u80b2\u8cbb\u8ca0\u62c5\u306e\u7d42\u4e86' },
      { label: '\u8001\u5f8c\u6e96\u5099', desc: '\u8cc7\u7523\u6700\u5927\u5316\u30d5\u30a7\u30fc\u30ba' },
      { label: '\u5b9a\u5e74', desc: '\u5e74\u91d1\u30fb\u8001\u5f8c\u751f\u6d3b\u30b9\u30bf\u30fc\u30c8' },
    ];

    var timelineHtml = events.map(function (ev, i) {
      return [
        '<div class="timeline-item">',
        '  <div class="timeline-dot">' + (i + 1) + '</div>',
        '  <div class="timeline-content">',
        '    <strong>' + ev.label + '</strong> \u2014 ' + ev.desc,
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    var needsHtml = needs.length
      ? needs.map(function (n) { return '<li>' + _esc(n) + '</li>'; }).join('')
      : '<li>\u3054\u5e0c\u671b\u30a8\u30ea\u30a2\u3067\u306e\u7269\u4ef6\u63a2\u3057</li><li>\u8cc7\u7523\u5f62\u6210\u3068\u4f4f\u5c45\u8cbb\u306e\u30d0\u30e9\u30f3\u30b9</li><li>\u5c06\u6765\u306e\u5bb6\u65cf\u69cb\u6210\u306b\u5bfe\u5fdc\u3057\u305f\u4f4f\u307e\u3044</li>';

    var marital = cs.maritalStatus || '\u2014';
    var children = cs.children != null ? cs.children + '\u4eba' : '\u2014';

    return [
      '<div class="page-break"></div>',
      '<div class="a4-page">',
      '  <div class="page-header">',
      '    <div class="logo-line">AFP LIFE PLANNING</div>',
      '    <div class="page-title">\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u6982\u8981</div>',
      '  </div>',
      '  <div class="section-title">\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb</div>',
      '  <table class="info-table">',
      '    <tr><th>\u6c0f\u540d</th><td>' + _esc(d.clientName || '\u2014') + ' \u69d8</td></tr>',
      '    <tr><th>\u5e74\u9f62</th><td>' + _esc(age) + ' \u6b73</td></tr>',
      '    <tr><th>\u3054\u8077\u696d</th><td>' + _esc(cs.occupation || '\u2014') + '</td></tr>',
      '    <tr><th>\u3054\u5bb6\u65cf\u69cb\u6210</th><td>' + _esc(marital) + '\u30fb\u304a\u5b50\u69d8 ' + children + '</td></tr>',
      '    <tr><th>\u73fe\u5728\u306e\u304a\u4f4f\u307e\u3044</th><td>' + _esc(cs.currentHousing || '\u2014') + '</td></tr>',
      '    <tr><th>\u3054\u691c\u8a0e\u5185\u5bb9</th><td>' + _esc(cs.purpose || '\u2014') + '</td></tr>',
      '    <tr><th>\u5e0c\u671b\u30a8\u30ea\u30a2</th><td>' + _esc(cs.desiredArea || '\u2014') + '</td></tr>',
      '  </table>',
      '  <div class="section-title">\u30e9\u30a4\u30d5\u30b9\u30c6\u30fc\u30b8\u8a3a\u65ad</div>',
      '  <div class="result-card gold-card">',
      '    <strong>' + _esc(ls.stage || '\u2014') + '</strong>',
      '    <div style="margin-top:2mm;font-size:10pt;">' + _esc(ls.stageDescription || '') + '</div>',
      '  </div>',
      '  <div class="section-title">\u91cd\u8981\u30e9\u30a4\u30d5\u30a4\u30d9\u30f3\u30c8\u4e00\u89a7</div>',
      timelineHtml,
      '  <div class="section-title">\u4f4f\u307e\u3044\u306e\u30cb\u30fc\u30ba</div>',
      '  <ul class="recommendation-list">' + needsHtml + '</ul>',
      '  <div class="page-footer">',
      '    <span>LIFE DESIGN PARTNER \u2014 \u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8</span>',
      '    <span>2 / 6</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page 3: Income / Affordability Analysis                              */
  /* ------------------------------------------------------------------ */
  function _page3(d) {
    var ie = d.incomeExpenseSummary || {};
    var af = d.affordabilityResult || {};
    var guideline = d.guideline || {};

    var netIncome = ie.monthlyNetIncome || 0;
    var totalExp = ie.monthlyTotalExpense || 0;
    var surplus = ie.monthlySurplus || 0;
    var savingsRate = ie.savingsRate || 0;
    var barWidth = Math.min(Math.max(savingsRate, 0), 100).toFixed(1);

    var riskClass = 'risk-safe';
    if (af.riskLevel === 'moderate') { riskClass = 'risk-moderate'; }
    if (af.riskLevel === 'risky') { riskClass = 'risk-risky'; }

    return [
      '<div class="page-break"></div>',
      '<div class="a4-page">',
      '  <div class="page-header">',
      '    <div class="logo-line">AFP LIFE PLANNING</div>',
      '    <div class="page-title">\u53ce\u652f\u30fb\u4f4f\u5b85\u53d6\u5f97\u529b\u5206\u6790</div>',
      '  </div>',
      '  <div class="two-col">',
      '    <div>',
      '      <div class="section-title">\u53ce\u652f\u8a3a\u65ad</div>',
      '      <div class="kpi-grid">',
      '        <div class="kpi-card"><div class="kpi-value">' + _man(netIncome) + '</div><div class="kpi-label">\u6708\u53ce\u624b\u53d6\u308a</div></div>',
      '        <div class="kpi-card"><div class="kpi-value">' + _man(totalExp) + '</div><div class="kpi-label">\u6708\u9593\u652f\u51fa</div></div>',
      '        <div class="kpi-card"><div class="kpi-value">' + _man(surplus) + '</div><div class="kpi-label">\u6708\u9593\u4f59\u5270</div></div>',
      '      </div>',
      '      <div style="margin:3mm 0;">',
      '        <div style="font-size:9pt;color:#555;margin-bottom:1mm;">\u8caf\u84c4\u7387: ' + _pct(savingsRate) + '</div>',
      '        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + barWidth + '%;"></div></div>',
      '      </div>',
      '      <div class="result-card" style="font-size:9pt;">' + _esc(ie.diagnosis || '\u53ce\u652f\u306f\u6982\u306d\u826f\u597d\u3067\u3059\u3002') + '</div>',
      '    </div>',
      '    <div>',
      '      <div class="section-title">\u4f4f\u5b85\u53d6\u5f97\u529b</div>',
      '      <div class="highlight-box">',
      '        <div style="font-size:9pt;margin-bottom:2mm;">\u63a8\u5968\u501f\u5165\u984d</div>',
      '        <div class="amount">' + _man(af.recommendedLoanAmount) + '</div>',
      '      </div>',
      '      <div class="kpi-grid">',
      '        <div class="kpi-card"><div class="kpi-value" style="font-size:12pt;">' + _man(af.maxLoanAmount) + '</div><div class="kpi-label">\u501f\u5165\u4e0a\u9650\u984d</div></div>',
      '        <div class="kpi-card"><div class="kpi-value" style="font-size:12pt;">' + _man(af.maxMonthlyPayment) + '</div><div class="kpi-label">\u6708\u3005\u8fd4\u6e08\u76ee\u5b89</div></div>',
      '        <div class="kpi-card"><div class="kpi-value" style="font-size:12pt;">' + _pct(af.housingCostRatio) + '</div><div class="kpi-label">\u4f4f\u5c45\u8cbb\u6bd4\u7387</div></div>',
      '      </div>',
      '      <div style="margin:2mm 0;font-size:10pt;">\u30ea\u30b9\u30af\u5224\u5b9a: <span class="' + riskClass + '">' + _esc(af.riskLevelJa || af.riskLevel || '\u2014') + '</span></div>',
      '      <div style="font-size:9pt;color:#555;margin:2mm 0;">' + _esc(af.explanation || '') + '</div>',
      '      <div class="section-title" style="margin-top:4mm;">\u5e74\u53ce\u5225\u30ac\u30a4\u30c9\u30e9\u30a4\u30f3</div>',
      '      <table class="info-table">',
      '        <tr><th>\u63a8\u5968\u8cc3\u6599/\u6708</th><td>' + _man(guideline.recommendedRent) + '</td></tr>',
      '        <tr><th>\u63a8\u5968\u30ed\u30fc\u30f3/\u6708</th><td>' + _man(guideline.recommendedMortgage) + '</td></tr>',
      '        <tr><th>\u7406\u60f3\u6bd4\u7387</th><td>' + _pct(guideline.idealRatio) + '</td></tr>',
      '      </table>',
      '    </div>',
      '  </div>',
      '  <div class="page-footer">',
      '    <span>LIFE DESIGN PARTNER \u2014 \u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8</span>',
      '    <span>3 / 6</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page 4: Asset Formation Simulation                                   */
  /* ------------------------------------------------------------------ */
  function _page4(d) {
    var proj = d.lifeplanProjection || [];
    var cs = d.clientSummary || {};
    var currentAge = cs.age || 30;
    var retirementAge = 65;

    var retRow = null;
    proj.forEach(function (r) { if (r.age === retirementAge) { retRow = r; } });
    if (!retRow && proj.length) { retRow = proj[proj.length - 1]; }

    var firstRow = proj[0] || {};
    var currentNetWorth = firstRow.netWorth || 0;
    var retNetWorth = retRow ? (retRow.netWorth || 0) : 0;
    var monthlyRetIncome = retNetWorth > 0 ? Math.round(retNetWorth / (20 * 12)) : 0;

    var tableRows = [];
    var shown = {};
    proj.forEach(function (r) {
      var offset = (r.age || 0) - currentAge;
      if (offset >= 0 && offset % 5 === 0 && !shown[r.age]) {
        shown[r.age] = true;
        tableRows.push(r);
      }
    });
    if (tableRows.length > 9) { tableRows = tableRows.slice(0, 9); }

    var rowsHtml = tableRows.map(function (r) {
      var isRetirement = (r.age === retirementAge);
      var cls = isRetirement ? ' class="gold-row"' : '';
      return [
        '<tr' + cls + '>',
        '  <td>' + (r.age || '\u2014') + '\u6b73</td>',
        '  <td>' + _man(r.financialAssets) + '</td>',
        '  <td>' + _man(r.propertyValue) + '</td>',
        '  <td>' + _man(r.loanBalance) + '</td>',
        '  <td>' + _man(r.netWorth) + '</td>',
        '  <td>' + _esc(r.event || '') + '</td>',
        '</tr>',
      ].join('');
    }).join('');

    var recs = d.keyRecommendations || [];
    var recHtml = recs.slice(0, 3).map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join('');
    if (!recHtml) { recHtml = '<li>\u5b9a\u671f\u7684\u306a\u8cc7\u7523\u898b\u76f4\u3057\u3092\u304a\u3059\u3059\u3081\u3057\u307e\u3059\u3002</li>'; }

    return [
      '<div class="page-break"></div>',
      '<div class="a4-page">',
      '  <div class="page-header">',
      '    <div class="logo-line">AFP LIFE PLANNING</div>',
      '    <div class="page-title">\u8cc7\u7523\u5f62\u6210\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3</div>',
      '  </div>',
      '  <div class="section-title">\u30b5\u30de\u30ea\u30fcKPI</div>',
      '  <div class="kpi-grid">',
      '    <div class="kpi-card"><div class="kpi-value" style="font-size:13pt;">' + _man(currentNetWorth) + '</div><div class="kpi-label">\u73fe\u5728\u7d14\u8cc7\u7523</div></div>',
      '    <div class="kpi-card"><div class="kpi-value" style="font-size:13pt;">' + _man(retNetWorth) + '</div><div class="kpi-label">\u5b9a\u5e74\u6642\u7d14\u8cc7\u7523</div></div>',
      '    <div class="kpi-card"><div class="kpi-value" style="font-size:13pt;">' + _man(monthlyRetIncome) + '</div><div class="kpi-label">\u8001\u5f8c\u6708\u53ce\u63db\u7b97</div></div>',
      '  </div>',
      '  <div class="section-title">\u8cc7\u7523\u63a8\u79fb\u8868</div>',
      '  <table class="compare-table">',
      '    <thead><tr>',
      '      <th>\u5e74\u9f62</th><th>\u91d1\u878d\u8cc7\u7523</th><th>\u4e0d\u52d5\u7523\u8cc7\u7523</th><th>\u30ed\u30fc\u30f3\u6b8b\u9ad8</th><th>\u7d14\u8cc7\u7523</th><th>\u30e9\u30a4\u30d5\u30a4\u30d9\u30f3\u30c8</th>',
      '    </tr></thead>',
      '    <tbody>' + (rowsHtml || '<tr><td colspan="6" style="text-align:center;">\u30c7\u30fc\u30bf\u306a\u3057</td></tr>') + '</tbody>',
      '  </table>',
      '  <div class="section-title">\u8001\u5f8c\u6e96\u5099\u30a2\u30c9\u30d0\u30a4\u30b9</div>',
      '  <div class="result-card success">',
      '    <ul class="recommendation-list">' + recHtml + '</ul>',
      '  </div>',
      '  <div class="page-footer">',
      '    <span>LIFE DESIGN PARTNER \u2014 \u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8</span>',
      '    <span>4 / 6</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page 5: Real Estate Options Comparison                               */
  /* ------------------------------------------------------------------ */
  function _page5(d) {
    var fr = d.financialResults || {};
    var rvb = fr.rentVsBuy || {};
    var ins = fr.insurance || {};
    var tax = fr.taxBenefits || {};
    var ir = fr.interestRate || {};
    var scenarios = ir.scenarios || [];

    var recText = rvb.recommendation || '\u8a73\u7d30\u306a\u6bd4\u8f03\u5206\u6790\u3092\u3054\u78ba\u8a8d\u304f\u3060\u3055\u3044';
    var breakEven = rvb.breakEvenYear ? rvb.breakEvenYear + '\u5e74\u3067\u8cfc\u5165\u304c\u6709\u5229\u306b' : '\u2014';
    var rentTotal = _man(rvb.rentTotal);
    var buyTotal = _man(rvb.buyTotal);

    var yearlyDeduction = 0;
    if (tax.yearlyDeduction && tax.yearlyDeduction.length) {
      yearlyDeduction = tax.yearlyDeduction[0].deduction || 0;
    }
    var totalBenefit = tax.totalBenefit || 0;
    var insMonthly = ins.monthlySavings || 0;

    var irRows = '';
    if (scenarios.length) {
      irRows = scenarios.map(function (s) {
        return [
          '<tr>',
          '  <td>' + _esc(s.label || '') + '</td>',
          '  <td>' + _man(s.monthlyPayment) + '</td>',
          '  <td>' + _man(s.totalPayment) + '</td>',
          '  <td>' + _man(s.totalInterest) + '</td>',
          '</tr>',
        ].join('');
      }).join('');
    } else {
      irRows = [
        '<tr><td>\u5909\u52d51%</td><td>\u2014</td><td>\u2014</td><td>\u2014</td></tr>',
        '<tr><td>\u56fa\u5b9a1.5%</td><td>\u2014</td><td>\u2014</td><td>\u2014</td></tr>',
        '<tr><td>\u56fa\u5b9a2%</td><td>\u2014</td><td>\u2014</td><td>\u2014</td></tr>',
      ].join('');
    }

    return [
      '<div class="page-break"></div>',
      '<div class="a4-page">',
      '  <div class="page-header">',
      '    <div class="logo-line">AFP LIFE PLANNING</div>',
      '    <div class="page-title">\u4e0d\u52d5\u7523\u30aa\u30d7\u30b7\u30e7\u30f3\u6bd4\u8f03</div>',
      '  </div>',
      '  <div class="two-col">',
      '    <div>',
      '      <div class="section-title">\u8cc3\u8cb8 vs \u8cfc\u5165</div>',
      '      <div class="result-card gold-card" style="font-size:10pt;"><strong>\u63a8\u5968: </strong>' + _esc(recText) + '</div>',
      '      <div style="font-size:9pt;margin:2mm 0;"><strong>\u640d\u76ca\u5206\u5c90:</strong> ' + _esc(breakEven) + '</div>',
      '      <table class="compare-table" style="margin-top:2mm;">',
      '        <thead><tr><th>\u9805\u76ee</th><th>\u8cc3\u8cb8</th><th>\u8cfc\u5165</th></tr></thead>',
      '        <tbody>',
      '          <tr><td>\u7dcf\u30b3\u30b9\u30c8</td><td>' + rentTotal + '</td><td>' + buyTotal + '</td></tr>',
      '        </tbody>',
      '      </table>',
      '      <div class="section-title" style="margin-top:5mm;">\u4f4f\u5b85\u30ed\u30fc\u30f3\u63a7\u9664</div>',
      '      <div class="result-card">',
      '        <div style="font-size:9pt;">\u5e74\u9593\u6700\u5927\u63a7\u9664\u984d: <strong>' + _yen(yearlyDeduction) + '</strong></div>',
      '        <div style="font-size:9pt;margin-top:1mm;">13\u5e74\u9593\u7dcf\u63a7\u9664\u984d: <strong>' + _man(totalBenefit) + '</strong></div>',
      '      </div>',
      '      <div class="section-title" style="margin-top:4mm;">\u56e3\u4fe1 vs \u4fdd\u967a</div>',
      '      <div class="result-card' + (insMonthly > 0 ? ' success' : '') + '" style="font-size:9pt;">',
      '        \u6708\u9593\u7bc0\u7d04\u984d: <strong>' + _yen(insMonthly) + '</strong>',
      '      </div>',
      '    </div>',
      '    <div>',
      '      <div class="section-title">\u65b0\u7bc9 vs \u4e2d\u53e4</div>',
      '      <table class="compare-table">',
      '        <thead><tr><th>\u6bd4\u8f03\u9805\u76ee</th><th>\u65b0\u7bc9</th><th>\u4e2d\u53e4</th></tr></thead>',
      '        <tbody>',
      '          <tr><td>\u4fa1\u683c</td><td>\u9ad8\u3081</td><td>\u4f4e\u3081</td></tr>',
      '          <tr><td>\u5e83\u3055</td><td>\u6a19\u6e96</td><td>\u5e83\u3044\u50be\u5411</td></tr>',
      '          <tr><td>\u8a2d\u5099</td><td>\u6700\u65b0</td><td>\u8981\u78ba\u8a8d</td></tr>',
      '          <tr><td>\u30ed\u30fc\u30f3\u63a7\u9664</td><td>\u6700\u5927\u9069\u7528</td><td>\u6761\u4ef6\u3042\u308a</td></tr>',
      '          <tr><td>\u8cc7\u7523\u4fa1\u5024</td><td>\u4e0b\u843d\u5e45\u5927</td><td>\u5b89\u5b9a\u50be\u5411</td></tr>',
      '        </tbody>',
      '      </table>',
      '    </div>',
      '  </div>',
      '  <div class="section-title" style="margin-top:5mm;">\u91d1\u5229\u30b7\u30ca\u30ea\u30aa\u6bd4\u8f03</div>',
      '  <table class="compare-table">',
      '    <thead><tr><th>\u91d1\u5229</th><th>\u6708\u3005\u8fd4\u6e08</th><th>\u7dcf\u652f\u6255</th><th>\u7dcf\u5229\u606f</th></tr></thead>',
      '    <tbody>' + irRows + '</tbody>',
      '  </table>',
      '  <div class="page-footer">',
      '    <span>LIFE DESIGN PARTNER \u2014 \u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8</span>',
      '    <span>5 / 6</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page 6: Summary & Disclaimer                                         */
  /* ------------------------------------------------------------------ */
  function _page6(d) {
    var recs = d.keyRecommendations || [];
    var opts = d.recommendedOptions || [];
    var date = _esc(d.reportDate || new Date().toLocaleDateString('ja-JP'));

    var recsHtml = recs.length
      ? recs.map(function (r) { return '<li style="font-size:11pt;margin:3mm 0;line-height:1.7;">' + _esc(r) + '</li>'; }).join('')
      : '<li style="font-size:11pt;">\u62c5\u5f53\u8005\u306b\u3054\u76f8\u8ac7\u304f\u3060\u3055\u3044\u3002</li>';

    var optsHtml = opts.length
      ? opts.slice(0, 3).map(function (o) { return '<li>' + _esc(o) + '</li>'; }).join('')
      : [
        '<li>\u3054\u5e0c\u671b\u30a8\u30ea\u30a2\u30fb\u4e88\u7b97\u306b\u5408\u308f\u305b\u305f\u7269\u4ef6\u63a2\u3057</li>',
        '<li>\u30e9\u30a4\u30d5\u30a4\u30d9\u30f3\u30c8\u306b\u5408\u308f\u305b\u305f\u67d4\u8edf\u306a\u30d7\u30e9\u30f3\u30cb\u30f3\u30b0</li>',
        '<li>\u5b9a\u671f\u7684\u306a\u898b\u76f4\u3057\u3068\u8cc7\u7523\u7ba1\u7406</li>',
      ].join('');

    return [
      '<div class="page-break"></div>',
      '<div class="a4-page">',
      '  <div class="page-header">',
      '    <div class="logo-line">AFP LIFE PLANNING</div>',
      '    <div class="page-title">\u3054\u63d0\u6848\u306e\u307e\u3068\u3081</div>',
      '  </div>',
      '  <div class="section-title">\u4e3b\u8981\u63a8\u5968\u4e8b\u9805</div>',
      '  <ol class="recommendation-list">' + recsHtml + '</ol>',
      '  <div class="section-title">\u4e0d\u52d5\u7523\u9078\u629e\u306e\u30dd\u30a4\u30f3\u30c8</div>',
      '  <ul class="recommendation-list">' + optsHtml + '</ul>',
      '  <div class="section-title" style="margin-top:6mm;">\u514d\u8ca3\u4e8b\u9805</div>',
      '  <div class="disclaimer-box">',
      '    <p>\u672c\u8cc7\u6599\u306f\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u30cb\u30f3\u30b0\u306e\u53c2\u8003\u60c5\u5831\u3068\u3057\u3066\u4f5c\u6210\u3055\u308c\u305f\u3082\u306e\u3067\u3059\u3002</p>',
      '    <p>\u8a18\u8f09\u3055\u308c\u305f\u91d1\u984d\u30fb\u8a66\u7b97\u306f\u3042\u304f\u307e\u3067\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u3067\u3042\u308a\u3001\u5b9f\u969b\u306e\u7d50\u679c\u3092\u4fdd\u8a3c\u3059\u308b\u3082\u306e\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002</p>',
      '    <p>\u91d1\u5229\u30fb\u7a0e\u5236\u30fb\u4e0d\u52d5\u7523\u4fa1\u683c\u7b49\u306f\u5c06\u6765\u5909\u66f4\u3055\u308c\u308b\u53ef\u80fd\u6027\u304c\u3042\u308a\u307e\u3059\u3002</p>',
      '    <p>\u6700\u7d42\u7684\u306a\u5224\u65ad\u306f\u3054\u672c\u4eba\u306e\u8cac\u4efb\u306b\u304a\u3044\u3066\u884c\u3063\u3066\u304f\u3060\u3055\u3044\u3002\u8a73\u7d30\u306f\u5c02\u9580\u5bb6\u306b\u3054\u76f8\u8ac7\u304f\u3060\u3055\u3044\u3002</p>',
      '    <p>\u672c\u8cc7\u6599\u306b\u542b\u307e\u308c\u308b\u60c5\u5831\u306f\u4f5c\u6210\u6642\u70b9\u306e\u3082\u306e\u3067\u3042\u308a\u3001\u5c06\u6765\u306e\u5e02\u5834\u52d5\u5411\u3092\u4fdd\u8a3c\u3059\u308b\u3082\u306e\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002</p>',
      '  </div>',
      '  <div style="text-align:center;margin:5mm 0;">',
      '    <div style="font-size:9pt;letter-spacing:3px;color:#c9a84c;font-weight:700;">LIFE DESIGN PARTNER</div>',
      '    <div style="font-size:8pt;color:#999;margin-top:1mm;">AFP\u8a8d\u5b9a\u30d5\u30a1\u30a4\u30ca\u30f3\u30b7\u30e3\u30eb\u30d7\u30e9\u30f3\u30ca\u30fc</div>',
      '  </div>',
      '  <div class="section-title">\u4f5c\u6210\u8005\u8a18\u5165\u6b04</div>',
      '  <table class="sign-table">',
      '    <tr><th>\u62c5\u5f53\u8005\u540d</th><td></td><th>\u4f1a\u793e\u540d</th><td></td></tr>',
      '    <tr><th>\u65e5\u4ed8</th><td>' + date + '</td><th>\u9023\u7d61\u5148</th><td></td></tr>',
      '  </table>',
      '  <div class="page-footer">',
      '    <span>LIFE DESIGN PARTNER \u2014 \u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8</span>',
      '    <span>6 / 6</span>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ------------------------------------------------------------------ */
  /* _buildHtml: assemble all 6 pages                                     */
  /* ------------------------------------------------------------------ */
  RG._buildHtml = function (data) {
    var d = data || {};
    if (!d.reportDate) {
      d.reportDate = new Date().toLocaleDateString('ja-JP');
    }
    return [
      '<!DOCTYPE html>',
      '<html lang="ja"><head>',
      '<meta charset="UTF-8">',
      '<style>' + CSS + '</style>',
      '</head>',
      '<body>',
      '<div class="report-wrap">',
      _page1(d),
      _page2(d),
      _page3(d),
      _page4(d),
      _page5(d),
      _page6(d),
      '</div>',
      '</body></html>',
    ].join('');
  };

  /* ------------------------------------------------------------------ */
  /* generate: append hidden container to DOM                             */
  /* ------------------------------------------------------------------ */
  RG.generate = function (data) {
    var container = document.createElement('div');
    container.innerHTML = RG._buildHtml(data);
    // Must be in viewport (not off-screen) for html2canvas to render correctly
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '99999';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0.01'; // near-invisible but still rendered by browser
    document.body.appendChild(container);
    return container;
  };

  /* ------------------------------------------------------------------ */
  /* download: generate PDF and save                                      */
  /* ------------------------------------------------------------------ */
  RG.download = function (data) {
    var d = data || {};
    var el = RG.generate(d);
    var filename = _esc(d.clientName || '\u304a\u5ba2\u69d8') +
      '_\u30e9\u30a4\u30d5\u30c7\u30b6\u30a4\u30f3\u30ec\u30dd\u30fc\u30c8_' +
      new Date().toISOString().slice(0, 10) + '.pdf';
    var opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css', before: '.page-break' },
    };
    return html2pdf().set(opt).from(el).save().then(function () {
      document.body.removeChild(el);
    });
  };

  /* ------------------------------------------------------------------ */
  /* preview: open PDF in new tab                                         */
  /* ------------------------------------------------------------------ */
  RG.preview = function (data) {
    var d = data || {};
    var el = RG.generate(d);
    var opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css', before: '.page-break' },
    };
    return html2pdf().set(opt).from(el).outputPdf('bloburl').then(function (url) {
      window.open(url, '_blank');
      document.body.removeChild(el);
    });
  };

  /* ------------------------------------------------------------------ */
  /* printFallback: open print dialog with PDF-optimised CSS              */
  /* Triggered when html2pdf is unavailable or fails.                     */
  /* ------------------------------------------------------------------ */
  RG.printFallback = function (data) {
    var d = data || {};
    var html = RG._buildHtml(d);
    // Inject @media print rules so the browser "Print to PDF" works well
    var printCss = '<style>@media print{'
      + 'body{margin:0;padding:0;}'
      + '.a4-page{page-break-after:always;width:210mm;min-height:297mm;}'
      + '.page-break{page-break-before:always;}'
      + '}</style>';
    var win = window.open('', '_blank');
    if (!win) { alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。'); return; }
    win.document.write(html.replace('</head>', printCss + '</head>'));
    win.document.close();
    win.focus();
    // Delay print to allow fonts/images to load
    setTimeout(function () { win.print(); }, 800);
  };

  /* ------------------------------------------------------------------ */
  /* htmlPreviewFallback: open inline HTML preview in a new tab           */
  /* Triggered when html2pdf is unavailable or fails.                     */
  /* ------------------------------------------------------------------ */
  RG.htmlPreviewFallback = function (data) {
    var d = data || {};
    var html = RG._buildHtml(d);
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var win  = window.open(url, '_blank');
    if (!win) { alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。'); }
    // Revoke the object URL after the tab has had time to load
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  };

  return RG;
})();
