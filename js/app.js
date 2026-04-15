/**
 * LIFE DESIGN PARTNER - Main Application Controller
 * AFP (Affiliated Financial Planner) 対応 不動産ライフプランニングシステム
 *
 * PsychologyEngine、FinancialEngine、ReportGenerator を統合し、
 * UI全体のナビゲーション・状態管理・フォーム操作を担当します。
 */

var App = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 状態管理
  // ---------------------------------------------------------------------------

  var state = {
    currentSection: 'dashboard',
    clients: [],
    currentClient: null,
    psychologyResults: null,
    financialResults: null,
    isDirty: false,
    activeFinancialTab: 0,
    financialCharts: {}
  };

  // ---------------------------------------------------------------------------
  // 初期化
  // ---------------------------------------------------------------------------

  function init() {
    loadData();
    setupNavigation();
    setupForms();
    showSection('dashboard');
    if (typeof ReportGenerator !== 'undefined' && typeof ReportGenerator.initFont === 'function') {
      ReportGenerator.initFont();
    }
  }

  // ---------------------------------------------------------------------------
  // ナビゲーション
  // ---------------------------------------------------------------------------

  function setupNavigation() {
    var navItems = document.querySelectorAll('[data-section]');
    navItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var target = item.getAttribute('data-section');
        showSection(target);
      });
    });
  }

  var SECTION_LABELS = {
    'dashboard':    'ダッシュボード',
    'client-input': 'クライアント情報',
    'psychology':   '心理分析',
    'financial':    'ファイナンシャル分析',
    'lifeplan':     'ライフプラン',
    'report':       'レポート出力'
  };

  function showSection(sectionId) {
    // すべてのセクションを非表示
    var sections = document.querySelectorAll('.section');
    sections.forEach(function (s) {
      s.classList.add('hidden');
      s.classList.remove('active');
    });

    // 対象セクションを表示
    var target = document.getElementById('section-' + sectionId);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    // サイドバーのアクティブ状態を更新
    var navItems = document.querySelectorAll('[data-section]');
    navItems.forEach(function (item) {
      item.classList.remove('active');
      if (item.getAttribute('data-section') === sectionId) {
        item.classList.add('active');
      }
    });

    // ヘッダーのパンくずを更新
    var headerTitle = document.getElementById('header-title');
    if (headerTitle) {
      headerTitle.textContent = SECTION_LABELS[sectionId] || sectionId;
    }

    state.currentSection = sectionId;

    // セクション固有の描画
    switch (sectionId) {
      case 'dashboard':    renderDashboard();    break;
      case 'client-input': renderClientInput();  break;
      case 'psychology':   renderPsychology();   break;
      case 'financial':    renderFinancial();    break;
      case 'lifeplan':     renderLifePlan();     break;
      case 'report':       renderReport();       break;
    }

    updateNavBadges();
  }

  function updateNavBadges() {
    var badges = {
      'client-input': state.currentClient,
      'psychology':   state.psychologyResults,
      'financial':    state.financialResults && Object.keys(state.financialResults).length > 0,
      'lifeplan':     state.financialResults && state.currentClient,
      'report':       state.financialResults && state.currentClient
    };
    Object.keys(badges).forEach(function(section) {
      var navItem = document.querySelector('.nav-item[data-section="' + section + '"]');
      if (!navItem) return;
      var existing = navItem.querySelector('.nav-progress-icon');
      if (existing) existing.remove();
      if (badges[section]) {
        var icon = document.createElement('span');
        icon.className = 'material-icons nav-progress-icon';
        icon.textContent = 'check_circle';
        navItem.appendChild(icon);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // フォームセットアップ
  // ---------------------------------------------------------------------------

  function setupForms() {
    // クライアント保存ボタン
    var saveBtn = document.getElementById('btn-save-client');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        saveClient();
      });
    }

    // 新規クライアントボタン
    var newBtn = document.getElementById('btn-new-client');
    if (newBtn) {
      newBtn.addEventListener('click', function (e) {
        e.preventDefault();
        newClient();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // ダッシュボード
  // ---------------------------------------------------------------------------

  function renderDashboard() {
    var container = document.getElementById('dashboard-content');
    if (!container) return;

    var totalClients = state.clients.length;
    var recentCount = state.clients.filter(function(c) {
      return (new Date() - new Date(c.updatedAt)) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    // time-based greeting
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'おはようございます' : hour < 17 ? 'こんにちは' : 'お疲れ様です';
    var dateStr = new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

    var html = '';

    // ── ヒーローバナー ──────────────────────────────────────────────────────────
    html += '<div class="db-hero">';
    html += '  <div class="db-hero-orb db-orb-1"></div>';
    html += '  <div class="db-hero-orb db-orb-2"></div>';
    html += '  <div class="db-hero-orb db-orb-3"></div>';
    html += '  <div class="db-hero-content">';
    html += '    <div class="db-hero-eyebrow"><span class="db-hero-dot"></span>LIFE DESIGN PARTNER  ·  AFP System</div>';
    html += '    <div class="db-hero-greeting">' + greeting + '、パートナー</div>';
    html += '    <div class="db-hero-sub">今日も最高のライフプランを提案しましょう</div>';
    html += '    <div class="db-hero-date">' + dateStr + '</div>';
    html += '  </div>';
    html += '  <div class="db-hero-badge">';
    html += '    <div class="db-hero-badge-icon"><span class="material-icons">auto_awesome</span></div>';
    html += '    <div class="db-hero-badge-text">AI分析エンジン<br><span>稼働中</span></div>';
    html += '  </div>';
    html += '</div>';

    // ── KPI カード ──────────────────────────────────────────────────────────────
    html += '<div class="db-kpi-row">';

    // カード1: 登録クライアント数
    html += '<div class="db-kpi-card db-kpi-blue">';
    html += '  <div class="db-kpi-icon-wrap"><span class="material-icons">people</span></div>';
    html += '  <div class="db-kpi-body">';
    html += '    <div class="db-kpi-value" data-count="' + totalClients + '">' + totalClients + '</div>';
    html += '    <div class="db-kpi-label">登録クライアント</div>';
    html += '  </div>';
    html += '  <div class="db-kpi-glow"></div>';
    html += '</div>';

    // カード2: 今週の更新
    html += '<div class="db-kpi-card db-kpi-gold">';
    html += '  <div class="db-kpi-icon-wrap"><span class="material-icons">update</span></div>';
    html += '  <div class="db-kpi-body">';
    html += '    <div class="db-kpi-value" data-count="' + recentCount + '">' + recentCount + '</div>';
    html += '    <div class="db-kpi-label">今週の更新</div>';
    html += '  </div>';
    html += '  <div class="db-kpi-glow"></div>';
    html += '</div>';

    // カード3: 現在選択中クライアント
    html += '<div class="db-kpi-card db-kpi-teal">';
    html += '  <div class="db-kpi-icon-wrap"><span class="material-icons">person_pin</span></div>';
    html += '  <div class="db-kpi-body">';
    html += '    <div class="db-kpi-value db-kpi-name">' + (state.currentClient ? _escape(state.currentClient.name) : '未選択') + '</div>';
    html += '    <div class="db-kpi-label">対応中クライアント</div>';
    html += '  </div>';
    html += '  <div class="db-kpi-glow"></div>';
    html += '</div>';

    // カード4: 新規ボタンカード
    html += '<div class="db-kpi-card db-kpi-action" onclick="App.newClient()" style="cursor:pointer">';
    html += '  <div class="db-kpi-icon-wrap"><span class="material-icons">person_add</span></div>';
    html += '  <div class="db-kpi-body">';
    html += '    <div class="db-kpi-value" style="font-size:1.1rem">新規登録</div>';
    html += '    <div class="db-kpi-label">クライアントを追加</div>';
    html += '  </div>';
    html += '  <div class="db-kpi-glow"></div>';
    html += '</div>';

    html += '</div>'; // db-kpi-row

    // ── ワークフローパイプライン ────────────────────────────────────────────────
    if (totalClients > 0) {
      var stageData = [
        { label: '情報入力', icon: 'edit_note', count: totalClients },
        { label: '心理分析', icon: 'psychology', count: state.psychologyResults ? 1 : 0 },
        { label: 'FA分析', icon: 'bar_chart', count: state.financialResults && Object.keys(state.financialResults).length > 0 ? 1 : 0 },
        { label: 'レポート出力', icon: 'description', count: state.financialResults && state.currentClient ? 1 : 0 }
      ];
      var maxStage = totalClients || 1;

      html += '<div class="db-pipeline-card">';
      html += '  <div class="db-pipeline-header">';
      html += '    <span class="material-icons">account_tree</span>';
      html += '    <span>ワークフロー パイプライン</span>';
      html += '  </div>';
      html += '  <div class="db-pipeline-stages">';
      stageData.forEach(function(stage, idx) {
        var pct = Math.round((stage.count / maxStage) * 100);
        html += '  <div class="db-pipeline-stage">';
        html += '    <div class="db-pipeline-stage-top">';
        html += '      <div class="db-pipeline-stage-icon ' + (stage.count > 0 ? 'active' : '') + '">';
        html += '        <span class="material-icons">' + stage.icon + '</span>';
        html += '      </div>';
        html += '      <div class="db-pipeline-stage-count">' + stage.count + '名</div>';
        html += '    </div>';
        html += '    <div class="db-pipeline-bar-wrap">';
        html += '      <div class="db-pipeline-bar-fill" style="width:' + pct + '%"></div>';
        html += '    </div>';
        html += '    <div class="db-pipeline-stage-label">' + stage.label + '</div>';
        html += '  </div>';
        if (idx < stageData.length - 1) {
          html += '  <div class="db-pipeline-arrow"><span class="material-icons">arrow_forward_ios</span></div>';
        }
      });
      html += '  </div>';
      html += '</div>';
    }

    // ── クライアント一覧（カードグリッド） ────────────────────────────────────
    html += '<div class="db-section-header">';
    html += '  <div class="db-section-title"><span class="material-icons">group</span>クライアント一覧</div>';
    html += '  <button class="btn-primary btn-sm" onclick="App.newClient()"><span class="material-icons" style="font-size:14px;vertical-align:middle">add</span> 新規追加</button>';
    html += '</div>';

    if (state.clients.length === 0) {
      html += '<div class="db-empty">';
      html += '  <div class="db-empty-icon"><span class="material-icons">person_search</span></div>';
      html += '  <div class="db-empty-title">クライアントが未登録です</div>';
      html += '  <div class="db-empty-sub">まず最初のクライアントを登録して、ライフプランニングを開始しましょう。</div>';
      html += '  <button class="btn-primary btn-large" onclick="App.newClient()">最初のクライアントを登録</button>';
      html += '</div>';
    } else {
      html += '<div class="db-client-grid">';
      state.clients.forEach(function(c) {
        var isActive = state.currentClient && state.currentClient.id === c.id;
        var purposeLabel = {
          'buy_first': '初回購入', 'buy_upgrade': '住み替え',
          'buy_investment': '投資用', 'rent': '賃貸検討'
        }[c.purpose] || '未設定';
        var purposeColor = {
          'buy_first': 'db-badge-blue', 'buy_upgrade': 'db-badge-gold',
          'buy_investment': 'db-badge-teal', 'rent': 'db-badge-gray'
        }[c.purpose] || 'db-badge-gray';

        var initials = (c.name || '?').slice(0, 2);
        var ageStr = c.age ? c.age + '歳' : '-';
        var incomeStr = c.annualIncome ? Math.round(c.annualIncome / 10000) + '万円' : '-';

        html += '<div class="db-client-card ' + (isActive ? 'db-client-card-active' : '') + '">';
        html += '  <div class="db-client-card-header">';
        html += '    <div class="db-client-avatar">' + _escape(initials) + '</div>';
        html += '    <div class="db-client-meta">';
        html += '      <div class="db-client-name">' + _escape(c.name) + ' 様</div>';
        html += '      <div class="db-client-sub">' + ageStr + ' · ' + _escape(c.occupation || '-') + '</div>';
        html += '    </div>';
        if (isActive) html += '<div class="db-client-active-badge"><span class="material-icons">radio_button_checked</span>対応中</div>';
        html += '  </div>';
        html += '  <div class="db-client-card-body">';
        html += '    <div class="db-client-stat"><span>年収</span><strong>' + incomeStr + '</strong></div>';
        html += '    <div class="db-client-stat"><span>更新</span><strong>' + _formatDate(c.updatedAt) + '</strong></div>';
        html += '  </div>';
        html += '  <div class="db-client-card-footer">';
        html += '    <span class="db-badge ' + purposeColor + '">' + purposeLabel + '</span>';
        html += '    <div class="db-client-actions">';
        html += '      <button class="btn-sm btn-primary" onclick="App.selectClient(\'' + c.id + '\')">選択</button>';
        html += '      <button class="btn-sm btn-danger" onclick="App.deleteClient(\'' + c.id + '\')">削除</button>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
      });
      html += '</div>'; // db-client-grid
    }

    container.innerHTML = html;

    // カウントアップアニメーション
    container.querySelectorAll('.db-kpi-value[data-count]').forEach(function(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target) || target === 0) return;
      var start = 0;
      var duration = 800;
      var startTime = null;
      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        el.textContent = Math.round(start + (target - start) * ease);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function _statCard(label, value, cssClass) {
    return '<div class="stat-card ' + (cssClass || '') + '">'
      + '<div class="stat-value">' + value + '</div>'
      + '<div class="stat-label">' + label + '</div>'
      + '</div>';
  }

  function _modelCaseBtn(label, emoji, caseId, sub) {
    return '<button type="button" class="model-case-btn" onclick="App.applyModelCase(\'' + caseId + '\')">' +
      '<span class="model-case-emoji">' + emoji + '</span>' +
      '<span class="model-case-label">' + label + '</span>' +
      '<span class="model-case-sub">' + sub + '</span>' +
      '</button>';
  }

  function applyModelCase(caseId) {
    var cases = {
      single_f_34: { name: '', age: 34, gender: 'female', occupation: '会社員', maritalStatus: 'single', children: 0, annualIncome: 500, spouseIncome: 0, savings: 150, currentHousing: 'rent', currentRent: 9.5, purpose: 'buy_first', notes: '単身女性・賃貸からの初購入検討' },
      single_m_32: { name: '', age: 32, gender: 'male',   occupation: '会社員', maritalStatus: 'single', children: 0, annualIncome: 450, spouseIncome: 0, savings: 120, currentHousing: 'rent', currentRent: 8.5, purpose: 'buy_first', notes: '単身男性・初購入検討' },
      couple_35:   { name: '', age: 35, gender: 'male',   occupation: '会社員', maritalStatus: 'married', children: 0, annualIncome: 600, spouseIncome: 500, savings: 300, currentHousing: 'rent', currentRent: 12, purpose: 'buy_first', notes: '共働き夫婦・住宅購入検討' },
      family_38:   { name: '', age: 38, gender: 'male',   occupation: '会社員', maritalStatus: 'married', children: 1, annualIncome: 600, spouseIncome: 300, savings: 400, currentHousing: 'rent', currentRent: 12, purpose: 'buy_upgrade', notes: '子育て世帯・住み替え検討' },
      family_42:   { name: '', age: 42, gender: 'male',   occupation: '会社員', maritalStatus: 'married', children: 2, annualIncome: 750, spouseIncome: 450, savings: 800, currentHousing: 'own', currentRent: 0, purpose: 'buy_upgrade', notes: 'ファミリー・住み替え・売却検討' },
      senior_55:   { name: '', age: 55, gender: 'male',   occupation: '会社員', maritalStatus: 'married', children: 0, annualIncome: 700, spouseIncome: 0, savings: 2000, currentHousing: 'own', currentRent: 0, purpose: 'buy_upgrade', notes: '子供独立・住み替え・老後準備' }
    };
    var mc = cases[caseId];
    if (!mc) return;

    var setVal = function(id, val) { var el = document.getElementById(id); if (el) el.value = val; };
    var setRadio = function(name, val) { var el = document.querySelector('input[name="' + name + '"][value="' + val + '"]'); if (el) el.checked = true; };

    if (mc.age)            setVal('client-age', mc.age);
    if (mc.occupation)     setVal('client-occupation', mc.occupation);
    if (mc.annualIncome)   setVal('client-income', mc.annualIncome);
    if (mc.spouseIncome !== undefined) setVal('spouse-income', mc.spouseIncome);
    if (mc.savings)        setVal('client-savings', mc.savings);
    if (mc.currentRent)    setVal('current-rent', mc.currentRent);
    if (mc.children !== undefined) setVal('client-children', mc.children);
    if (mc.gender)         setRadio('gender', mc.gender);
    if (mc.maritalStatus)  setRadio('marital', mc.maritalStatus);
    if (mc.currentHousing) setRadio('current-housing', mc.currentHousing);
    if (mc.purpose)        setRadio('purpose', mc.purpose);
    if (mc.notes)          setVal('client-notes', mc.notes);

    showAlert('モデルケースを入力しました。お名前などを確認してください。', 'info');
  }

  function _renderHousingRatioZone(ratio) {
    var zones = [
      { max: 15,  label: '余裕あり（理想的）',    color: '#1b5e20', bg: '#e8f5e9', icon: 'sentiment_very_satisfied' },
      { max: 20,  label: '安全圏',               color: '#2e7d32', bg: '#f1f8f1', icon: 'check_circle' },
      { max: 25,  label: '標準（推奨上限）',       color: '#f57f17', bg: '#fff8e1', icon: 'info' },
      { max: 30,  label: '注意が必要',            color: '#e65100', bg: '#fff3e0', icon: 'warning' },
      { max: 35,  label: '高負担',               color: '#b71c1c', bg: '#ffebee', icon: 'error' },
      { max: 999, label: '超高負担（要見直し）',   color: '#880e4f', bg: '#fce4ec', icon: 'cancel' }
    ];
    var currentZone = zones.filter(function(z) { return ratio <= z.max; })[0] || zones[zones.length - 1];
    var barPct = Math.min(100, Math.round((ratio / 40) * 100));

    var html = '<div class="housing-ratio-widget">';
    html += '<div class="housing-ratio-title"><span class="material-icons">home</span>住居費比率 安全ライン診断</div>';

    html += '<div class="housing-ratio-bar-area">';
    html += '<div class="housing-ratio-bar-track">';
    html += '<div class="housing-ratio-zone-safe"    style="width:37.5%"></div>';
    html += '<div class="housing-ratio-zone-moderate" style="width:25%"></div>';
    html += '<div class="housing-ratio-zone-risky"   style="width:37.5%"></div>';
    html += '<div class="housing-ratio-pointer" style="left:' + Math.min(95, barPct) + '%">' +
      '<div class="housing-ratio-pointer-line"></div>' +
      '<div class="housing-ratio-pointer-label">' + ratio.toFixed(1) + '%</div>' +
      '</div>';
    html += '</div>';
    html += '<div class="housing-ratio-bar-labels">';
    html += '<span>0%</span><span>15%</span><span>25%</span><span>35%</span><span>40%+</span>';
    html += '</div>';
    html += '</div>';

    html += '<div class="housing-ratio-verdict" style="background:' + currentZone.bg + ';border-left:4px solid ' + currentZone.color + '">';
    html += '<span class="material-icons" style="color:' + currentZone.color + '">' + currentZone.icon + '</span>';
    html += '<div>';
    html += '<div class="housing-ratio-verdict-title" style="color:' + currentZone.color + '">現在の住居費比率 <strong>' + ratio.toFixed(1) + '%</strong> ：' + currentZone.label + '</div>';
    html += '<div class="housing-ratio-verdict-sub">業界標準: 月収の25%以内を推奨。20%以下が理想的です。</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="housing-ratio-zones">';
    var zoneDisplay = [
      { range: '〜15%', label: '余裕あり（理想）',   color: '#1b5e20' },
      { range: '〜20%', label: '安全圏（推奨）',      color: '#2e7d32' },
      { range: '〜25%', label: '標準（上限目安）',    color: '#f57f17' },
      { range: '〜30%', label: '注意が必要',          color: '#e65100' },
      { range: '30%〜', label: '高負担（要見直し）',  color: '#b71c1c' }
    ];
    zoneDisplay.forEach(function(z) {
      var isCurrent = (ratio <= 15 && z.range === '〜15%') ||
        (ratio > 15 && ratio <= 20 && z.range === '〜20%') ||
        (ratio > 20 && ratio <= 25 && z.range === '〜25%') ||
        (ratio > 25 && ratio <= 30 && z.range === '〜30%') ||
        (ratio > 30 && z.range === '30%〜');
      html += '<div class="housing-ratio-zone-item' + (isCurrent ? ' current' : '') + '">';
      html += '<span class="housing-ratio-zone-dot" style="background:' + z.color + '"></span>';
      html += '<span class="housing-ratio-zone-range">' + z.range + '</span>';
      html += '<span class="housing-ratio-zone-label">' + z.label + '</span>';
      if (isCurrent) html += '<span class="housing-ratio-zone-you">← あなた</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
    return html;
  }

  function _renderBuyAdvantageSection(rvb) {
    if (!rvb) return '';
    var breakEven = rvb.breakEvenYear || 10;
    var totalRentCost = rvb.totalRentCost || 0;
    var totalBuyCost = rvb.totalBuyCost || 0;
    var saving30yr = totalRentCost - totalBuyCost;
    var propertyValue = rvb.propertyPrice || 0;
    var netAsset = propertyValue * 0.5;

    var html = '<div class="buy-advantage-card">';
    html += '<div class="buy-advantage-header">';
    html += '<span class="material-icons">emoji_events</span>';
    html += '<span>自宅購入が圧倒的に有利な理由</span>';
    html += '<span class="buy-advantage-sub">〜賃貸と購入の30年間シミュレーション〜</span>';
    html += '</div>';

    html += '<div class="buy-advantage-grid">';

    html += '<div class="buy-adv-item">';
    html += '<div class="buy-adv-icon buy-adv-icon-gold"><span class="material-icons">account_balance</span></div>';
    html += '<div class="buy-adv-title">資産として残る</div>';
    html += '<div class="buy-adv-value">' + formatMan(netAsset) + '</div>';
    html += '<div class="buy-adv-desc">30年後も不動産という資産が残ります。賃貸は家賃を払い続けても何も残りません。</div>';
    html += '</div>';

    var taxBenefit = Math.min(propertyValue * 0.007 * 10, 4000000);
    html += '<div class="buy-adv-item">';
    html += '<div class="buy-adv-icon buy-adv-icon-blue"><span class="material-icons">savings</span></div>';
    html += '<div class="buy-adv-title">住宅ローン控除</div>';
    html += '<div class="buy-adv-value">' + formatMan(taxBenefit) + '</div>';
    html += '<div class="buy-adv-desc">年末ローン残高×0.7%を最大13年間、所得税・住民税から控除。実質コストが大幅削減。</div>';
    html += '</div>';

    html += '<div class="buy-adv-item">';
    html += '<div class="buy-adv-icon buy-adv-icon-green"><span class="material-icons">elderly</span></div>';
    html += '<div class="buy-adv-title">老後の住居費ゼロ</div>';
    html += '<div class="buy-adv-value">月' + formatMan(rvb.monthlyRent || 0) + '節約</div>';
    html += '<div class="buy-adv-desc">ローン完済後は住居費がほぼゼロ。年金生活への移行がスムーズになります。</div>';
    html += '</div>';

    html += '</div>';

    html += '<div class="buy-advantage-breakeven">';
    html += '<div class="buy-adv-be-icon"><span class="material-icons">schedule</span></div>';
    html += '<div>';
    html += '<div class="buy-adv-be-title">損益分岐点: 購入後 <strong>' + breakEven + '年目</strong> で賃貸より有利に</div>';
    if (saving30yr > 0) {
      html += '<div class="buy-adv-be-sub">30年間での累計差額: <strong class="buy-adv-be-amount">約' + formatMan(saving30yr) + 'お得</strong></div>';
    } else {
      html += '<div class="buy-adv-be-sub">長期保有でコスト最適化が期待されます</div>';
    }
    html += '</div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------------
  // クライアント入力セクション
  // ---------------------------------------------------------------------------

  function renderClientInput() {
    var container = document.getElementById('client-input-content');
    if (!container) return;

    var c = state.currentClient;

    var html = '<div class="card">';
    html += '<div class="card-header">';
    html += '<h2>' + (c ? 'クライアント情報の編集' : '新規クライアント登録') + '</h2>';
    if (c) html += '<p class="text-secondary">現在編集中: <strong>' + _escape(c.name) + '</strong> 様</p>';
    html += '</div>';
    html += '<div class="card-body">';
    html += '<form id="client-form" onsubmit="return false;">';

    // 基本情報
    html += '<div class="form-section"><h3>基本情報</h3>';
    html += _formRow('お名前', '<input type="text" id="client-name" class="form-control" placeholder="山田 太郎" value="' + _esc(c && c.name) + '" required>');
    html += _formRow('フリガナ', '<input type="text" id="client-name-kana" class="form-control" placeholder="ヤマダ タロウ" value="' + _esc(c && c.nameKana) + '">');
    html += _formRow('年齢', '<input type="number" id="client-age" class="form-control form-control-sm" min="18" max="80" value="' + (c && c.age || '') + '">');
    html += _formRow('性別',
      '<label class="radio-inline"><input type="radio" name="gender" value="male"' + _checked(c && c.gender === 'male') + '> 男性</label>' +
      '<label class="radio-inline"><input type="radio" name="gender" value="female"' + _checked(c && c.gender === 'female') + '> 女性</label>' +
      '<label class="radio-inline"><input type="radio" name="gender" value="other"' + _checked(c && c.gender === 'other') + '> その他</label>'
    );
    html += _formRow('職業', '<input type="text" id="client-occupation" class="form-control" placeholder="会社員、自営業など" value="' + _esc(c && c.occupation) + '">');
    html += '</div>';

    // 家族構成
    html += '<div class="form-section"><h3>家族構成</h3>';
    html += _formRow('婚姻状況',
      '<label class="radio-inline"><input type="radio" name="marital" value="single"' + _checked(c && c.maritalStatus === 'single') + '> 独身</label>' +
      '<label class="radio-inline"><input type="radio" name="marital" value="married"' + _checked(c && c.maritalStatus === 'married') + '> 既婚</label>' +
      '<label class="radio-inline"><input type="radio" name="marital" value="divorced"' + _checked(c && c.maritalStatus === 'divorced') + '> 離別</label>'
    );
    html += _formRow('お子様の人数', '<input type="number" id="client-children" class="form-control form-control-sm" min="0" max="10" value="' + (c && c.children || 0) + '">');
    html += _formRow('お子様の年齢', '<input type="text" id="client-children-ages" class="form-control" placeholder="例: 5歳、8歳" value="' + _esc(c && c.childrenAges) + '">');
    html += '</div>';

    // 収入・資産
    html += '<div class="form-section"><h3>収入・資産状況</h3>';
    html += _formRow('本人年収（万円）',
      '<div class="income-stepper">' +
      '<button type="button" class="income-step-btn" onclick="(function(){var el=document.getElementById(\'client-income\');el.value=Math.max(0,(parseInt(el.value)||0)-10);})()">−</button>' +
      '<input type="number" id="client-income" class="form-control income-step-input" step="10" min="0" max="5000" placeholder="500" value="' + (c && c.annualIncome ? Math.round(c.annualIncome / 10000) : '') + '">' +
      '<button type="button" class="income-step-btn" onclick="(function(){var el=document.getElementById(\'client-income\');el.value=(parseInt(el.value)||0)+10;})()">＋</button>' +
      '<span class="income-step-label">万円/年</span>' +
      '</div>'
    );
    html += _formRow('配偶者年収（万円）',
      '<div class="income-stepper">' +
      '<button type="button" class="income-step-btn" onclick="(function(){var el=document.getElementById(\'spouse-income\');el.value=Math.max(0,(parseInt(el.value)||0)-10);})()">−</button>' +
      '<input type="number" id="spouse-income" class="form-control income-step-input" step="10" min="0" max="5000" placeholder="0" value="' + (c && c.spouseIncome ? Math.round(c.spouseIncome / 10000) : '') + '">' +
      '<button type="button" class="income-step-btn" onclick="(function(){var el=document.getElementById(\'spouse-income\');el.value=(parseInt(el.value)||0)+10;})()">＋</button>' +
      '<span class="income-step-label">万円/年</span>' +
      '</div>'
    );
    html += _formRow('現在の貯蓄額（万円）', '<input type="number" id="client-savings" class="form-control form-control-sm" min="0" placeholder="200" value="' + (c && c.savings ? Math.round(c.savings / 10000) : '') + '">');
    html += '</div>';

    // 住まい・希望
    html += '<div class="form-section"><h3>現在の住まい・ご希望</h3>';
    html += _formRow('現在の住まい',
      '<label class="radio-inline"><input type="radio" name="current-housing" value="rent"' + _checked(c && c.currentHousing === 'rent') + '> 賃貸</label>' +
      '<label class="radio-inline"><input type="radio" name="current-housing" value="own"' + _checked(c && c.currentHousing === 'own') + '> 持ち家</label>' +
      '<label class="radio-inline"><input type="radio" name="current-housing" value="family"' + _checked(c && c.currentHousing === 'family') + '> 実家・家族と同居</label>'
    );
    html += _formRow('現在の家賃（万円/月）', '<input type="number" id="current-rent" class="form-control form-control-sm" min="0" placeholder="8" value="' + (c && c.currentRent ? Math.round(c.currentRent / 10000) : '') + '">');
    html += _formRow('希望エリア', '<input type="text" id="desired-area" class="form-control" placeholder="東京都世田谷区など" value="' + _esc(c && c.desiredArea) + '">');
    html += _formRow('検討目的',
      '<label class="radio-inline"><input type="radio" name="purpose" value="buy_first"' + _checked(c && c.purpose === 'buy_first') + '> 初めての購入</label>' +
      '<label class="radio-inline"><input type="radio" name="purpose" value="buy_upgrade"' + _checked(c && c.purpose === 'buy_upgrade') + '> 住み替え</label>' +
      '<label class="radio-inline"><input type="radio" name="purpose" value="buy_investment"' + _checked(c && c.purpose === 'buy_investment') + '> 投資用</label>' +
      '<label class="radio-inline"><input type="radio" name="purpose" value="rent"' + _checked(c && c.purpose === 'rent') + '> 賃貸検討</label>'
    );
    html += _formRow('備考・メモ', '<textarea id="client-notes" class="form-control" rows="3" placeholder="相談内容、要望、注意点など">' + _escape(c && c.notes || '') + '</textarea>');
    html += '</div>';

    html += '<div class="form-actions">';
    html += '<button class="btn-primary btn-large" onclick="App.saveClient()">保存する</button>';
    if (c) {
      html += '<button class="btn-secondary" onclick="App.newClient()" style="margin-left:1rem">新規入力に切り替え</button>';
    }
    html += '</div>';
    html += '</form></div></div>';

    // モデルケース選択パネル（フォームの前に挿入）
    html = '<div class="model-case-panel">' +
      '<div class="model-case-header"><span class="material-icons">people_alt</span>よくあるモデルケースから入力（参考値として自動入力）</div>' +
      '<div class="model-case-grid">' +
      _modelCaseBtn('単身女性 34歳', '🏢', 'single_f_34', '年収500万・賃貸・独身') +
      _modelCaseBtn('単身男性 32歳', '👔', 'single_m_32', '年収450万・賃貸・独身') +
      _modelCaseBtn('共働き夫婦 35歳', '👫', 'couple_35', '世帯1,100万・賃貸') +
      _modelCaseBtn('子育て世帯 38歳', '👨‍👩‍👦', 'family_38', '世帯900万・子供1人') +
      _modelCaseBtn('ファミリー 42歳', '🏡', 'family_42', '世帯1,200万・子供2人') +
      _modelCaseBtn('シニア単身 55歳', '🎯', 'senior_55', '年収700万・住み替え') +
      '</div></div>' + html;

    container.innerHTML = html;
  }

  function saveClient() {
    var nameEl = document.getElementById('client-name');
    if (!nameEl || !nameEl.value.trim()) {
      showAlert('お名前は必須項目です。', 'warning');
      return;
    }

    var incomeRaw  = parseFloat(document.getElementById('client-income').value) || 0;
    var spouseRaw  = parseFloat(document.getElementById('spouse-income').value) || 0;
    var savingsRaw = parseFloat(document.getElementById('client-savings').value) || 0;
    var rentRaw    = parseFloat(document.getElementById('current-rent').value) || 0;

    var client = {
      id:             state.currentClient ? state.currentClient.id : Date.now().toString(),
      name:           nameEl.value.trim(),
      nameKana:       (document.getElementById('client-name-kana').value || '').trim(),
      age:            parseInt(document.getElementById('client-age').value) || 0,
      gender:         _radioValue('gender'),
      occupation:     (document.getElementById('client-occupation').value || '').trim(),
      maritalStatus:  _radioValue('marital'),
      children:       parseInt(document.getElementById('client-children').value) || 0,
      childrenAges:   (document.getElementById('client-children-ages').value || '').trim(),
      annualIncome:   incomeRaw  * 10000,
      spouseIncome:   spouseRaw  * 10000,
      savings:        savingsRaw * 10000,
      currentHousing: _radioValue('current-housing'),
      currentRent:    rentRaw    * 10000,
      desiredArea:    (document.getElementById('desired-area').value || '').trim(),
      purpose:        _radioValue('purpose'),
      notes:          (document.getElementById('client-notes').value || '').trim(),
      createdAt:      (state.currentClient && state.currentClient.createdAt) || new Date().toISOString(),
      updatedAt:      new Date().toISOString()
    };

    var existingIdx = state.clients.findIndex(function (c) { return c.id === client.id; });
    if (existingIdx >= 0) {
      state.clients[existingIdx] = client;
    } else {
      state.clients.push(client);
    }

    state.currentClient = client;
    state.isDirty = false;
    saveData();
    updateHeader();
    updateNavBadges();
    showAlert(client.name + ' 様の情報を保存しました。', 'success');
  }

  function newClient() {
    state.currentClient    = null;
    state.psychologyResults = null;
    state.financialResults  = null;
    renderClientInput();
    updateHeader();
  }

  // ---------------------------------------------------------------------------
  // 心理分析セクション
  // ---------------------------------------------------------------------------

  function renderPsychology() {
    if (!state.currentClient) {
      showAlert('先にクライアント情報を登録してください。', 'warning');
      showSection('client-input');
      return;
    }

    var container = document.getElementById('psychology-content');
    if (!container) return;

    if (state.psychologyResults) {
      renderPsychologyResults(container);
    } else {
      renderPsychologyQuestionnaire(container);
    }
  }

  function renderPsychologyQuestionnaire(container) {
    var html = '<div class="card">';
    html += '<div class="card-header">';
    html += '<h2>行動心理分析</h2>';
    html += '<p class="text-secondary alert-internal">※ この分析結果は営業支援用です。クライアント向けレポートには含まれません。</p>';
    html += '</div><div class="card-body">';

    html += '<div class="psych-text-panel">';
    html += '<div class="psych-text-header">';
    html += '<span class="material-icons">record_voice_over</span>';
    html += '<div>';
    html += '<div class="psych-text-title">会話・発言記録から分析</div>';
    html += '<div class="psych-text-sub">相談者の発言ややり取りを入力してください。AIが人物タイプ・思考パターンを自動分析します。</div>';
    html += '</div>';
    html += '</div>';

    html += '<textarea id="psych-text-input" class="psych-textarea" ';
    html += 'placeholder="例：&#10;・「もっとよく調べてから決めたいです。他の物件も見てみたい。」&#10;';
    html += '・「家族と相談しないと決められないですね。」&#10;';
    html += '・「将来のことを考えると不安で...でも夢のマイホームだから」&#10;';
    html += '・「月々の支払いが今の家賃より安くなるなら検討したい」&#10;&#10;';
    html += '商談中のメモや会話の記録をそのまま貼り付けてもOKです。" ';
    html += 'rows="8"></textarea>';

    html += '<div class="psych-hint-row">';
    html += '<div class="psych-hint">💡 キーワード例: 慎重派→「調べてから」「比較したい」 / 理想型→「夢」「憧れ」 / 実用型→「月々」「コスト」 / 協調型→「家族と相談」「口コミ」</div>';
    html += '</div>';

    html += '<button class="btn-primary psych-analyze-btn" onclick="App.submitPsychology()">';
    html += '<span class="material-icons">psychology</span>';
    html += '会話を分析する';
    html += '</button>';
    html += '</div>';

    html += '</div></div>';
    container.innerHTML = html;
  }

  function submitPsychology() {
    if (!state.currentClient) { showAlert('クライアントを選択してください。', 'warning'); return; }
    var textarea = document.getElementById('psych-text-input');
    var text = textarea ? textarea.value.trim() : '';
    if (!text || text.length < 10) { showAlert('会話・発言内容を10文字以上入力してください。', 'warning'); return; }

    state.psychologyResults = PsychologyEngine.analyzeText(text, state.currentClient);
    saveData();

    var container = document.getElementById('psychology-content');
    if (container) renderPsychologyResults(container);
  }

  function renderPsychologyResults(container) {
    var r = state.psychologyResults;
    if (!r) return;

    var pt  = r.personalityType || {};
    var str = r.salesStrategy   || {};
    var html = '';

    // パーソナリティタイプカード
    html += '<div class="card analysis-result analysis-result-primary">';
    html += '<div class="card-header">';
    html += '<h2>パーソナリティタイプ: <span class="type-badge">' + _escape(pt.primaryTypeJa || pt.primaryType || '分析済') + '</span></h2>';
    html += '</div><div class="card-body">';
    if (pt.description) html += '<p>' + _escape(pt.description) + '</p>';

    if (pt.strengths && pt.strengths.length > 0) {
      html += '<div class="result-section"><h4>強み</h4><ul>';
      pt.strengths.forEach(function (s) { html += '<li>' + _escape(s) + '</li>'; });
      html += '</ul></div>';
    }
    if (pt.watchPoints && pt.watchPoints.length > 0) {
      html += '<div class="result-section"><h4>注意点</h4><ul>';
      pt.watchPoints.forEach(function (w) { html += '<li>' + _escape(w) + '</li>'; });
      html += '</ul></div>';
    }
    html += '</div></div>';

    // スコアレーダーチャート
    html += '<div class="card">';
    html += '<div class="card-header"><h3>スコア分布</h3></div>';
    html += '<div class="card-body chart-container">';
    html += '<canvas id="psychology-radar" width="400" height="300"></canvas>';
    html += '</div></div>';

    // 営業アプローチ推奨
    if (str && str.communicationStyle) {
      html += '<div class="card analysis-result analysis-result-secondary">';
      html += '<div class="card-header"><h3>営業アプローチ推奨</h3></div>';
      html += '<div class="card-body">';
      if (str.communicationStyle) {
        html += '<div class="result-section"><h4>コミュニケーションスタイル</h4>';
        html += '<p>' + _escape(str.communicationStyle) + '</p></div>';
      }
      if (str.keyMessages && str.keyMessages.length > 0) {
        html += '<div class="result-section"><h4>効果的なメッセージ</h4><ul>';
        str.keyMessages.forEach(function (m) { html += '<li>' + _escape(m) + '</li>'; });
        html += '</ul></div>';
      }
      if (str.ngActions && str.ngActions.length > 0) {
        html += '<div class="result-section"><h4>NGアクション</h4><ul class="ng-list">';
        str.ngActions.forEach(function (n) { html += '<li>' + _escape(n) + '</li>'; });
        html += '</ul></div>';
      }
      if (str.closingTips) {
        html += '<div class="result-section"><h4>クロージングのポイント</h4>';
        html += '<p>' + _escape(str.closingTips) + '</p></div>';
      }
      html += '</div></div>';
    }

    // バイアス検出
    if (r.biases && r.biases.length > 0) {
      html += '<div class="card">';
      html += '<div class="card-header"><h3>認知バイアス分析</h3></div>';
      html += '<div class="card-body">';
      r.biases.forEach(function (b) {
        html += '<div class="bias-item">';
        html += '<span class="bias-name">' + _escape(b.nameJa || b.name) + '</span>';
        html += '<span class="bias-level level-' + (b.level || 'medium') + '">' + _escape(b.levelJa || b.level || '') + '</span>';
        if (b.description) html += '<p class="bias-desc">' + _escape(b.description) + '</p>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 不安分析
    if (r.anxieties && r.anxieties.length > 0) {
      html += '<div class="card">';
      html += '<div class="card-header"><h3>不安・懸念事項の分析</h3></div>';
      html += '<div class="card-body">';
      r.anxieties.forEach(function (ax) {
        html += '<div class="anxiety-item">';
        html += '<h4>' + _escape(ax.typeJa || ax.type) + '</h4>';
        if (ax.description) html += '<p>' + _escape(ax.description) + '</p>';
        if (ax.countermeasure) html += '<p class="countermeasure"><strong>対応策：</strong>' + _escape(ax.countermeasure) + '</p>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // ライフステージ
    if (r.lifeStage) {
      var ls = r.lifeStage;
      html += '<div class="card">';
      html += '<div class="card-header"><h3>ライフステージ分析</h3></div>';
      html += '<div class="card-body">';
      html += '<p><strong>' + _escape(ls.stageJa || ls.stage || '') + '</strong></p>';
      if (ls.description) html += '<p>' + _escape(ls.description) + '</p>';
      if (ls.priorities && ls.priorities.length > 0) {
        html += '<h4>現在の優先事項</h4><ul>';
        ls.priorities.forEach(function (p) { html += '<li>' + _escape(p) + '</li>'; });
        html += '</ul>';
      }
      html += '</div></div>';
    }

    // 再分析ボタン
    html += '<div class="form-actions">';
    html += '<button class="btn-secondary" onclick="App.resetPsychology()">再分析する</button>';
    html += '<button class="btn-primary" style="margin-left:1rem" onclick="App.showSection(\'financial\')">ファイナンシャル分析へ進む</button>';
    html += '</div>';

    container.innerHTML = html;

    // レーダーチャートを描画（DOM更新後）
    setTimeout(function () {
      if (r.scores) drawPsychologyRadar(r.scores);
    }, 100);
  }

  function resetPsychology() {
    state.psychologyResults = null;
    saveData();
    var container = document.getElementById('psychology-content');
    if (container) renderPsychologyQuestionnaire(container);
  }

  // ---------------------------------------------------------------------------
  // ファイナンシャル分析セクション
  // ---------------------------------------------------------------------------

  var FINANCIAL_TABS = [
    { id: 'ie',     label: '収支分析' },
    { id: 'afford', label: '住宅取得力' },
    { id: 'rvb',    label: '賃貸 vs 購入' },
    { id: 'ins',    label: '保険最適化' },
    { id: 'tax',    label: '税制優遇' },
    { id: 'rate',   label: '金利シミュレーション' },
    { id: 'asset',  label: '資産形成' }
  ];

  function renderFinancial() {
    if (!state.currentClient) {
      showAlert('先にクライアント情報を登録してください。', 'warning');
      showSection('client-input');
      return;
    }

    var container = document.getElementById('financial-content');
    if (!container) return;

    renderFinancialTabs(container);
  }

  function renderFinancialTabs(container) {
    var html = '<div class="card">';
    html += '<div class="card-header"><h2>ファイナンシャル分析</h2></div>';
    html += '<div class="tab-bar">';
    FINANCIAL_TABS.forEach(function (tab, idx) {
      var tabResultKey = { ie:'incomeExpense', afford:'affordability', rvb:'rentVsBuy', ins:'insurance', tax:'taxBenefits', rate:'interestRate', asset:'assetProjection' };
      var isDone = state.financialResults && state.financialResults[tabResultKey[tab.id]];
      html += '<button class="tab-btn' + (idx === state.activeFinancialTab ? ' active' : '') + '" onclick="App.switchFinancialTab(' + idx + ')">' + tab.label + (isDone ? '<span class="tab-done"> ✓</span>' : '') + '</button>';
    });
    html += '</div>';
    html += '<div class="card-body" id="financial-tab-content">';
    html += renderFinancialTabContent(state.activeFinancialTab);
    html += '</div></div>';

    container.innerHTML = html;
    afterFinancialTabRender(state.activeFinancialTab);
  }

  function switchFinancialTab(idx) {
    state.activeFinancialTab = idx;
    var buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(function (btn, i) {
      btn.classList.toggle('active', i === idx);
    });
    var content = document.getElementById('financial-tab-content');
    if (content) {
      content.innerHTML = renderFinancialTabContent(idx);
      afterFinancialTabRender(idx);
    }
  }

  function renderFinancialTabContent(idx) {
    var tabId = FINANCIAL_TABS[idx].id;
    var c = state.currentClient;
    var r = state.financialResults;
    var html = '';

    switch (tabId) {
      case 'ie':
        html += _financialInputForm_IE(c, r);
        break;
      case 'afford':
        html += _financialInputForm_Afford(c, r);
        break;
      case 'rvb':
        html += _financialInputForm_RVB(c, r);
        break;
      case 'ins':
        html += _financialInputForm_Ins(c, r);
        break;
      case 'tax':
        html += _financialInputForm_Tax(c, r);
        break;
      case 'rate':
        html += _financialInputForm_Rate(c, r);
        break;
      case 'asset':
        html += _financialInputForm_Asset(c, r);
        break;
    }
    return html;
  }

  function afterFinancialTabRender(idx) {
    var tabId = FINANCIAL_TABS[idx].id;
    if (!state.financialResults) return;
    var r = state.financialResults;
    setTimeout(function () {
      switch (tabId) {
        case 'ie':
          if (r.incomeExpense) drawExpensePieChart(r.incomeExpense);
          break;
        case 'rvb':
          if (r.rentVsBuy) drawRentVsBuyChart(r.rentVsBuy);
          break;
        case 'asset':
          if (r.assetProjection) drawAssetProjectionChart(r.assetProjection);
          break;
      }
    }, 100);
  }

  // --- 収支分析フォーム ---
  function _financialInputForm_IE(c, r) {
    var inc = r && r.incomeExpense;
    var html = '<h3>収支分析</h3>';
    html += '<div class="form-grid">';
    html += _financialField('食費（月額・万円）',           'ie-food',           '', '6');
    html += _financialField('水道光熱費（月額・万円）',     'ie-utilities',      '', '2');
    html += _financialField('通信費（月額・万円）',         'ie-communication',  '', '1.5');
    html += _financialField('交通費（月額・万円）',         'ie-transportation', '', '2');
    html += _financialField('保険料（月額・万円）',         'ie-insurance',      '', '3');
    html += _financialField('教育費（月額・万円）',         'ie-education',      '', '0');
    html += _financialField('娯楽費（月額・万円）',         'ie-entertainment',  '', '3');
    html += _financialField('月次貯蓄額（万円）',           'ie-savings',        '', '5');
    html += _financialField('その他支出（月額・万円）',     'ie-other',          '', '2');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_IE()">収支を分析する</button>';
    html += '</div>';

    if (inc) {
      html += '<div class="result-block">';
      html += '<h4>収支分析結果</h4>';
      html += '<div class="result-grid">';
      html += _resultItem('月収総額（額面）',  formatCurrency(inc.monthlyGrossIncome));
      html += _resultItem('月収（手取概算）',  formatCurrency(inc.monthlyNetIncome));
      html += _resultItem('月次総支出',        formatCurrency(inc.monthlyTotalExpense));
      html += _resultItem('月次余剰',          formatCurrency(inc.monthlySurplus));
      html += _resultItem('貯蓄率',            inc.savingsRate + '%');
      html += '</div>';
      html += '<p class="diagnosis">' + _escape(inc.diagnosis) + '</p>';
      if (inc.recommendations && inc.recommendations.length > 0) {
        html += '<ul class="recommendations">';
        inc.recommendations.forEach(function (rec) { html += '<li>' + _escape(rec) + '</li>'; });
        html += '</ul>';
      }
      html += '<div class="chart-container"><canvas id="expense-pie" width="400" height="300"></canvas></div>';
      html += '</div>';
    }
    return html;
  }

  function runFinancialAnalysis_IE() {
    var c = state.currentClient;
    if (!c) return;

    var params = {
      annualIncome:  c.annualIncome,
      spouseIncome:  c.spouseIncome,
      currentRent:   c.currentRent,
      savings:       _fv('ie-savings') * 10000,
      expenses: {
        food:           _fv('ie-food')           * 10000,
        utilities:      _fv('ie-utilities')      * 10000,
        communication:  _fv('ie-communication')  * 10000,
        transportation: _fv('ie-transportation') * 10000,
        insurance:      _fv('ie-insurance')      * 10000,
        education:      _fv('ie-education')      * 10000,
        entertainment:  _fv('ie-entertainment')  * 10000,
        other:          _fv('ie-other')          * 10000
      }
    };

    if (!state.financialResults) state.financialResults = {};
    state.financialResults.incomeExpense = FinancialEngine.analyzeIncomeExpense(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 住宅取得力フォーム ---
  function _financialInputForm_Afford(c, r) {
    var aff = r && r.affordability;
    var html = '<h3>住宅取得可能額の試算</h3>';
    html += '<div class="form-grid">';
    html += _financialField('既存借入の月返済額（万円）', 'af-existing-debt', '', '0');
    html += _financialField('希望返済年数',               'af-term',          '', '35');
    html += _financialField('適用金利（%）',              'af-rate',          '', '1.5');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_Afford()">取得可能額を試算する</button>';
    html += '</div>';

    if (aff) {
      html += '<div class="result-block">';
      html += '<h4>住宅取得力診断</h4>';
      html += '<div class="result-grid">';
      html += _resultItem('借入可能額（上限）',      formatMan(aff.maxLoanAmount));
      html += _resultItem('推奨借入額',              formatMan(aff.recommendedLoanAmount));
      html += _resultItem('月々返済上限額',          formatCurrency(aff.maxMonthlyPayment));
      html += _resultItem('推奨月々返済額',          formatCurrency(aff.recommendedMonthlyPayment));
      html += _resultItem('住居費比率',              aff.housingCostRatio + '%');
      html += _resultItem('リスク判定',              '<span class="risk-badge risk-' + aff.riskLevel + '">' + _escape(aff.riskLevelJa) + '</span>');
      html += '</div>';
      html += '<p class="diagnosis">' + _escape(aff.explanation) + '</p>';
      if (aff.housingCostRatio) {
        html += _renderHousingRatioZone(aff.housingCostRatio);
      }
      html += '</div>';

      // ガイドライン
      if (r.guideline) {
        var gl = r.guideline;
        html += '<div class="result-block">';
        html += '<h4>住居費ガイドライン</h4>';
        html += '<div class="result-grid">';
        if (gl.recommendedMonthlyHousing) html += _resultItem('推奨住居費（月額）', formatCurrency(gl.recommendedMonthlyHousing));
        if (gl.maxMonthlyHousing)         html += _resultItem('住居費上限（月額）', formatCurrency(gl.maxMonthlyHousing));
        if (gl.maxPurchasePrice)          html += _resultItem('購入可能価格目安',   formatMan(gl.maxPurchasePrice));
        html += '</div>';
        if (gl.comment) html += '<p class="diagnosis">' + _escape(gl.comment) + '</p>';
        html += '</div>';
      }
    }
    return html;
  }

  function runFinancialAnalysis_Afford() {
    var c = state.currentClient;
    if (!c) return;
    var params = {
      annualIncome:     c.annualIncome,
      spouseIncome:     c.spouseIncome,
      savings:          c.savings,
      existingDebt:     _fv('af-existing-debt') * 10000,
      desiredTermYears: _fv('af-term') || 35,
      interestRate:     (_fv('af-rate') || 1.5) / 100
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.affordability = FinancialEngine.calculateAffordability(params);
    state.financialResults.guideline      = FinancialEngine.getHousingCostGuideline(c.annualIncome);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 賃貸 vs 購入フォーム ---
  function _financialInputForm_RVB(c, r) {
    var rvb = r && r.rentVsBuy;
    var html = '<h3>賃貸 vs 購入 比較分析</h3>';
    html += '<div class="form-grid">';
    html += _financialField('現在の家賃（万円/月）',         'rvb-rent',          '', c && c.currentRent ? Math.round(c.currentRent / 10000) : '8');
    html += _financialField('検討物件価格（万円）',           'rvb-price',         '', '4000');
    html += _financialField('頭金（万円）',                   'rvb-down',          '', '400');
    html += _financialField('借入金利（%）',                  'rvb-rate',          '', '1.5');
    html += _financialField('返済年数',                       'rvb-term',          '', '35');
    html += _financialField('管理費（万円/月）',              'rvb-mgmt',          '', '1.5');
    html += _financialField('修繕積立金（万円/月）',          'rvb-repair',        '', '1');
    html += _financialField('固定資産税（万円/年）',          'rvb-tax',           '', '12');
    html += _financialField('比較期間（年）',                 'rvb-years',         '', '35');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_RVB()">比較分析を実行する</button>';
    html += '</div>';

    if (rvb) {
      var isRec = rvb.recommendation === 'buy';
      html += '<div class="result-block">';
      html += '<h4>比較分析結果</h4>';
      html += '<div class="recommendation-badge rec-' + rvb.recommendation + '">';
      html += isRec ? '購入が有利' : '賃貸が有利';
      html += '</div>';
      html += '<div class="result-grid">';
      html += _resultItem('賃貸 累計コスト', formatMan(rvb.rentTotal));
      html += _resultItem('購入 累計コスト', formatMan(rvb.buyTotal));
      if (rvb.breakEvenYear) html += _resultItem('損益分岐点', rvb.breakEvenYear + '年目');
      html += '</div>';
      html += '<p class="diagnosis">' + _escape(rvb.analysis) + '</p>';
      if (rvb.factors && rvb.factors.length > 0) {
        html += '<ul class="recommendations">';
        rvb.factors.forEach(function (f) { html += '<li>' + _escape(f) + '</li>'; });
        html += '</ul>';
      }
      html += '<div class="chart-container"><canvas id="rvb-chart" width="500" height="300"></canvas></div>';
      html += '</div>';
      html += _renderBuyAdvantageSection(rvb);
    }
    return html;
  }

  function runFinancialAnalysis_RVB() {
    var c = state.currentClient;
    if (!c) return;
    var price = _fv('rvb-price') * 10000;
    var down  = _fv('rvb-down')  * 10000;
    var params = {
      monthlyRent:        (_fv('rvb-rent') || 8) * 10000,
      propertyPrice:      price || 40000000,
      downPayment:        down  || 4000000,
      loanInterestRate:   (_fv('rvb-rate') || 1.5) / 100,
      loanTermYears:      _fv('rvb-term')  || 35,
      managementFee:      (_fv('rvb-mgmt') || 1.5) * 10000,
      maintenanceFee:     (_fv('rvb-repair') || 1) * 10000,
      propertyTax:        (_fv('rvb-tax')  || 12) * 10000,
      comparisonYears:    _fv('rvb-years') || 35
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.rentVsBuy = FinancialEngine.compareRentVsBuy(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 保険最適化フォーム ---
  function _financialInputForm_Ins(c, r) {
    var ins = r && r.insurance;
    var html = '<h3>保険最適化分析</h3>';
    html += '<div class="form-grid">';
    html += _financialField('借入予定額（万円）',           'ins-loan',      '', '3500');
    html += _financialField('返済年数',                     'ins-term',      '', '35');
    html += _financialField('現在の生命保険料（万円/月）',  'ins-premium',   '', '1.5');
    html += _financialField('家族の人数',                   'ins-family',    '', '3');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_Ins()">保険を分析する</button>';
    html += '</div>';

    if (ins) {
      html += '<div class="result-block">';
      html += '<h4>保険最適化結果</h4>';
      html += '<div class="result-grid">';
      html += _resultItem('団信コスト（年額）',      formatCurrency(ins.danshinCost));
      html += _resultItem('民間保険コスト（年額）',  formatCurrency(ins.regularInsuranceCost));
      html += _resultItem('月次節約可能額',          formatCurrency(ins.monthlySavings));
      html += _resultItem('期間合計節約額',          formatMan(ins.totalSavingsOverTerm));
      html += '</div>';
      html += '<p class="diagnosis">' + _escape(ins.recommendation) + '</p>';
      if (ins.comparisonTable && ins.comparisonTable.length > 0) {
        html += '<table class="comparison-table data-table"><thead><tr><th>比較項目</th><th>団信</th><th>民間生命保険</th></tr></thead><tbody>';
        ins.comparisonTable.forEach(function (row) {
          html += '<tr><td>' + _escape(row.item) + '</td><td>' + _escape(row.danshin) + '</td><td>' + _escape(row.regular) + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      if (ins.optimizationPlan) {
        html += '<pre class="pre-wrap">' + _escape(ins.optimizationPlan) + '</pre>';
      }
      html += '</div>';
    }
    return html;
  }

  function runFinancialAnalysis_Ins() {
    var c = state.currentClient;
    if (!c) return;
    var params = {
      age:                      c.age || 35,
      loanAmount:               (_fv('ins-loan') || 3500) * 10000,
      loanTermYears:            _fv('ins-term') || 35,
      currentInsurancePremium:  (_fv('ins-premium') || 1.5) * 10000,
      familyMembers:            _fv('ins-family') || 3
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.insurance = FinancialEngine.compareInsurance(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 税制優遇フォーム ---
  function _financialInputForm_Tax(c, r) {
    var tax = r && r.taxBenefits;
    var html = '<h3>税制優遇シミュレーション（住宅ローン控除）</h3>';
    html += '<div class="form-grid">';
    html += _financialField('借入予定額（万円）',     'tax-loan',      '', '3500');
    html += _financialField('物件種別',               'tax-type',      'new', '', true);
    html += _financialField('入居予定年度（西暦）',   'tax-year',      '', '2025');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_Tax()">控除額を試算する</button>';
    html += '</div>';

    if (tax) {
      html += '<div class="result-block">';
      html += '<h4>住宅ローン控除試算結果</h4>';
      html += '<div class="result-grid">';
      html += _resultItem('控除期間合計メリット', formatMan(tax.totalBenefit || 0));
      html += '</div>';
      if (tax.explanation) html += '<pre class="pre-wrap">' + _escape(tax.explanation) + '</pre>';
      if (tax.yearlyDeduction && tax.yearlyDeduction.length > 0) {
        html += '<table class="data-table"><thead><tr><th>年度</th><th>ローン残高</th><th>控除額</th><th>実際の節税額</th></tr></thead><tbody>';
        tax.yearlyDeduction.forEach(function (row) {
          html += '<tr><td>' + row.year + '年</td>';
          html += '<td>' + formatMan(row.loanBalance) + '</td>';
          html += '<td>' + formatCurrency(row.deduction) + '</td>';
          html += '<td>' + formatCurrency(row.actualBenefit) + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
    }
    return html;
  }

  function runFinancialAnalysis_Tax() {
    var c = state.currentClient;
    if (!c) return;
    var typeEl = document.getElementById('tax-type');
    var isNew  = typeEl ? typeEl.value === 'new' : false;
    var params = {
      loanAmount:          (_fv('tax-loan') || 3500) * 10000,
      annualIncome:        c.annualIncome,
      propertyType:        isNew ? 'new' : 'existing',
      isNewConstruction:   isNew,
      moveInYear:          _fv('tax-year') || 2025
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.taxBenefits = FinancialEngine.calculateTaxBenefits(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 金利シミュレーションフォーム ---
  function _financialInputForm_Rate(c, r) {
    var rate = r && r.interestRate;
    var html = '<h3>金利シミュレーション</h3>';
    html += '<div class="form-grid">';
    html += _financialField('借入額（万円）',       'rate-loan',  '', '3500');
    html += _financialField('返済年数',             'rate-term',  '', '35');
    html += _financialField('基準金利（%）',        'rate-base',  '', '1.5');
    html += _financialField('金利上昇シナリオ（%）','rate-high',  '', '3.0');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_Rate()">金利影響を分析する</button>';
    html += '</div>';

    if (rate) {
      html += '<div class="result-block">';
      html += '<h4>金利影響分析結果</h4>';
      if (rate.scenarios && rate.scenarios.length > 0) {
        html += '<table class="data-table"><thead><tr><th>シナリオ</th><th>金利</th><th>月返済額</th><th>総支払額</th><th>総利息</th></tr></thead><tbody>';
        rate.scenarios.forEach(function (s) {
          html += '<tr>';
          html += '<td>' + _escape(s.label || s.name) + '</td>';
          html += '<td>' + (s.rate * 100).toFixed(2) + '%</td>';
          html += '<td>' + formatCurrency(s.monthlyPayment) + '</td>';
          html += '<td>' + formatMan(s.totalPayment) + '</td>';
          html += '<td>' + formatMan(s.totalInterest) + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }
      if (rate.analysis) html += '<p class="diagnosis">' + _escape(rate.analysis) + '</p>';
      if (rate.riskWarning) html += '<p class="warning-text">' + _escape(rate.riskWarning) + '</p>';
      html += '</div>';
    }
    return html;
  }

  function runFinancialAnalysis_Rate() {
    var params = {
      loanAmount:       (_fv('rate-loan') || 3500) * 10000,
      termYears:        _fv('rate-term') || 35,
      baseRate:         (_fv('rate-base') || 1.5) / 100,
      highRate:         (_fv('rate-high') || 3.0) / 100
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.interestRate = FinancialEngine.analyzeInterestRateImpact(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // --- 資産形成フォーム ---
  function _financialInputForm_Asset(c, r) {
    var asset = r && r.assetProjection;
    var html = '<h3>資産形成シミュレーション</h3>';
    html += '<div class="form-grid">';
    html += _financialField('現在の資産額（万円）',       'asset-init',    '', c && c.savings ? Math.round(c.savings / 10000) : '200');
    html += _financialField('毎月の積立額（万円）',       'asset-monthly', '', '5');
    html += _financialField('想定年利回り（%）',          'asset-yield',   '', '3');
    html += _financialField('シミュレーション期間（年）', 'asset-years',   '', '30');
    html += _financialField('インフレ率（%）',            'asset-inf',     '', '1');
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn-primary" onclick="App.runFinancialAnalysis_Asset()">資産推移を試算する</button>';
    html += '</div>';

    if (asset) {
      html += '<div class="result-block">';
      html += '<h4>資産形成シミュレーション結果</h4>';
      html += '<div class="result-grid">';
      if (asset.finalAmount)      html += _resultItem('最終資産額',     formatMan(asset.finalAmount));
      if (asset.totalContributed) html += _resultItem('積立元本合計',   formatMan(asset.totalContributed));
      if (asset.totalReturn)      html += _resultItem('運用益合計',     formatMan(asset.totalReturn));
      html += '</div>';
      if (asset.analysis) html += '<p class="diagnosis">' + _escape(asset.analysis) + '</p>';
      html += '<div class="chart-container"><canvas id="asset-chart" width="500" height="300"></canvas></div>';
      html += '</div>';
    }
    return html;
  }

  function runFinancialAnalysis_Asset() {
    var c = state.currentClient;
    var params = {
      initialAssets:    (_fv('asset-init')    || 200) * 10000,
      monthlyInvestment:(_fv('asset-monthly') || 5)   * 10000,
      annualReturnRate: (_fv('asset-yield')   || 3)   / 100,
      years:            _fv('asset-years')            || 30,
      inflationRate:    (_fv('asset-inf')     || 1)   / 100
    };
    if (!state.financialResults) state.financialResults = {};
    state.financialResults.assetProjection = FinancialEngine.projectAssetFormation(params);
    saveData();
    switchFinancialTab(state.activeFinancialTab);
  }

  // ファイナンシャル全体分析
  function runFinancialAnalysis() {
    var c = state.currentClient;
    if (!c) return;

    var params = collectFinancialParams();

    state.financialResults = {
      incomeExpense:   FinancialEngine.analyzeIncomeExpense(params.ie),
      affordability:   FinancialEngine.calculateAffordability(params.afford),
      rentVsBuy:       FinancialEngine.compareRentVsBuy(params.rvb),
      insurance:       FinancialEngine.compareInsurance(params.ins),
      taxBenefits:     FinancialEngine.calculateTaxBenefits(params.tax),
      interestRate:    FinancialEngine.analyzeInterestRateImpact(params.rate),
      assetProjection: FinancialEngine.projectAssetFormation(params.asset),
      guideline:       FinancialEngine.getHousingCostGuideline(c.annualIncome)
    };

    saveData();
    renderFinancialResults();
  }

  function collectFinancialParams() {
    var c = state.currentClient || {};
    return {
      ie: {
        annualIncome: c.annualIncome || 0,
        spouseIncome: c.spouseIncome || 0,
        currentRent:  c.currentRent  || 0,
        savings:      0,
        expenses: {}
      },
      afford: {
        annualIncome:     c.annualIncome || 0,
        spouseIncome:     c.spouseIncome || 0,
        savings:          c.savings || 0,
        desiredTermYears: 35,
        interestRate:     0.015
      },
      rvb: {
        monthlyRent:      c.currentRent || 80000,
        propertyPrice:    40000000,
        downPayment:      c.savings ? Math.min(c.savings * 0.5, 8000000) : 4000000,
        loanInterestRate: 0.015,
        loanTermYears:    35,
        managementFee:    15000,
        maintenanceFee:   10000,
        propertyTax:      120000,
        comparisonYears:  35
      },
      ins: {
        age:                     c.age || 35,
        loanAmount:              35000000,
        loanTermYears:           35,
        currentInsurancePremium: 15000,
        familyMembers:           (c.children || 0) + (c.maritalStatus === 'married' ? 2 : 1)
      },
      tax: {
        loanAmount:        35000000,
        annualIncome:      c.annualIncome || 0,
        propertyType:      'new',
        isNewConstruction: true,
        moveInYear:        2025
      },
      rate: {
        loanAmount: 35000000,
        termYears:  35,
        baseRate:   0.015,
        highRate:   0.03
      },
      asset: {
        initialAssets:     c.savings || 0,
        monthlyInvestment: 50000,
        annualReturnRate:  0.03,
        years:             30,
        inflationRate:     0.01
      }
    };
  }

  function renderFinancialResults() {
    var container = document.getElementById('financial-content');
    if (container) renderFinancialTabs(container);
  }

  // ---------------------------------------------------------------------------
  // ライフプランセクション
  // ---------------------------------------------------------------------------

  function renderLifePlan() {
    var container = document.getElementById('lifeplan-content');
    if (!container) return;

    if (!state.currentClient) {
      container.innerHTML = '<div class="card"><div class="card-body"><p class="text-secondary">先にクライアント情報を登録してください。</p></div></div>';
      return;
    }

    var c = state.currentClient;
    var hasFinancial  = !!state.financialResults;
    var hasPsychology = !!state.psychologyResults;
    var html = '';

    // ライフプランサマリーカード
    html += '<div class="card">';
    html += '<div class="card-header"><h2>' + _escape(c.name) + ' 様のライフプラン総合診断</h2></div>';
    html += '<div class="card-body">';

    // ライフステージ
    var lifeStage = hasPsychology
      ? (state.psychologyResults.lifeStage || PsychologyEngine.analyzeLifeStage(c))
      : PsychologyEngine.analyzeLifeStage(c);

    if (lifeStage) {
      html += '<div class="lifeplan-section">';
      html += '<h3>現在のライフステージ: <span class="stage-badge">' + _escape(lifeStage.stageJa || lifeStage.stage || '') + '</span></h3>';
      if (lifeStage.description) html += '<p>' + _escape(lifeStage.description) + '</p>';
      html += '</div>';
    }

    // 基本情報サマリー
    html += '<div class="lifeplan-section info-grid">';
    html += _infoItem('年齢',    (c.age || '-') + '歳');
    html += _infoItem('職業',    c.occupation || '-');
    html += _infoItem('世帯年収', c.annualIncome ? formatMan(c.annualIncome + (c.spouseIncome || 0)) : '-');
    html += _infoItem('貯蓄額',  c.savings ? formatMan(c.savings) : '-');
    html += _infoItem('検討目的', {
      'buy_first': '初めての住宅購入',
      'buy_upgrade': '住み替え',
      'buy_investment': '投資用不動産',
      'rent': '賃貸継続検討'
    }[c.purpose] || c.purpose || '-');
    html += _infoItem('希望エリア', c.desiredArea || '-');
    html += '</div>';

    html += '</div></div>';

    // ファイナンシャルサマリー
    if (hasFinancial) {
      var fr = state.financialResults;
      html += '<div class="card" style="margin-top:1.5rem">';
      html += '<div class="card-header"><h3>ファイナンシャル分析サマリー</h3></div>';
      html += '<div class="card-body">';

      if (fr.affordability) {
        var aff = fr.affordability;
        html += '<div class="lifeplan-section">';
        html += '<h4>住宅取得力</h4>';
        html += '<div class="result-grid">';
        html += _resultItem('推奨借入額',   formatMan(aff.recommendedLoanAmount));
        html += _resultItem('上限借入額',   formatMan(aff.maxLoanAmount));
        html += _resultItem('リスク判定',   '<span class="risk-badge risk-' + aff.riskLevel + '">' + _escape(aff.riskLevelJa) + '</span>');
        html += '</div>';
        html += '<p>' + _escape(aff.explanation) + '</p>';
        html += '</div>';
      }

      if (fr.rentVsBuy) {
        var rvb = fr.rentVsBuy;
        html += '<div class="lifeplan-section">';
        html += '<h4>賃貸 vs 購入</h4>';
        html += '<div class="recommendation-badge rec-' + rvb.recommendation + '">';
        html += rvb.recommendation === 'buy' ? '購入が有利' : '賃貸が有利';
        html += '</div>';
        html += '<p>' + _escape(rvb.analysis) + '</p>';
        html += '</div>';
      }

      html += '</div></div>';
    }

    // 心理分析サマリー
    if (hasPsychology) {
      var pr = state.psychologyResults;
      html += '<div class="card" style="margin-top:1.5rem">';
      html += '<div class="card-header"><h3>行動特性サマリー <span class="internal-badge">営業担当者用</span></h3></div>';
      html += '<div class="card-body">';
      if (pr.personalityType) {
        html += '<p><strong>タイプ：</strong>' + _escape(pr.personalityType.primaryTypeJa || pr.personalityType.primaryType || '') + '</p>';
        if (pr.personalityType.description) html += '<p>' + _escape(pr.personalityType.description) + '</p>';
      }
      if (pr.salesStrategy && pr.salesStrategy.communicationStyle) {
        html += '<p><strong>推奨アプローチ：</strong>' + _escape(pr.salesStrategy.communicationStyle) + '</p>';
      }
      html += '</div></div>';
    }

    // ライフプランタイムライン
    html += '<div class="card" style="margin-top:1.5rem">';
    html += '<div class="card-header"><h3>ライフイベントタイムライン</h3></div>';
    html += '<div class="card-body">';
    html += _renderTimeline(c);
    html += '</div></div>';

    // アクションボタン
    html += '<div class="form-actions" style="margin-top:1.5rem">';
    if (!hasFinancial) {
      html += '<button class="btn-secondary" onclick="App.showSection(\'financial\')">ファイナンシャル分析を実行する</button>';
    }
    html += '<button class="btn-primary" onclick="App.showSection(\'report\')" style="margin-left:1rem">レポートを出力する</button>';
    html += '</div>';

    container.innerHTML = html;
  }

  function _renderTimeline(c) {
    var now    = new Date().getFullYear();
    var age    = c.age || 35;
    var events = [];

    // 住宅購入
    events.push({ year: now,      label: '現在', desc: age + '歳・相談中', type: 'current' });
    events.push({ year: now + 1,  label: '購入検討', desc: (age + 1) + '歳・住宅取得目標', type: 'milestone' });

    // 子供の教育
    if (c.children && c.children > 0 && c.childrenAges) {
      var agesStr = c.childrenAges.split(/[,、，\s]+/);
      agesStr.forEach(function (ageStr, i) {
        var childAge = parseInt(ageStr);
        if (!isNaN(childAge)) {
          var highSchoolYear = now + (15 - childAge);
          var univYear       = now + (18 - childAge);
          if (highSchoolYear > now)
            events.push({ year: highSchoolYear, label: 'お子様' + (i + 1) + '高校入学', desc: '', type: 'family' });
          if (univYear > now)
            events.push({ year: univYear,       label: 'お子様' + (i + 1) + '大学入学', desc: '', type: 'family' });
        }
      });
    }

    // 定年・老後
    var retireYear = now + (65 - age);
    if (retireYear > now) {
      events.push({ year: retireYear,      label: '定年退職目安',    desc: '65歳・老後資金の確保', type: 'retirement' });
      events.push({ year: retireYear + 5,  label: 'ローン完済目安', desc: '', type: 'milestone' });
    }

    events.sort(function (a, b) { return a.year - b.year; });

    var html = '<div class="timeline">';
    events.forEach(function (ev) {
      html += '<div class="timeline-item timeline-' + ev.type + '">';
      html += '<div class="timeline-year">' + ev.year + '年</div>';
      html += '<div class="timeline-content">';
      html += '<strong>' + _escape(ev.label) + '</strong>';
      if (ev.desc) html += '<p>' + _escape(ev.desc) + '</p>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function _infoItem(label, value) {
    return '<div class="info-item"><span class="info-label">' + label + '</span><span class="info-value">' + value + '</span></div>';
  }

  // ---------------------------------------------------------------------------
  // レポートセクション
  // ---------------------------------------------------------------------------

  function renderReport() {
    var container = document.getElementById('report-content');
    if (!container) return;

    if (!state.currentClient || !state.financialResults) {
      container.innerHTML = '<div class="card"><div class="card-body">'
        + '<p class="text-secondary">レポート出力にはクライアント情報とファイナンシャル分析が必要です。</p>'
        + '<button class="btn-secondary" onclick="App.showSection(\'financial\')">ファイナンシャル分析へ</button>'
        + '</div></div>';
      return;
    }

    var c   = state.currentClient;
    var html = '<div class="card">';
    html += '<div class="card-header"><h2>レポート出力</h2></div>';
    html += '<div class="card-body">';
    html += '<p>クライアント: <strong>' + _escape(c.name) + '</strong> 様</p>';
    html += '<p class="text-secondary">以下の内容でライフプランニングレポートを生成します。</p>';

    // レポート内容確認リスト
    html += '<ul class="report-checklist">';
    html += '<li class="checked">クライアント基本情報</li>';
    html += '<li class="' + (state.financialResults.incomeExpense ? 'checked' : 'unchecked') + '">収支分析</li>';
    html += '<li class="' + (state.financialResults.affordability ? 'checked' : 'unchecked') + '">住宅取得力診断</li>';
    html += '<li class="' + (state.financialResults.rentVsBuy ? 'checked' : 'unchecked') + '">賃貸 vs 購入 比較</li>';
    html += '<li class="' + (state.financialResults.taxBenefits ? 'checked' : 'unchecked') + '">住宅ローン控除試算</li>';
    html += '<li class="' + (state.financialResults.assetProjection ? 'checked' : 'unchecked') + '">資産形成シミュレーション</li>';
    html += '</ul>';

    html += '<div class="form-actions">';
    html += '<button class="btn-primary btn-large" onclick="App.generateReport()">PDFレポートを生成</button>';
    if (typeof ReportGenerator !== 'undefined' && typeof ReportGenerator.preview === 'function') {
      html += '<button class="btn-secondary" onclick="App.previewReport()" style="margin-left:1rem">プレビュー</button>';
    }
    html += '</div>';
    html += '</div></div>';
    container.innerHTML = html;
  }

  function _showPdfOverlay(message) {
    var existing = document.getElementById('pdf-loading-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'pdf-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);'
      + 'z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
    var spinner = document.createElement('div');
    spinner.style.cssText = 'width:48px;height:48px;border:5px solid rgba(255,255,255,0.3);'
      + 'border-top-color:#c9a84c;border-radius:50%;animation:pdf-spin 0.8s linear infinite;';
    var style = document.createElement('style');
    style.textContent = '@keyframes pdf-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
    var label = document.createElement('div');
    label.style.cssText = 'color:#fff;font-size:15px;letter-spacing:1px;';
    label.textContent = message || 'PDFを生成しています...';
    overlay.appendChild(spinner);
    overlay.appendChild(label);
    document.body.appendChild(overlay);
    return overlay;
  }

  function _hidePdfOverlay() {
    var overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.remove();
  }

  function _buildReportData() {
    var reportData = FinancialEngine.generateReportData(state.currentClient, state.financialResults);
    reportData.clientName = state.currentClient.name;
    reportData.lifeStage  = state.psychologyResults
      ? state.psychologyResults.lifeStage
      : PsychologyEngine.analyzeLifeStage(state.currentClient);
    return reportData;
  }

  function generateReport() {
    if (!state.currentClient || !state.financialResults) {
      showAlert('レポート生成に必要なデータが不足しています。', 'warning');
      return;
    }
    if (typeof ReportGenerator === 'undefined') {
      showAlert('ReportGeneratorが読み込まれていません。', 'error');
      return;
    }

    var reportData = _buildReportData();

    // html2pdf が利用できない場合は印刷ダイアログにフォールバック
    if (typeof html2pdf === 'undefined') {
      showAlert('PDFライブラリが利用できないため、印刷ダイアログを開きます。', 'warning');
      ReportGenerator.printFallback(reportData);
      return;
    }

    var overlay = _showPdfOverlay('PDFレポートを生成しています...');
    ReportGenerator.download(reportData).then(function () {
      _hidePdfOverlay();
      showAlert('PDFレポートのダウンロードが完了しました。', 'success');
    }).catch(function (e) {
      _hidePdfOverlay();
      showAlert('PDF生成に失敗しました。印刷ダイアログを開きます。', 'warning');
      ReportGenerator.printFallback(reportData);
      console.error('ReportGenerator.download error:', e);
    });
  }

  function previewReport() {
    if (!state.currentClient || !state.financialResults) {
      showAlert('レポートプレビューにはクライアント情報とファイナンシャル分析が必要です。', 'warning');
      return;
    }
    if (typeof ReportGenerator === 'undefined') return;

    var reportData = _buildReportData();

    // html2pdf が利用できない場合はHTMLプレビューにフォールバック
    if (typeof html2pdf === 'undefined') {
      ReportGenerator.htmlPreviewFallback(reportData);
      return;
    }

    var overlay = _showPdfOverlay('プレビューを生成しています...');
    ReportGenerator.preview(reportData).then(function () {
      _hidePdfOverlay();
    }).catch(function (e) {
      _hidePdfOverlay();
      showAlert('PDFプレビューに失敗しました。HTMLプレビューを表示します。', 'warning');
      ReportGenerator.htmlPreviewFallback(reportData);
      console.error('ReportGenerator.preview error:', e);
    });
  }

  // ---------------------------------------------------------------------------
  // Chart.js グラフ描画
  // ---------------------------------------------------------------------------

  function drawPsychologyRadar(scores) {
    var ctx = document.getElementById('psychology-radar');
    if (!ctx || typeof Chart === 'undefined') return;

    // 既存チャートを破棄
    if (state.financialCharts['psychology-radar']) {
      state.financialCharts['psychology-radar'].destroy();
    }

    state.financialCharts['psychology-radar'] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['分析力', '感情性', '社交性', '実践力', 'リスク許容度', '将来志向'],
        datasets: [{
          label: 'スコア',
          data: [
            scores.analytical,
            scores.emotional,
            scores.social,
            scores.practical,
            scores.riskTolerance,
            scores.futureOrientation
          ],
          backgroundColor:     'rgba(201, 168, 76, 0.2)',
          borderColor:         '#c9a84c',
          pointBackgroundColor: '#1a237e',
          pointBorderColor:     '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#c9a84c'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function drawExpensePieChart(incomeExpense) {
    var ctx = document.getElementById('expense-pie');
    if (!ctx || typeof Chart === 'undefined') return;
    if (state.financialCharts['expense-pie']) {
      state.financialCharts['expense-pie'].destroy();
    }

    var breakdown = incomeExpense.expenseBreakdown || [];
    var labels = breakdown.map(function (b) { return b.label; });
    var data   = breakdown.map(function (b) { return b.value; });
    var colors = [
      '#c9a84c', '#1a237e', '#4a90d9', '#e57373', '#81c784',
      '#ffb74d', '#ba68c8', '#4db6ac', '#f06292'
    ];

    state.financialCharts['expense-pie'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: function (ctx2) {
                return ctx2.label + ': ' + formatCurrency(ctx2.raw);
              }
            }
          }
        }
      }
    });
  }

  function drawRentVsBuyChart(rvb) {
    var ctx = document.getElementById('rvb-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (state.financialCharts['rvb-chart']) {
      state.financialCharts['rvb-chart'].destroy();
    }

    var comparison = rvb.yearlyComparison || [];
    var step = Math.ceil(comparison.length / 20) || 1;
    var filtered = comparison.filter(function (d, i) { return i % step === 0; });
    var labels    = filtered.map(function (d) { return d.year + '年目'; });
    var rentData  = filtered.map(function (d) { return Math.round(d.rentCumulativeCost / 10000); });
    var buyData   = filtered.map(function (d) { return Math.round(d.buyCumulativeCost  / 10000); });

    state.financialCharts['rvb-chart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '賃貸 累計コスト（万円）',
            data: rentData,
            borderColor: '#4a90d9',
            backgroundColor: 'rgba(74,144,217,0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: '購入 累計コスト（万円）',
            data: buyData,
            borderColor: '#c9a84c',
            backgroundColor: 'rgba(201,168,76,0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            title: { display: true, text: '万円' }
          }
        }
      }
    });
  }

  function drawAssetProjectionChart(asset) {
    var ctx = document.getElementById('asset-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (state.financialCharts['asset-chart']) {
      state.financialCharts['asset-chart'].destroy();
    }

    var yearly = asset.yearlyProjection || [];
    var step   = Math.ceil(yearly.length / 20) || 1;
    var filtered = yearly.filter(function (d, i) { return i % step === 0; });
    var labels   = filtered.map(function (d) { return d.year + '年目'; });
    var totals   = filtered.map(function (d) { return Math.round((d.totalAssets || d.amount || 0) / 10000); });
    var contrib  = filtered.map(function (d) { return Math.round((d.totalContributed || d.contributed || 0) / 10000); });

    state.financialCharts['asset-chart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '積立元本（万円）',
            data: contrib,
            backgroundColor: 'rgba(74,144,217,0.7)',
            stack: 'stack'
          },
          {
            label: '運用益（万円）',
            data: totals.map(function (t, i) { return Math.max(0, t - (contrib[i] || 0)); }),
            backgroundColor: 'rgba(201,168,76,0.7)',
            stack: 'stack'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { stacked: true, title: { display: true, text: '万円' } }
        }
      }
    });
  }

  function drawFinancialCharts(results) {
    if (results && results.incomeExpense) drawExpensePieChart(results.incomeExpense);
    if (results && results.rentVsBuy)     drawRentVsBuyChart(results.rentVsBuy);
    if (results && results.assetProjection) drawAssetProjectionChart(results.assetProjection);
  }

  // ---------------------------------------------------------------------------
  // データ永続化
  // ---------------------------------------------------------------------------

  function saveData() {
    try {
      var data = {
        clients:          state.clients,
        currentClientId:  state.currentClient ? state.currentClient.id : null,
        psychologyResults: state.psychologyResults,
        financialResults:  state.financialResults
      };
      localStorage.setItem('lifedesign_data', JSON.stringify(data));
    } catch (e) {
      showAlert('データの保存に失敗しました: ' + e.message, 'error');
    }
    updateNavBadges();
  }

  function loadData() {
    try {
      var raw = localStorage.getItem('lifedesign_data');
      if (!raw) return;
      var data = JSON.parse(raw);
      state.clients = data.clients || [];
      if (data.currentClientId) {
        state.currentClient = state.clients.find(function (c) {
          return c.id === data.currentClientId;
        }) || null;
      }
      state.psychologyResults = data.psychologyResults || null;
      state.financialResults  = data.financialResults  || null;
    } catch (e) {
      state.clients           = [];
      state.currentClient     = null;
      state.psychologyResults = null;
      state.financialResults  = null;
    }
  }

  // ---------------------------------------------------------------------------
  // クライアント操作
  // ---------------------------------------------------------------------------

  function selectClient(clientId) {
    state.currentClient     = state.clients.find(function (c) { return c.id === clientId; }) || null;
    state.psychologyResults = null;
    state.financialResults  = null;
    saveData();
    updateHeader();
    showSection('client-input');
  }

  function deleteClient(clientId) {
    var client = state.clients.find(function(c) { return c.id === clientId; });
    var name = client ? _escape(client.name) : 'このクライアント';
    var backdrop = document.getElementById('modal-backdrop');
    var modal = document.getElementById('modal-content');
    if (!backdrop || !modal) {
      if (confirm(client ? client.name + ' 様のデータを削除しますか？' : '削除しますか？')) {
        _doDeleteClient(clientId);
      }
      return;
    }
    modal.innerHTML =
      '<div class="modal-header"><h3>クライアント削除の確認</h3></div>' +
      '<div class="modal-body">' +
      '<p style="margin-bottom:8px"><strong>' + name + '</strong> 様のすべてのデータを削除します。</p>' +
      '<p class="text-danger" style="font-size:12px">この操作は取り消すことができません。</p>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button class="btn-secondary" onclick="App.closeModal()">キャンセル</button>' +
      '<button class="btn-danger" onclick="App._doDeleteClient(\'' + clientId + '\');App.closeModal();">削除する</button>' +
      '</div>';
    backdrop.classList.remove('hidden');
  }

  function _doDeleteClient(clientId) {
    state.clients = state.clients.filter(function(c) { return c.id !== clientId; });
    if (state.currentClient && state.currentClient.id === clientId) {
      state.currentClient     = null;
      state.psychologyResults = null;
      state.financialResults  = null;
      updateHeader();
    }
    saveData();
    showSection('dashboard');
  }

  function closeModal() {
    var backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
  }

  function updateHeader() {
    var headerClient = document.getElementById('header-client-name');
    if (headerClient) {
      if (state.currentClient) {
        headerClient.textContent    = state.currentClient.name + ' 様';
        headerClient.style.display  = 'inline-block';
      } else {
        headerClient.textContent    = '';
        headerClient.style.display  = 'none';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 通知・アラート
  // ---------------------------------------------------------------------------

  function showAlert(message, type) {
    type = type || 'info';

    // 既存のアラートを削除
    var existing = document.getElementById('app-alert');
    if (existing) existing.remove();

    var alert = document.createElement('div');
    alert.id        = 'app-alert';
    alert.className = 'app-alert alert-' + type;
    alert.textContent = message;

    var closeBtn = document.createElement('button');
    closeBtn.className   = 'alert-close';
    closeBtn.textContent = '×';
    closeBtn.onclick     = function () { alert.remove(); };
    alert.appendChild(closeBtn);

    document.body.appendChild(alert);

    // 自動消去（エラー以外）
    if (type !== 'error') {
      setTimeout(function () {
        if (alert.parentNode) alert.remove();
      }, 4000);
    }
  }

  // ---------------------------------------------------------------------------
  // フォーマット
  // ---------------------------------------------------------------------------

  function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return Math.round(amount).toLocaleString('ja-JP') + '円';
  }

  function formatMan(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return (Math.round(amount / 10000)).toLocaleString('ja-JP') + '万円';
  }

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  function _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  // value属性用エスケープ（属性値内部）
  function _esc(val) {
    if (!val) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('open');
    }
  }

  function _checked(condition) {
    return condition ? ' checked' : '';
  }

  function _radioValue(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function _fv(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  }

  function _formRow(label, inputHtml) {
    return '<div class="form-row"><label class="form-label">' + label + '</label><div class="form-input">' + inputHtml + '</div></div>';
  }

  function _financialField(label, id, value, placeholder, isSelect) {
    if (isSelect) {
      return '<div class="form-row">'
        + '<label class="form-label">' + label + '</label>'
        + '<select id="' + id + '" class="form-control form-control-sm">'
        + '<option value="new">新築</option>'
        + '<option value="existing">中古</option>'
        + '</select></div>';
    }
    return '<div class="form-row">'
      + '<label class="form-label">' + label + '</label>'
      + '<input type="number" id="' + id + '" class="form-control form-control-sm"'
      + (value       ? ' value="' + value + '"'           : '')
      + (placeholder ? ' placeholder="' + placeholder + '"' : '')
      + ' step="0.1" min="0">'
      + '</div>';
  }

  function _resultItem(label, value) {
    return '<div class="result-item"><span class="result-label">' + label + '</span><span class="result-value">' + value + '</span></div>';
  }

  function _formatDate(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso);
      return d.getFullYear() + '/' + _pad(d.getMonth() + 1) + '/' + _pad(d.getDate());
    } catch (e) {
      return '-';
    }
  }

  function _pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // ---------------------------------------------------------------------------
  // 公開API
  // ---------------------------------------------------------------------------

  return {
    state:    state,
    init:     init,

    // ナビゲーション
    showSection: showSection,

    // クライアント操作
    saveClient:      saveClient,
    newClient:       newClient,
    applyModelCase:  applyModelCase,
    selectClient:    selectClient,
    deleteClient:    deleteClient,
    _doDeleteClient: _doDeleteClient,
    closeModal:      closeModal,
    updateHeader:    updateHeader,

    // 心理分析
    submitPsychology: submitPsychology,
    resetPsychology:  resetPsychology,

    // ファイナンシャル分析
    switchFinancialTab:          switchFinancialTab,
    runFinancialAnalysis:        runFinancialAnalysis,
    runFinancialAnalysis_IE:     runFinancialAnalysis_IE,
    runFinancialAnalysis_Afford: runFinancialAnalysis_Afford,
    runFinancialAnalysis_RVB:    runFinancialAnalysis_RVB,
    runFinancialAnalysis_Ins:    runFinancialAnalysis_Ins,
    runFinancialAnalysis_Tax:    runFinancialAnalysis_Tax,
    runFinancialAnalysis_Rate:   runFinancialAnalysis_Rate,
    runFinancialAnalysis_Asset:  runFinancialAnalysis_Asset,

    // index.html static onclick aliases (CRITICAL fix)
    toggleSidebar:      toggleSidebar,
    runIncomeAnalysis:  runFinancialAnalysis_IE,
    runAffordability:   runFinancialAnalysis_Afford,
    runRentVsBuy:       runFinancialAnalysis_RVB,
    runInsurance:       runFinancialAnalysis_Ins,
    runTaxBenefit:      runFinancialAnalysis_Tax,
    runRateAnalysis:    runFinancialAnalysis_Rate,
    runAssetProjection: runFinancialAnalysis_Asset,

    // レポート
    generateReport: generateReport,
    previewReport:  previewReport,

    // データ
    saveData: saveData,
    loadData: loadData,

    // フォーマット
    formatCurrency: formatCurrency,
    formatMan:      formatMan,

    // アラート
    showAlert: showAlert
  };
}());

