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
  function _man(n) { return Math.round((n || 0) / 10000).toLocaleString('ja-JP') + '\u4e07\u5186'; }
  function _yen(n) { return (n || 0).toLocaleString('ja-JP') + '\u5186'; }
  function _pct(n) { return (n || 0).toFixed(1) + '%'; }
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------------------------------------------ */
  /* Visual helper functions                                              */
  /* ------------------------------------------------------------------ */

  // CSS-only横棒グラフのHTML生成
  function _cssBar(label, amount, maxAmount, cls) {
    var pct = maxAmount > 0 ? Math.min(100, Math.round((amount / maxAmount) * 100)) : 0;
    return '<div class="css-bar-row">' +
      '<div class="css-bar-label-row"><span class="css-bar-name">' + label + '</span><span class="css-bar-amount">' + _man(amount) + '/\u6708</span></div>' +
      '<div class="css-bar-track"><div class="css-bar-fill ' + (cls || '') + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  // ゲージHTML生成
  function _gauge(pct, label) {
    var cls = pct <= 25 ? 'gauge-safe' : pct <= 35 ? 'gauge-moderate' : 'gauge-risky';
    var displayPct = Math.min(100, Math.round(pct));
    return '<div class="gauge-wrap">' +
      '<div class="gauge-label">' + label + '</div>' +
      '<div class="gauge-track"><div class="gauge-fill ' + cls + '" style="width:' + displayPct + '%">' +
      '<span class="gauge-fill-text">' + _pct(pct) + '</span></div></div>' +
      '</div>';
  }

  // 資産ビジュアル行生成
  function _assetRow(year, principal, total, maxTotal) {
    var principalPct = maxTotal > 0 ? Math.min(95, Math.round((principal / maxTotal) * 100)) : 0;
    var gainPct = maxTotal > 0 ? Math.min(100 - principalPct, Math.round(((total - principal) / maxTotal) * 100)) : 0;
    return '<div class="asset-visual-row">' +
      '<div class="asset-visual-year">' + year + '\u5e74\u76ee</div>' +
      '<div class="asset-visual-bars">' +
      '<div class="asset-bar-principal" style="width:' + principalPct + '%"></div>' +
      '<div class="asset-bar-gain"      style="width:' + gainPct + '%"></div>' +
      '</div>' +
      '<div class="asset-visual-total">' + _man(total) + '</div>' +
      '</div>';
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

    /* ===== KPI BIG NUMBERS ===== */
    '.kpi-big-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; margin:4mm 0; }',
    '.kpi-big { background:linear-gradient(135deg,#0a1628 0%,#1a3050 100%); border-radius:3mm; padding:5mm 4mm; text-align:center; position:relative; overflow:hidden; }',
    '.kpi-big::before { content:""; position:absolute; top:0; left:0; right:0; height:1mm; background:linear-gradient(90deg,#b8922e,#d4aa4e,#b8922e); }',
    '.kpi-big-value { font-size:22pt; font-weight:700; color:#d4aa4e; font-variant-numeric:tabular-nums; line-height:1; margin-bottom:1.5mm; }',
    '.kpi-big-label { font-size:7.5pt; color:rgba(255,255,255,0.65); letter-spacing:0.04em; }',
    '.kpi-big-sub { font-size:8pt; color:rgba(255,255,255,0.45); margin-top:1mm; }',

    /* ===== CSS-ONLY HORIZONTAL BAR CHART ===== */
    '.css-bar-chart { margin:4mm 0; }',
    '.css-bar-row { margin-bottom:3mm; }',
    '.css-bar-label-row { display:flex; justify-content:space-between; margin-bottom:1mm; }',
    '.css-bar-name { font-size:9pt; color:#333; }',
    '.css-bar-amount { font-size:9pt; font-weight:700; color:#1a237e; }',
    '.css-bar-track { background:#e8e8e8; border-radius:2mm; height:5mm; overflow:hidden; }',
    '.css-bar-fill { height:100%; border-radius:2mm; background:linear-gradient(90deg,#1a237e,#2e4a8a); }',
    '.css-bar-fill.gold { background:linear-gradient(90deg,#b8922e,#d4aa4e); }',
    '.css-bar-fill.teal { background:linear-gradient(90deg,#00695c,#26a69a); }',
    '.css-bar-fill.red  { background:linear-gradient(90deg,#c62828,#e57373); }',

    /* ===== GAUGE / METER ===== */
    '.gauge-wrap { display:flex; align-items:center; gap:5mm; margin:3mm 0; }',
    '.gauge-track { flex:1; background:#e8e8e8; border-radius:3mm; height:7mm; overflow:hidden; position:relative; }',
    '.gauge-fill { height:100%; border-radius:3mm; position:relative; display:flex; align-items:center; justify-content:flex-end; padding-right:3mm; }',
    '.gauge-fill-text { font-size:8pt; font-weight:700; color:white; }',
    '.gauge-safe     { background:linear-gradient(90deg,#1b5e20,#43a047); }',
    '.gauge-moderate { background:linear-gradient(90deg,#e65100,#ffa726); }',
    '.gauge-risky    { background:linear-gradient(90deg,#b71c1c,#ef5350); }',
    '.gauge-label { font-size:8pt; color:#666; white-space:nowrap; }',

    /* ===== TRAFFIC LIGHT INDICATOR ===== */
    '.traffic-light { display:inline-flex; align-items:center; gap:2mm; }',
    '.traffic-dot { width:3.5mm; height:3.5mm; border-radius:50%; }',
    '.traffic-safe     .traffic-dot { background:#43a047; box-shadow:0 0 3mm rgba(67,160,71,0.5); }',
    '.traffic-moderate .traffic-dot { background:#ffa726; box-shadow:0 0 3mm rgba(255,167,38,0.5); }',
    '.traffic-risky    .traffic-dot { background:#ef5350; box-shadow:0 0 3mm rgba(239,83,80,0.5); }',

    /* ===== COMPARISON CARDS ===== */
    '.compare-cards { display:grid; grid-template-columns:1fr 1fr; gap:4mm; margin:3mm 0; }',
    '.compare-card { border-radius:3mm; padding:5mm; position:relative; overflow:hidden; }',
    '.compare-card-rent { background:#f0f4ff; border:1.5px solid #5c7cfa; }',
    '.compare-card-buy  { background:#fffbf0; border:2px solid #b8922e; }',
    '.compare-card-buy::before { content:"\u63a8\u5968"; position:absolute; top:2mm; right:2mm; background:#b8922e; color:white; font-size:7pt; font-weight:700; padding:1mm 2.5mm; border-radius:1.5mm; letter-spacing:0.05em; }',
    '.compare-card-title { font-size:10pt; font-weight:700; margin-bottom:3mm; }',
    '.compare-card-rent .compare-card-title { color:#3949ab; }',
    '.compare-card-buy  .compare-card-title { color:#b8922e; }',
    '.compare-card-amount { font-size:18pt; font-weight:700; font-variant-numeric:tabular-nums; margin-bottom:1mm; }',
    '.compare-card-rent .compare-card-amount { color:#3949ab; }',
    '.compare-card-buy  .compare-card-amount { color:#b8922e; }',
    '.compare-card-note { font-size:8pt; color:#666; line-height:1.5; }',

    /* ===== WINNER BADGE ===== */
    '.winner-box { background:linear-gradient(135deg,#0a1628,#1a3050); border-radius:3mm; padding:5mm 6mm; margin:3mm 0; display:flex; align-items:center; gap:4mm; }',
    '.winner-box-icon { font-size:16pt; }',
    '.winner-box-text { color:white; }',
    '.winner-box-text strong { font-size:12pt; color:#d4aa4e; display:block; }',
    '.winner-box-text span { font-size:9pt; color:rgba(255,255,255,0.7); }',

    /* ===== VISUAL TIMELINE ===== */
    '.vtl { padding-left:0; margin:4mm 0; }',
    '.vtl-item { display:flex; align-items:flex-start; gap:4mm; margin-bottom:4mm; position:relative; }',
    '.vtl-item:not(:last-child)::after { content:""; position:absolute; left:4mm; top:8mm; bottom:-4mm; width:0.3mm; background:#e0e0e0; }',
    '.vtl-dot-wrap { flex-shrink:0; display:flex; flex-direction:column; align-items:center; }',
    '.vtl-dot { width:8mm; height:8mm; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8pt; font-weight:700; color:white; flex-shrink:0; }',
    '.vtl-dot.d-blue  { background:#1a237e; }',
    '.vtl-dot.d-gold  { background:#b8922e; }',
    '.vtl-dot.d-green { background:#2e7d32; }',
    '.vtl-dot.d-teal  { background:#00695c; }',
    '.vtl-body { flex:1; }',
    '.vtl-year { font-size:8pt; font-weight:700; color:#1a237e; margin-bottom:0.5mm; }',
    '.vtl-title { font-size:10pt; font-weight:700; color:#222; margin-bottom:1mm; }',
    '.vtl-detail { font-size:8.5pt; color:#555; line-height:1.5; }',
    '.vtl-amount { font-size:10pt; font-weight:700; color:#b8922e; font-variant-numeric:tabular-nums; }',

    /* ===== ASSET VISUAL ===== */
    '.asset-visual { margin:3mm 0; }',
    '.asset-visual-row { display:flex; align-items:center; gap:3mm; margin-bottom:2mm; font-size:9pt; }',
    '.asset-visual-year { width:12mm; color:#666; text-align:right; flex-shrink:0; }',
    '.asset-visual-bars { flex:1; display:flex; height:5mm; border-radius:1.5mm; overflow:hidden; }',
    '.asset-bar-principal { background:#3949ab; height:100%; }',
    '.asset-bar-gain      { background:#b8922e; height:100%; }',
    '.asset-visual-total  { width:20mm; text-align:right; font-weight:700; color:#1a237e; font-variant-numeric:tabular-nums; flex-shrink:0; }',

    /* ===== SCORE METER ===== */
    '.score-wrap { display:flex; align-items:center; gap:4mm; margin:3mm 0; }',
    '.score-circle { width:16mm; height:16mm; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12pt; font-weight:700; color:white; }',
    '.score-safe     { background:radial-gradient(circle,#43a047,#1b5e20); }',
    '.score-moderate { background:radial-gradient(circle,#ffa726,#e65100); }',
    '.score-risky    { background:radial-gradient(circle,#ef5350,#b71c1c); }',
    '.score-detail { flex:1; }',
    '.score-title { font-size:10pt; font-weight:700; margin-bottom:1.5mm; }',
    '.score-sub   { font-size:9pt; color:#555; line-height:1.5; }',

    /* ===== LIFE STAGE BADGE ===== */
    '.stage-badge { display:inline-block; background:linear-gradient(135deg,#b8922e,#d4aa4e); color:white; font-size:10pt; font-weight:700; padding:2.5mm 6mm; border-radius:5mm; letter-spacing:0.05em; margin:2mm 0; }',

    /* ===== ACTION PLAN ===== */
    '.action-list { padding-left:0; margin:4mm 0; }',
    '.action-item { display:flex; align-items:flex-start; gap:4mm; margin-bottom:4mm; }',
    '.action-num { width:7mm; height:7mm; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9pt; font-weight:700; color:white; flex-shrink:0; }',
    '.action-num.pri-1 { background:#b71c1c; }',
    '.action-num.pri-2 { background:#e65100; }',
    '.action-num.pri-3 { background:#1565c0; }',
    '.action-num.pri-4 { background:#2e7d32; }',
    '.action-num.pri-5 { background:#4a148c; }',
    '.action-body { flex:1; padding-top:0.5mm; }',
    '.action-body strong { font-size:10pt; color:#222; display:block; margin-bottom:0.5mm; }',
    '.action-body span { font-size:8.5pt; color:#555; line-height:1.5; }',
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
    var ie = d.incomeExpenseSummary || {};
    var af = d.affordabilityResult || {};
    var age = cs.age || 0;
    var name = _esc(d.clientName || '\u304a\u5ba2\u69d8');

    var netIncome   = ie.monthlyNetIncome  || 0;
    var monthlySave = ie.monthlySurplus    || 0;
    var savingsRate = ie.savingsRate       || 0;
    var recBudget   = af.recommendedLoanAmount || 0;

    // ライフイベントタイムライン
    var currentYear = new Date().getFullYear();
    var events = [
      { yr: currentYear, label: '\u73fe\u5728', desc: (cs.currentHousing === 'rent' ? '\u8cc3\u8cb8 ' + _man(cs.currentRent||0) + '/\u6708' : '\u6301\u3061\u5bb6'), cls: 'd-blue' },
      { yr: currentYear+2, label: currentYear+2+'\u5e74', desc: '\u982d\u91d1\u7a4d\u7acb\u30fb\u8cc7\u7523\u5f62\u6210\u30b9\u30bf\u30fc\u30c8', cls: 'd-gold' },
      { yr: currentYear+3, label: currentYear+3+'\u5e74', desc: '\u4f4f\u5b85\u53d6\u5f97\u3092\u76ee\u6a19\u306b\u6e96\u5099', cls: 'd-teal' },
      { yr: currentYear+5, label: currentYear+5+'\u5e74', desc: '\u4f4f\u5b85\u8cfc\u5165\u30fb\u30ed\u30fc\u30f3\u958b\u59cb\uff08\u76ee\u6a19\uff09', cls: 'd-green' },
      { yr: currentYear+10, label: currentYear+10+'\u5e74', desc: '\u8cc7\u7523\u5f62\u6210\u52a0\u901f\u671f', cls: 'd-blue' },
      { yr: currentYear+30, label: currentYear+30+'\u5e74', desc: '\u30ed\u30fc\u30f3\u5b8c\u6e08\u30fb\u8001\u5f8c\u6e96\u5099\u30d5\u30a7\u30fc\u30ba', cls: 'd-gold' },
    ];

    var html = '';
    html += '<div class="page-break"></div>';
    html += '<div class="a4-page">';
    html += '<div class="page-header">';
    html += '  <div class="logo-line">LIFE DESIGN PARTNER \u2014 AFP LIFE PLANNING</div>';
    html += '  <div class="page-title">\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u6982\u8981</div>';
    html += '</div>';

    // ライフステージバッジ
    html += '<div style="margin:4mm 0;">';
    html += '  <span class="stage-badge">' + _esc(ls.stageJa || ls.stage || '\u30a2\u30af\u30c6\u30a3\u30d6\u671f') + '</span>';
    if (ls.description) html += '  <p style="font-size:9pt;color:#555;margin-top:2mm;line-height:1.5;">' + _esc(ls.description) + '</p>';
    html += '</div>';

    // KPI BIG NUMBERS
    html += '<div class="kpi-big-grid">';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + age + '\u6b73</div><div class="kpi-big-label">\u73fe\u5728\u306e\u5e74\u9f62</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(netIncome) + '</div><div class="kpi-big-label">\u6708\u53ce\u624b\u53d6\u308a\uff08\u6982\u7b97\uff09</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _pct(savingsRate) + '</div><div class="kpi-big-label">\u73fe\u5728\u306e\u8caf\u84c4\u7387</div><div class="kpi-big-sub">\u76ee\u6a19: 20%\u4ee5\u4e0a</div></div>';
    html += '</div>';

    // 推奨住宅予算
    if (recBudget > 0) {
      html += '<div class="highlight-box" style="margin:4mm 0;">';
      html += '  <div style="font-size:9pt;color:#c9a84c;letter-spacing:0.05em;margin-bottom:1.5mm;">\u63a8\u5968\u4f4f\u5b85\u4e88\u7b97\uff08\u501f\u5165\u53ef\u80fd\u984d\u76ee\u5b89\uff09</div>';
      html += '  <div class="amount">' + _man(recBudget) + '</div>';
      html += '  <div style="font-size:8pt;color:rgba(255,255,255,0.6);margin-top:1.5mm;">\u203b \u7121\u7406\u306e\u306a\u3044\u8fd4\u6e08\u3092\u524d\u63d0\u3068\u3057\u305f\u76ee\u5b89\u984d\u3067\u3059</div>';
      html += '</div>';
    }

    // ライフイベントタイムライン
    html += '<div class="section-title">\u30e9\u30a4\u30d5\u30a4\u30d9\u30f3\u30c8 \u30bf\u30a4\u30e0\u30e9\u30a4\u30f3</div>';
    html += '<div class="vtl">';
    events.forEach(function(ev) {
      html += '<div class="vtl-item">';
      html += '  <div class="vtl-dot-wrap"><div class="vtl-dot ' + ev.cls + '">' + String(ev.yr).slice(2) + '</div></div>';
      html += '  <div class="vtl-body">';
      html += '    <div class="vtl-year">' + ev.yr + '\u5e74</div>';
      html += '    <div class="vtl-title">' + ev.label + '</div>';
      html += '    <div class="vtl-detail">' + ev.desc + '</div>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="page-footer"><span>LIFE DESIGN PARTNER</span><span>' + _esc(d.reportDate || '') + '</span><span>2 / 6</span></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Page 3: Income / Expense Analysis                                    */
  /* ------------------------------------------------------------------ */
  function _page3(d) {
    var ie = d.incomeExpenseSummary || {};
    var grossIncome  = ie.monthlyGrossIncome || 0;
    var netIncome    = ie.monthlyNetIncome   || 0;
    var totalExpense = ie.monthlyExpense     || 0;
    var surplus      = ie.monthlySurplus     || 0;
    var savingsRate  = ie.savingsRate        || 0;
    var breakdown    = ie.expenseBreakdown   || {};
    var commentary   = ie.commentary || [];

    var maxExpense = Math.max(
      breakdown.housing||0, breakdown.food||0, breakdown.transport||0,
      breakdown.insurance||0, breakdown.education||0, breakdown.entertainment||0,
      breakdown.savings||0, breakdown.other||0
    ) * 1.1 || 1;

    var housingRatio = netIncome > 0 ? (breakdown.housing || 0) / netIncome * 100 : 0;
    var riskClass = housingRatio <= 20 ? 'risk-safe' : housingRatio <= 30 ? 'risk-moderate' : 'risk-risky';

    var html = '';
    html += '<div class="page-break"></div>';
    html += '<div class="a4-page">';
    html += '<div class="page-header">';
    html += '  <div class="logo-line">LIFE DESIGN PARTNER \u2014 AFP LIFE PLANNING</div>';
    html += '  <div class="page-title">\u53ce\u652f\u5206\u6790</div>';
    html += '</div>';

    // KPI BIG NUMBERS
    html += '<div class="kpi-big-grid">';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(netIncome) + '</div><div class="kpi-big-label">\u6708\u53ce\uff08\u624b\u53d6\u308a\uff09</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(totalExpense) + '</div><div class="kpi-big-label">\u6708\u6b21\u7dcf\u652f\u51fa</div></div>';
    html += '<div class="kpi-big" style="' + (surplus >= 0 ? '' : 'border-top-color:#ef5350') + '"><div class="kpi-big-value" style="' + (surplus < 0 ? 'color:#ef5350' : '') + '">' + _man(surplus) + '</div><div class="kpi-big-label">\u6708\u6b21\u4f59\u5270</div><div class="kpi-big-sub">\u8caf\u84c4\u7387 ' + _pct(savingsRate) + '</div></div>';
    html += '</div>';

    // 住居費比率ゲージ
    html += '<div class="section-title">\u4f4f\u5c45\u8cbb\u6bd4\u7387</div>';
    html += _gauge(housingRatio, '\u4f4f\u5c45\u8cbb / \u624b\u53d6\u308a\u6708\u53ce');
    html += '<p style="font-size:8.5pt;color:#555;margin-top:1mm;">\u696d\u754c\u63a8\u5968: \u6708\u53ce\u306e20\uff5e25%\u4ee5\u5185 ';
    html += '<span class="' + riskClass + '">' + (housingRatio <= 20 ? '\u2713 \u9069\u6b63\u7bc4\u56f2\u5185' : housingRatio <= 25 ? '\u25b3 \u6ce8\u610f\u30e9\u30a4\u30f3' : '\u26a0 \u9ad8\u8ca0\u62c5') + '</span></p>';

    // 支出内訳 CSS横棒グラフ
    html += '<div class="section-title">\u652f\u51fa\u5185\u8a33</div>';
    html += '<div class="css-bar-chart">';
    if (breakdown.housing)       html += _cssBar('\u4f4f\u5c45\u8cbb',     breakdown.housing,       maxExpense, 'gold');
    if (breakdown.food)          html += _cssBar('\u98df\u8cbb',           breakdown.food,          maxExpense);
    if (breakdown.transport)     html += _cssBar('\u4ea4\u901a\u8cbb',     breakdown.transport,     maxExpense);
    if (breakdown.insurance)     html += _cssBar('\u4fdd\u967a\u6599',     breakdown.insurance,     maxExpense, 'teal');
    if (breakdown.education)     html += _cssBar('\u6559\u80b2\u8cbb',     breakdown.education,     maxExpense);
    if (breakdown.entertainment) html += _cssBar('\u5a2f\u697d\u8cbb',     breakdown.entertainment, maxExpense);
    if (breakdown.savings)       html += _cssBar('\u8caf\u84c4',           breakdown.savings,       maxExpense, 'teal');
    if (breakdown.other)         html += _cssBar('\u305d\u306e\u4ed6',     breakdown.other,         maxExpense);
    html += '</div>';

    // コメント
    if (commentary.length > 0) {
      html += '<div class="section-title">\u30a2\u30c9\u30d0\u30a4\u30b9</div>';
      commentary.forEach(function(c, i) {
        var cls = i === 0 ? 'result-card' : 'result-card gold-card';
        html += '<div class="' + cls + '"><p style="font-size:9pt;line-height:1.6;margin:0">' + _esc(c) + '</p></div>';
      });
    }

    html += '<div class="page-footer"><span>LIFE DESIGN PARTNER</span><span>' + _esc(d.reportDate||'') + '</span><span>3 / 6</span></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Page 4: Asset Formation Simulation                                   */
  /* ------------------------------------------------------------------ */
  function _page4(d) {
    var asset = d.assetProjection || {};
    var monthly    = asset.monthlyContribution  || 0;
    var years      = asset.years                || 30;
    var rate       = asset.annualReturnRate     || 3;
    var final      = asset.finalAmount          || 0;
    var contrib    = asset.totalContributed     || 0;
    var gain       = asset.totalGain            || 0;
    var yearly     = asset.yearlyProjection     || [];

    // 代表的な年の取得 (5, 10, 20, 30年目)
    var snapshots = [5, 10, 20, Math.min(30, years)].map(function(yr) {
      var row = null;
      for (var i = 0; i < yearly.length; i++) { if (yearly[i].year === yr) { row = yearly[i]; break; } }
      if (!row && yearly.length > 0) row = yearly[Math.min(yr-1, yearly.length-1)];
      return row ? { year: yr, total: row.totalAssets || row.amount || 0, contrib: row.totalContributed || row.contributed || 0 } : null;
    }).filter(Boolean);
    var maxTotal = final || (snapshots.length > 0 ? Math.max.apply(null, snapshots.map(function(s){return s.total;})) : 1);

    var html = '';
    html += '<div class="page-break"></div>';
    html += '<div class="a4-page">';
    html += '<div class="page-header">';
    html += '  <div class="logo-line">LIFE DESIGN PARTNER \u2014 AFP LIFE PLANNING</div>';
    html += '  <div class="page-title">\u8cc7\u7523\u5f62\u6210\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3</div>';
    html += '</div>';

    // KPI
    html += '<div class="kpi-big-grid">';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(monthly) + '</div><div class="kpi-big-label">\u6708\u6b21\u7a4d\u7acb\u984d</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _pct(rate) + '</div><div class="kpi-big-label">\u60f3\u5b9a\u5e74\u5229\u56de\u308a</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(final) + '</div><div class="kpi-big-label">' + years + '\u5e74\u5f8c\u306e\u8a66\u7b97\u984d</div></div>';
    html += '</div>';

    // 元本 vs 運用益 ハイライト
    if (gain > 0) {
      html += '<div class="highlight-box" style="margin:4mm 0;">';
      html += '  <div style="font-size:9pt;color:rgba(255,255,255,0.7);margin-bottom:1mm;">' + years + '\u5e74\u9593\u306e\u904b\u7528\u76ca\uff08\u8907\u5229\u52b9\u679c\uff09</div>';
      html += '  <div class="amount">+ ' + _man(gain) + '</div>';
      html += '  <div style="font-size:8pt;color:rgba(255,255,255,0.5);margin-top:1mm;">\u5143\u672c ' + _man(contrib) + ' + \u904b\u7528\u76ca ' + _man(gain) + ' = \u5408\u8a08 ' + _man(final) + '</div>';
      html += '</div>';
    }

    // 資産推移 ビジュアルバー
    html += '<div class="section-title">\u8cc7\u7523\u63a8\u79fb\uff08\u7a4d\u7acb\u5143\u672c + \u904b\u7528\u76ca\uff09</div>';
    html += '<div class="asset-visual">';
    html += '<div style="display:flex;gap:6mm;margin-bottom:3mm;font-size:8pt;">';
    html += '  <span><span style="display:inline-block;width:10mm;height:3mm;background:#3949ab;vertical-align:middle;border-radius:1mm;margin-right:2mm;"></span>\u7a4d\u7acb\u5143\u672c</span>';
    html += '  <span><span style="display:inline-block;width:10mm;height:3mm;background:#b8922e;vertical-align:middle;border-radius:1mm;margin-right:2mm;"></span>\u904b\u7528\u76ca</span>';
    html += '</div>';
    snapshots.forEach(function(s) {
      html += _assetRow(s.year, s.contrib, s.total, maxTotal);
    });
    html += '</div>';

    // アドバイス
    html += '<div class="section-title">\u8cc7\u7523\u5f62\u6210\u30dd\u30a4\u30f3\u30c8</div>';
    var tips = [
      'NISA\u306e\u7a4d\u7acb\u67a0\uff08\u5e74\u9593120\u4e07\u5186\uff09\u3092\u6700\u5927\u6d3b\u7528\u3059\u308b\u3068\u3001\u904b\u7528\u76ca\u304c\u975e\u8ab2\u7a0e\u306b\u306a\u308a\u307e\u3059\u3002',
      '\u6708' + _man(monthly) + '\u306e\u7a4d\u7acb\u3092' + years + '\u5e74\u9593\u7d99\u7d9a\u3059\u308b\u3068\u3001\u8907\u5229\u52b9\u679c\u3067\u7d04' + _man(gain) + '\u306e\u904b\u7528\u76ca\u304c\u671f\u5f85\u3067\u304d\u307e\u3059\u3002',
      '\u4f4f\u5b85\u53d6\u5f97\u5f8c\u3082\u6708\u6b21\u4f59\u5270\u306e\u3046\u3061\u6700\u4f4e3\u4e07\u5186\u306f\u6295\u8cc7\u30fb\u8caf\u84c4\u306b\u56de\u3059\u3053\u3068\u3092\u63a8\u5968\u3057\u307e\u3059\u3002',
    ];
    tips.forEach(function(tip) {
      html += '<div class="result-card gold-card" style="margin-bottom:2mm;"><p style="font-size:9pt;line-height:1.6;margin:0">' + _esc(tip) + '</p></div>';
    });

    html += '<div class="page-footer"><span>LIFE DESIGN PARTNER</span><span>' + _esc(d.reportDate||'') + '</span><span>4 / 6</span></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Page 5: Real Estate Comparison — Rent vs Buy                        */
  /* ------------------------------------------------------------------ */
  function _page5(d) {
    var rvb = d.rentVsBuyResult || {};
    var af  = d.affordabilityResult || {};
    var rentM    = rvb.monthlyRent        || 0;
    var loanM    = rvb.monthlyLoanPayment || 0;
    var price    = rvb.propertyPrice      || 0;
    var totalRent= rvb.totalRentCost      || 0;
    var totalBuy = rvb.totalBuyCost       || 0;
    var breakEven= rvb.breakEvenYear      || 0;
    var saving   = Math.max(0, totalRent - totalBuy);
    var netAsset = price * 0.5;
    var taxBenefit = Math.min(price * 0.007 * 13, 4000000);

    var html = '';
    html += '<div class="page-break"></div>';
    html += '<div class="a4-page">';
    html += '<div class="page-header">';
    html += '  <div class="logo-line">LIFE DESIGN PARTNER \u2014 AFP LIFE PLANNING</div>';
    html += '  <div class="page-title">\u4e0d\u52d5\u7523\u6bd4\u8f03 \u2014 \u8cc3\u8cb8 vs \u8cfc\u5165</div>';
    html += '</div>';

    // KPI
    html += '<div class="kpi-big-grid">';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(price) + '</div><div class="kpi-big-label">\u60f3\u5b9a\u7269\u4ef6\u4fa1\u683c</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + _man(loanM) + '</div><div class="kpi-big-label">\u6708\u6b21\u30ed\u30fc\u30f3\u652f\u6255\u984d</div></div>';
    html += '<div class="kpi-big"><div class="kpi-big-value">' + (breakEven > 0 ? breakEven + '\u5e74\u76ee' : 'N/A') + '</div><div class="kpi-big-label">\u640d\u76ca\u5206\u5c90\u70b9</div></div>';
    html += '</div>';

    // 30年累計 比較カード
    html += '<div class="section-title">30\u5e74\u9593 \u7d2f\u8a08\u30b3\u30b9\u30c8\u6bd4\u8f03</div>';
    html += '<div class="compare-cards">';
    html += '<div class="compare-card compare-card-rent">';
    html += '  <div class="compare-card-title">\uD83C\uDFE0 \u8cc3\u8cb8\u3092\u7d9a\u3051\u305f\u5834\u5408</div>';
    html += '  <div class="compare-card-amount">' + _man(totalRent) + '</div>';
    html += '  <div class="compare-card-note">\u6708' + _man(rentM) + ' \xd7 30\u5e74\u9593\u3002\u652f\u6255\u3044\u7d9a\u3051\u3066\u3082\u8cc7\u7523\u306f\u6b8b\u308a\u307e\u305b\u3093\u3002</div>';
    html += '</div>';
    html += '<div class="compare-card compare-card-buy">';
    html += '  <div class="compare-card-title">\uD83C\uDFE1 \u8cfc\u5165\u3057\u305f\u5834\u5408</div>';
    html += '  <div class="compare-card-amount">' + _man(totalBuy) + '</div>';
    html += '  <div class="compare-card-note">\u6708' + _man(loanM) + ' \xd7 35\u5e74\u3002\u5b8c\u6e08\u5f8c\u306b\u4e0d\u52d5\u7523\u8cc7\u7523\u304c\u6b8b\u308a\u307e\u3059\u3002</div>';
    html += '</div>';
    html += '</div>';

    // 購入メリットまとめ
    if (saving > 0) {
      html += '<div class="winner-box">';
      html += '  <div class="winner-box-icon">\uD83C\uDFC6</div>';
      html += '  <div class="winner-box-text">';
      html += '    <strong>\u8cfc\u5165\u306e\u65b9\u304c30\u5e74\u9593\u3067\u7d04 ' + _man(saving) + ' \u304a\u5f97\uff01</strong>';
      html += '    <span>' + (breakEven > 0 ? '\u8cfc\u5165\u5f8c' + breakEven + '\u5e74\u76ee\u304b\u3089\u8cc3\u8cb8\u3088\u308a\u6709\u5229\u306b\u306a\u308a\u307e\u3059' : '\u9577\u671f\u4fdd\u6709\u3067\u8cfc\u5165\u304c\u6709\u5229\u306b\u306a\u308a\u307e\u3059') + '</span>';
      html += '  </div>';
      html += '</div>';
    }

    // 購入の3大メリット
    html += '<div class="section-title">\u8cfc\u5165\u304c\u5727\u5012\u7684\u306b\u6709\u5229\u306a3\u3064\u306e\u7406\u7531</div>';
    var merits = [
      { icon: '\uD83C\uDFE6', title: '\u8cc7\u7523\u3068\u3057\u3066 ' + _man(netAsset) + ' \u6b8b\u308b', desc: '30\u5e74\u5f8c\u3082\u4e0d\u52d5\u7523\u8cc7\u7523\u304c\u6b8b\u308a\u307e\u3059\u3002\u30ed\u30fc\u30f3\u5b8c\u6e08\u5f8c\u306e\u8cc7\u7523\u4fa1\u5024\uff08\u60f3\u5b9a50%\uff09\u306f\u8001\u5f8c\u306e\u8ca1\u7523\u306b\u306a\u308a\u307e\u3059\u3002\u8cc3\u8cb8\u3067\u306f\u4f55\u3082\u6b8b\u308a\u307e\u305b\u3093\u3002' },
      { icon: '\uD83D\uDCB0', title: '\u4f4f\u5b85\u30ed\u30fc\u30f3\u63a7\u9664\u3067\u6700\u5927 ' + _man(taxBenefit) + ' \u7bc0\u7a0e', desc: '\u5e74\u672b\u6b8b\u9ad8\xd70.7%\u3092\u6700\u592713\u5e74\u9593\u3001\u6240\u5f97\u7a0e\u30fb\u4f4f\u6c11\u7a0e\u304b\u3089\u63a7\u9664\u3002\u30d5\u30e9\u30c3\u30c835\u3084\u7701\u30a8\u30cd\u4f4f\u5b85\u3067\u306f\u3055\u3089\u306b\u512a\u9047\u3055\u308c\u307e\u3059\u3002' },
      { icon: '\uD83C\uDFAF', title: '\u8001\u5f8c\u306e\u4f4f\u5c45\u8cbb\u304c\u307b\u307c\u30bc\u30ed\u306b', desc: '\u30ed\u30fc\u30f3\u5b8c\u6e08\u5f8c\uff08' + (new Date().getFullYear() + 35) + '\u5e74\u9803\uff09\u306f\u6708\u3005\u306e\u4f4f\u5c45\u8cbb\u304c\u30bc\u30ed\u306b\u306a\u308a\u307e\u3059\u3002\u5e74\u91d1\u751f\u6d3b\u3078\u306e\u79fb\u884c\u304c\u30b9\u30e0\u30fc\u30ba\u306b\u306a\u308a\u307e\u3059\u3002' },
    ];
    merits.forEach(function(m) {
      html += '<div class="result-card" style="display:flex;align-items:flex-start;gap:3mm;margin-bottom:3mm;">';
      html += '  <div style="font-size:14pt;flex-shrink:0;margin-top:0.5mm;">' + m.icon + '</div>';
      html += '  <div><strong style="font-size:10pt;color:#1a237e;display:block;margin-bottom:1mm;">' + _esc(m.title) + '</strong>';
      html += '  <span style="font-size:9pt;color:#555;line-height:1.6;">' + _esc(m.desc) + '</span></div>';
      html += '</div>';
    });

    // 住宅取得力
    if (af.housingCostRatio) {
      html += '<div class="section-title">\u4f4f\u5c45\u8cbb\u8ca0\u62c5\u7387</div>';
      var ratio = af.housingCostRatio;
      var riskCls = ratio <= 20 ? 'risk-safe' : ratio <= 30 ? 'risk-moderate' : 'risk-risky';
      var riskLabel = ratio <= 20 ? '\u2713 \u9069\u6b63' : ratio <= 30 ? '\u25b3 \u6ce8\u610f' : '\u26a0 \u8981\u691c\u8a0e';
      html += '<div class="result-card">';
      html += '  <p style="font-size:10pt;margin:0">\u6708\u53ce\u306b\u5360\u3081\u308b\u4f4f\u5c45\u8cbb: <strong class="' + riskCls + '">' + _pct(ratio) + ' ' + riskLabel + '</strong></p>';
      html += '  <p style="font-size:8.5pt;color:#666;margin-top:1mm;line-height:1.5">\u696d\u754c\u63a8\u5968\u306f\u6708\u53ce\u306e20\uff5e25%\u4ee5\u5185\u3002\u73fe\u5728\u306e\u4f4f\u5c45\u8cbb\u8ca0\u62c5\u306f' + (ratio <= 25 ? '\u9069\u6b63\u306a\u7bc4\u56f2\u5185' : '\u9ad8\u3081') + '\u3067\u3059\u3002</p>';
      html += '</div>';
    }

    html += '<div class="page-footer"><span>LIFE DESIGN PARTNER</span><span>' + _esc(d.reportDate||'') + '</span><span>5 / 6</span></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Page 6: Summary & Recommendations                                    */
  /* ------------------------------------------------------------------ */
  function _page6(d) {
    var rec = d.recommendations || {};
    var actions = rec.actions || [];
    var af = d.affordabilityResult || {};
    var name = _esc(d.clientName || '\u304a\u5ba2\u69d8');

    // デフォルトアクションプラン（データがない場合）
    if (actions.length === 0) {
      actions = [
        { priority: 1, title: '\u5bb6\u8a08\u306e\u53ce\u652f\u6539\u5584', detail: '\u6708\u6b21\u4f59\u5270\u3092\u5897\u3084\u3057\u3001\u982d\u91d1\u7a4d\u7acb\u3092\u52a0\u901f\u3055\u305b\u307e\u3057\u3087\u3046\u3002\u56fa\u5b9a\u8cbb\u306e\u898b\u76f4\u3057\u304c\u6700\u512a\u5148\u3067\u3059\u3002' },
        { priority: 2, title: '\u982d\u91d1\u30fb\u7dca\u6025\u8cc7\u91d1\u306e\u78ba\u4fdd', detail: '\u982d\u91d1\uff08\u7269\u4ef6\u4fa1\u683c\u306e10\uff5e20%\u76ee\u5b89\uff09\u3068\u534a\u5e74\u5206\u306e\u751f\u6d3b\u8cbb\u3092\u8caf\u84c4\u3059\u308b\u3053\u3068\u3092\u76ee\u6a19\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002' },
        { priority: 3, title: '\u4f4f\u5b85\u30ed\u30fc\u30f3\u4e8b\u524d\u5be9\u67fb', detail: '\u9280\u884c\u30fb\u30d5\u30e9\u30c3\u30c835\u3067\u4e8b\u524d\u5be9\u67fb\u3092\u53d7\u3051\u3001\u501f\u5165\u53ef\u80fd\u984d\u3092\u78ba\u8a8d\u3057\u307e\u3057\u3087\u3046\u3002\u8907\u6570\u884c\u306e\u6bd4\u8f03\u304c\u304a\u5f97\u3067\u3059\u3002' },
        { priority: 4, title: 'NISA\u30fbiDeCo\u306e\u6d3b\u7528\u958b\u59cb', detail: '\u4f4f\u5b85\u8cfc\u5165\u5f8c\u3082\u6708 3\u4e07\u5186\u4ee5\u4e0a\u3092\u975e\u8ab2\u7a0e\u53e3\u5ea7\u3067\u7a4d\u7acb\u904b\u7528\u3057\u3001\u8001\u5f8c\u8cc7\u7523\u3092\u5f62\u6210\u3057\u307e\u3057\u3087\u3046\u3002' },
        { priority: 5, title: '\u751f\u547d\u4fdd\u967a\u30fb\u56e3\u4fe1\u306e\u898b\u76f4\u3057', detail: '\u4f4f\u5b85\u30ed\u30fc\u30f3\u52a0\u5165\u6642\u306f\u56e3\u4fe1\u304c\u4ed8\u5e2f\u3057\u307e\u3059\u3002\u65e2\u5b58\u306e\u751f\u547d\u4fdd\u967a\u3068\u306e\u91cd\u8907\u3092\u6574\u7406\u3057\u3001\u4fdd\u967a\u6599\u3092\u6700\u9069\u5316\u3057\u307e\u3057\u3087\u3046\u3002' },
      ];
    }

    var colors = { 1:'pri-1', 2:'pri-2', 3:'pri-3', 4:'pri-4', 5:'pri-5' };

    var html = '';
    html += '<div class="page-break"></div>';
    html += '<div class="a4-page">';
    html += '<div class="page-header">';
    html += '  <div class="logo-line">LIFE DESIGN PARTNER \u2014 AFP LIFE PLANNING</div>';
    html += '  <div class="page-title">\u3054\u63d0\u6848\u307e\u3068\u3081</div>';
    html += '</div>';

    // アクションプラン
    html += '<div class="section-title">\u512a\u5148\u30a2\u30af\u30b7\u30e7\u30f3\u30d7\u30e9\u30f3</div>';
    html += '<div class="action-list">';
    actions.slice(0, 5).forEach(function(a, i) {
      var priClass = colors[a.priority || (i+1)] || 'pri-3';
      html += '<div class="action-item">';
      html += '  <div class="action-num ' + priClass + '">' + (a.priority || i+1) + '</div>';
      html += '  <div class="action-body">';
      html += '    <strong>' + _esc(a.title || '') + '</strong>';
      html += '    <span>' + _esc(a.detail || '') + '</span>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div>';

    // 重要まとめボックス
    html += '<div class="highlight-box" style="margin:4mm 0;">';
    html += '  <div style="font-size:10pt;font-weight:700;color:#c9a84c;margin-bottom:2mm;">' + name + ' \u69d8\u3078\u306e\u3054\u63d0\u6848\u8981\u7d04</div>';
    var summary = rec.summary || (af.recommendation || '\u8a73\u7d30\u306a\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u30cb\u30f3\u30b0\u3092\u3054\u4e00\u7dd2\u306b\u9032\u3081\u307e\u3057\u3087\u3046\u3002');
    html += '  <div style="font-size:9pt;color:rgba(255,255,255,0.85);line-height:1.7;">' + _esc(summary) + '</div>';
    html += '</div>';

    // 免責事項
    html += '<div class="disclaimer-box">';
    html += '\u3010\u91cd\u8981\u4e8b\u9805\u3011\u672c\u8cc7\u6599\u306f\u30e9\u30a4\u30d5\u30d7\u30e9\u30f3\u30cb\u30f3\u30b0\u306e\u53c2\u8003\u60c5\u5831\u3068\u3057\u3066\u4f5c\u6210\u3055\u308c\u305f\u3082\u306e\u3067\u3042\u308a\u3001\u6295\u8cc7\u30fb\u91d1\u878d\u5546\u54c1\u306e\u52e7\u8a98\u3092\u76ee\u7684\u3068\u3059\u308b\u3082\u306e\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u8a18\u8f09\u306e\u6570\u5024\u306f\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u3067\u3042\u308a\u3001\u5b9f\u969b\u306e\u7d50\u679c\u3092\u4fdd\u8a3c\u3059\u308b\u3082\u306e\u3067\u306f\u3054\u3056\u3044\u307e\u305b\u3093\u3002\u4f4f\u5b85\u30ed\u30fc\u30f3\u306e\u5be9\u67fb\u7d50\u679c\u306f\u91d1\u878d\u6a5f\u95a2\u306e\u5224\u65ad\u306b\u3088\u308a\u307e\u3059\u3002\u7a0e\u5236\u3084\u5236\u5ea6\u306f\u5909\u66f4\u3055\u308c\u308b\u5834\u5408\u304c\u3042\u308a\u307e\u3059\u3002\u5177\u4f53\u7684\u306a\u3054\u691c\u8a0e\u306e\u969b\u306f\u3001\u5c02\u9580\u5bb6\u306b\u3054\u76f8\u8ac7\u304f\u3060\u3055\u3044\u3002';
    html += '</div>';

    // 署名欄
    html += '<table class="sign-table">';
    html += '<tr><th>\u4f5c\u6210\u65e5</th><td>' + _esc(d.reportDate || new Date().toLocaleDateString('ja-JP')) + '</td><th>\u62c5\u5f53\u8005</th><td></td></tr>';
    html += '<tr><th>\u304a\u5ba2\u69d8\u78ba\u8a8d</th><td colspan="3" style="height:12mm;"></td></tr>';
    html += '</table>';

    html += '<div class="page-footer"><span>LIFE DESIGN PARTNER</span><span>' + _esc(d.reportDate||'') + '</span><span>6 / 6</span></div>';
    html += '</div>';
    return html;
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
    if (!win) { alert('\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u30d6\u30ed\u30c3\u30af\u3055\u308c\u307e\u3057\u305f\u3002\u30d6\u30e9\u30a6\u30b6\u306e\u8a2d\u5b9a\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u8a31\u53ef\u3057\u3066\u304f\u3060\u3055\u3044\u3002'); return; }
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
    if (!win) { alert('\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u304c\u30d6\u30ed\u30c3\u30af\u3055\u308c\u307e\u3057\u305f\u3002\u30d6\u30e9\u30a6\u30b6\u306e\u8a2d\u5b9a\u3067\u30dd\u30c3\u30d7\u30a2\u30c3\u30d7\u3092\u8a31\u53ef\u3057\u3066\u304f\u3060\u3055\u3044\u3002'); }
    // Revoke the object URL after the tab has had time to load
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  };

  return RG;
})();
