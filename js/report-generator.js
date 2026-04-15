/**
 * LIFE DESIGN PARTNER - PDF Report Generator
 * クライアント向け ライフデザイン・レポート生成モジュール
 *
 * Uses: jsPDF 2.5.x (UMD via CDN)
 * Note: Psychology/behavioral analysis data is intentionally EXCLUDED.
 *       This report is client-facing; psychology data is for internal use only.
 *
 * All measurements in mm (A4: 210 x 297mm)
 */

var ReportGenerator = (function () {
  'use strict';

  var RG = {};

  // ---------------------------------------------------------------------------
  // Color constants (RGB arrays matching app theme)
  // ---------------------------------------------------------------------------
  var C = {
    navy:      [26,  35,  126],
    navyDark:  [13,  22,   66],
    navyMid:   [40,  55,  160],
    gold:      [201, 168,  76],
    goldLight: [212, 185, 106],
    goldPale:  [245, 235, 195],
    white:     [255, 255, 255],
    black:     [33,   33,  33],
    gray:      [97,   97,  97],
    lightGray: [200, 200, 200],
    bgGray:    [247, 247, 250],
    bgBlue:    [235, 238, 255],
    success:   [46,  125,  50],
    warning:   [230, 130,  20],
    danger:    [198,  40,  40],
    successBg: [232, 245, 233],
    warningBg: [255, 243, 224],
    dangerBg:  [255, 235, 238]
  };

  // A4 page dimensions
  var PW = 210; // page width mm
  var PH = 297; // page height mm
  var ML = 14;  // margin left
  var MR = 14;  // margin right
  var CW = PW - ML - MR; // content width

  // ---------------------------------------------------------------------------
  // Font management
  // ---------------------------------------------------------------------------
  RG._fontLoaded = false;
  RG._fontData   = null;

  /**
   * Fetch and store NotoSansJP TTF for embedding.
   * Call once before RG.generate() for proper Japanese rendering.
   */
  RG.initFont = async function () {
    try {
      var response = await fetch(
        'https://cdn.jsdelivr.net/gh/nicolo-ribaudo/noto-sans-jp-jspdf@main/NotoSansJP-Regular.ttf'
      );
      if (!response.ok) throw new Error('font fetch failed');
      RG._fontData   = await response.arrayBuffer();
      RG._fontLoaded = true;
    } catch (e) {
      RG._fontLoaded = false;
    }
  };

  /**
   * Embed the Japanese font into a jsPDF document.
   * Returns true when successful; false when falling back to Helvetica.
   */
  function applyFont(doc) {
    if (RG._fontLoaded && RG._fontData) {
      try {
        var bytes  = new Uint8Array(RG._fontData);
        var binary = '';
        var len    = bytes.byteLength;
        for (var i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        var base64 = btoa(binary);
        doc.addFileToVFS('NotoSansJP-Regular.ttf', base64);
        doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
        doc.setFont('NotoSansJP', 'normal');
        return true;
      } catch (e) {
        /* fall through */
      }
    }
    doc.setFont('Helvetica', 'normal');
    return false;
  }

  // ---------------------------------------------------------------------------
  // Low-level drawing helpers
  // ---------------------------------------------------------------------------

  function setFill(doc, rgb) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  }

  function setDraw(doc, rgb) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  }

  function setTextColor(doc, rgb) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  /** Filled rectangle */
  function fillRect(doc, x, y, w, h, color) {
    setFill(doc, color);
    doc.rect(x, y, w, h, 'F');
  }

  /** Stroked rectangle */
  function strokeRect(doc, x, y, w, h, color, lw) {
    setDraw(doc, color);
    doc.setLineWidth(lw || 0.3);
    doc.rect(x, y, w, h, 'S');
  }

  /** Horizontal rule */
  function hRule(doc, x, y, w, color, lw) {
    setDraw(doc, color);
    doc.setLineWidth(lw || 0.3);
    doc.line(x, y, x + w, y);
  }

  /** Right-aligned text */
  function textRight(doc, txt, x, y) {
    doc.text(String(txt), x, y, { align: 'right' });
  }

  /** Center-aligned text */
  function textCenter(doc, txt, x, y) {
    doc.text(String(txt), x, y, { align: 'center' });
  }

  /** Truncate text to fit in maxWidth mm */
  function truncate(doc, txt, maxWidth) {
    var s = String(txt);
    while (s.length > 1 && doc.getTextWidth(s) > maxWidth) {
      s = s.slice(0, -1);
    }
    return s;
  }

  // ---------------------------------------------------------------------------
  // Page-level helpers
  // ---------------------------------------------------------------------------

  /**
   * Draw the top navy header bar with gold accent and page title.
   */
  function drawPageHeader(doc, pageTitle) {
    // Navy background bar
    fillRect(doc, 0, 0, PW, 18, C.navyDark);
    // Gold accent stripe
    fillRect(doc, 0, 18, PW, 1.8, C.gold);

    // Logo text (left)
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.goldLight);
    doc.text('LIFE DESIGN PARTNER', ML, 11.5);

    // Page title (right)
    doc.setFontSize(9);
    setTextColor(doc, C.white);
    textRight(doc, pageTitle, PW - MR, 11.5);
  }

  /**
   * Draw page footer with page number and thin rule.
   */
  function drawPageFooter(doc, pageNum, totalPages) {
    var fy = PH - 9;
    hRule(doc, ML, fy - 1, CW, C.lightGray, 0.2);
    applyFont(doc);
    doc.setFontSize(7);
    setTextColor(doc, C.gray);
    doc.text('Confidential  /  お客様専用資料', ML, fy + 3);
    textRight(doc, pageNum + ' / ' + totalPages, PW - MR, fy + 3);
    textCenter(doc, 'LIFE DESIGN PARTNER', PW / 2, fy + 3);
  }

  /**
   * Section heading with left navy bar accent.
   */
  function sectionHeading(doc, title, y) {
    fillRect(doc, ML, y, 3, 6, C.gold);
    fillRect(doc, ML + 3, y, CW - 3, 6, C.bgBlue);
    applyFont(doc);
    doc.setFontSize(9.5);
    setTextColor(doc, C.navy);
    doc.text(title, ML + 6, y + 4.3);
    return y + 9;
  }

  /**
   * Small label badge.
   */
  function badge(doc, label, x, y, bgColor, textColor) {
    var tw = doc.getTextWidth(label) + 4;
    fillRect(doc, x, y - 3.5, tw, 4.5, bgColor || C.navy);
    doc.setFontSize(6.5);
    setTextColor(doc, textColor || C.white);
    doc.text(label, x + 2, y);
    return x + tw + 2;
  }

  // ---------------------------------------------------------------------------
  // Table renderer
  // ---------------------------------------------------------------------------

  /**
   * Draw a simple table.
   * @param {object} doc
   * @param {number} startY       top of table
   * @param {string[]} headers    column headers
   * @param {Array[]} rows        array of row arrays (strings or numbers)
   * @param {object} [opts]
   *   colWidths {number[]}       column widths in mm
   *   rowHeight {number}         row height in mm (default 7)
   *   headerBg {number[]}        header background RGB
   *   altBg    {number[]}        alternate row background RGB
   *   fontSize {number}
   *   highlightRows {number[]}   row indices to highlight with gold bg
   * @returns {number} Y after table
   */
  function drawTable(doc, startY, headers, rows, opts) {
    opts = opts || {};
    var colWidths  = opts.colWidths  || [];
    var rowH       = opts.rowHeight  || 7;
    var headerBg   = opts.headerBg   || C.navy;
    var altBg      = opts.altBg      || C.bgGray;
    var fs         = opts.fontSize   || 8;
    var hilite     = opts.highlightRows || [];

    // Compute equal widths if not supplied
    if (!colWidths.length) {
      var eq = CW / headers.length;
      headers.forEach(function () { colWidths.push(eq); });
    }

    var x = ML;
    var y = startY;

    applyFont(doc);
    doc.setFontSize(fs);

    // Header row
    fillRect(doc, x, y, CW, rowH, headerBg);
    setTextColor(doc, C.white);
    var cx = x;
    headers.forEach(function (h, i) {
      var tx = cx + colWidths[i] / 2;
      textCenter(doc, h, tx, y + rowH - 2);
      cx += colWidths[i];
    });
    y += rowH;

    // Data rows
    rows.forEach(function (row, ri) {
      var isHilite = hilite.indexOf(ri) !== -1;
      var bg = isHilite ? C.goldPale : (ri % 2 === 0 ? C.white : altBg);
      fillRect(doc, x, y, CW, rowH, bg);

      // Cell borders
      setDraw(doc, C.lightGray);
      doc.setLineWidth(0.15);
      doc.rect(x, y, CW, rowH, 'S');

      var cx2 = x;
      row.forEach(function (cell, ci) {
        var align = (ci > 0) ? 'right' : 'left';
        var cellX = align === 'right' ? cx2 + colWidths[ci] - 2 : cx2 + 2;
        var cellTxt = truncate(doc, String(cell), colWidths[ci] - 3);
        setTextColor(doc, isHilite ? C.navyDark : C.black);
        doc.text(cellTxt, cellX, y + rowH - 2, { align: align });
        cx2 += colWidths[ci];
      });
      y += rowH;
    });

    return y + 2;
  }

  // ---------------------------------------------------------------------------
  // Specialized visual components
  // ---------------------------------------------------------------------------

  /**
   * Horizontal progress bar.
   * value/maxValue = fill ratio; color = fill color.
   */
  function drawBar(doc, x, y, width, height, value, maxValue, color) {
    // Background
    fillRect(doc, x, y, width, height, C.lightGray);
    // Fill
    var ratio = Math.min(1, Math.max(0, value / (maxValue || 1)));
    if (ratio > 0) {
      fillRect(doc, x, y, width * ratio, height, color || C.navy);
    }
    // Border
    strokeRect(doc, x, y, width, height, C.lightGray, 0.2);
  }

  /**
   * Traffic-light indicator: level = 'safe' | 'caution' | 'danger'
   */
  function drawTrafficLight(doc, x, y, level) {
    var levels = ['safe', 'caution', 'danger'];
    var colors = [C.success, C.warning, C.danger];
    var labels = ['安全', '注意', '危険'];
    var r = 4;

    levels.forEach(function (lv, i) {
      var cx = x + i * (r * 2 + 3) + r;
      var active = (lv === level);
      setFill(doc, active ? colors[i] : C.lightGray);
      setDraw(doc, active ? colors[i] : C.lightGray);
      doc.circle(cx, y + r, r, 'F');
      if (active) {
        applyFont(doc);
        doc.setFontSize(5.5);
        setTextColor(doc, C.white);
        textCenter(doc, labels[i], cx, y + r + 1.8);
      }
    });
  }

  /**
   * Key-value info row inside a light card.
   */
  function infoRow(doc, label, value, x, y, w, highlight) {
    var rowH = 6.5;
    fillRect(doc, x, y, w * 0.38, rowH, C.bgBlue);
    fillRect(doc, x + w * 0.38, y, w * 0.62, rowH, highlight ? C.goldPale : C.white);
    strokeRect(doc, x, y, w, rowH, C.lightGray, 0.15);
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.navy);
    doc.text(label, x + 2, y + rowH - 2);
    setTextColor(doc, highlight ? C.navyDark : C.black);
    doc.setFontSize(8);
    textRight(doc, value, x + w - 2, y + rowH - 2);
    return y + rowH;
  }

  /**
   * Render a summary recommendation bullet.
   */
  function recBullet(doc, idx, category, text, y) {
    var bx = ML;
    // Bullet circle
    setFill(doc, C.gold);
    setDraw(doc, C.gold);
    doc.circle(bx + 2.5, y + 2, 2.5, 'F');
    applyFont(doc);
    doc.setFontSize(7);
    setTextColor(doc, C.white);
    textCenter(doc, String(idx), bx + 2.5, y + 3.5);

    // Category badge
    doc.setFontSize(7);
    setTextColor(doc, C.navy);
    fillRect(doc, bx + 8, y, 18, 5.5, C.bgBlue);
    doc.text(category, bx + 9, y + 4);

    // Text
    doc.setFontSize(8);
    setTextColor(doc, C.black);
    var maxW = CW - 30;
    var wrapped = doc.splitTextToSize(text, maxW);
    doc.text(wrapped[0] || '', bx + 29, y + 4);
    var extraLines = wrapped.slice(1);
    var extraY = y + 5.5 + extraLines.length * 4.5;
    extraLines.forEach(function (line, li) {
      doc.text(line, bx + 29, y + 4 + (li + 1) * 4.5);
    });
    return extraY + 1;
  }

  // ---------------------------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------------------------

  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(n).toLocaleString('ja-JP');
  }

  function fmtMan(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(n / 10000).toLocaleString('ja-JP') + '万円';
  }

  function fmtPct(n) {
    if (n == null || isNaN(n)) return '—';
    return (Math.round(n * 10) / 10) + '%';
  }

  function fmtDate(d) {
    var dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---------------------------------------------------------------------------
  // Page 1: Cover
  // ---------------------------------------------------------------------------

  RG.generateCoverPage = function (doc, data) {
    var cs = data.clientSummary || {};

    // Full-page navy background
    fillRect(doc, 0, 0, PW, PH, C.navyDark);

    // Gold top stripe
    fillRect(doc, 0, 0, PW, 3, C.gold);

    // Decorative left edge bar
    fillRect(doc, 0, 3, 4, PH - 6, C.navyMid);
    fillRect(doc, 4, 3, 1, PH - 6, C.gold);

    // Center content area (white card)
    var cx  = 30;
    var cy  = 55;
    var cw  = PW - 60;
    var ch  = 165;
    fillRect(doc, cx, cy, cw, ch, C.white);
    // Gold top accent on card
    fillRect(doc, cx, cy, cw, 3, C.gold);
    // Subtle bottom accent
    fillRect(doc, cx, cy + ch - 3, cw, 3, C.navy);

    applyFont(doc);

    // Logo / main brand
    doc.setFontSize(20);
    setTextColor(doc, C.navy);
    textCenter(doc, 'LIFE DESIGN PARTNER', PW / 2, cy + 26);

    // Gold rule under logo
    hRule(doc, cx + 15, cy + 31, cw - 30, C.gold, 0.8);

    // Subtitle Japanese
    doc.setFontSize(13);
    setTextColor(doc, C.navyMid);
    textCenter(doc, 'ライフデザイン・レポート', PW / 2, cy + 44);

    // Thin separator
    hRule(doc, cx + 25, cy + 49, cw - 50, C.lightGray, 0.3);

    // Client name
    var clientName = (cs.name || 'お客様') + ' 様';
    doc.setFontSize(18);
    setTextColor(doc, C.navyDark);
    textCenter(doc, clientName, PW / 2, cy + 70);

    // Gold underline beneath name
    var nw = doc.getTextWidth(clientName);
    hRule(doc, PW / 2 - nw / 2, cy + 73, nw, C.gold, 0.6);

    // Report date
    var rDate = cs.reportDate || fmtDate(new Date());
    doc.setFontSize(9);
    setTextColor(doc, C.gray);
    textCenter(doc, '作成日：' + rDate, PW / 2, cy + 86);

    // Divider
    hRule(doc, cx + 20, cy + 93, cw - 40, C.lightGray, 0.2);

    // Client meta info
    var metaItems = [];
    if (cs.age)         metaItems.push('年齢：' + cs.age + '歳');
    if (cs.familyCompo) metaItems.push('家族：' + cs.familyCompo);
    if (cs.annualIncome && cs.annualIncome > 0) metaItems.push('年収：' + fmtMan(cs.annualIncome));

    doc.setFontSize(8.5);
    setTextColor(doc, C.navy);
    metaItems.forEach(function (item, i) {
      textCenter(doc, item, PW / 2, cy + 104 + i * 11);
    });

    // Advisor
    if (cs.advisorName) {
      doc.setFontSize(8);
      setTextColor(doc, C.gray);
      textCenter(doc, '担当：' + cs.advisorName, PW / 2, cy + 140);
    }

    // Confidential stamp at bottom of card
    doc.setFontSize(7.5);
    setTextColor(doc, C.gray);
    textCenter(doc, 'Confidential  /  お客様専用資料', PW / 2, cy + ch - 8);

    // Bottom page area
    doc.setFontSize(8);
    setTextColor(doc, C.goldLight);
    textCenter(doc, 'クライアントにとって最良の生活基盤を創出する', PW / 2, PH - 16);

    // Gold bottom stripe
    fillRect(doc, 0, PH - 3, PW, 3, C.gold);
  };

  // ---------------------------------------------------------------------------
  // Page 2: ライフプラン概要
  // ---------------------------------------------------------------------------

  RG.generateLifePlanPage = function (doc, data) {
    var cs = data.clientSummary || {};

    drawPageHeader(doc, 'ライフプラン概要');

    var y = 26;

    // ---- Client Profile ----
    y = sectionHeading(doc, '01  お客様プロフィール', y);

    var age     = parseInt(cs.age) || 30;
    var income  = cs.annualIncome  || 0;

    // Life stage determination
    var lifeStage;
    if (age < 30)       lifeStage = 'キャリア形成期（20代）';
    else if (age < 40)  lifeStage = 'ファミリー形成期（30代）';
    else if (age < 50)  lifeStage = '資産充実期（40代）';
    else if (age < 60)  lifeStage = '教育・老後準備期（50代）';
    else                lifeStage = 'セカンドライフ期（60代以降）';

    var profileRows = [
      ['お名前', (cs.name || '—') + ' 様'],
      ['年齢',   age + '歳'],
      ['家族構成', cs.familyCompo || '—'],
      ['職業・年収', income > 0 ? '年収 ' + fmtMan(income) : '—'],
      ['ライフステージ', lifeStage]
    ];

    profileRows.forEach(function (row) {
      y = infoRow(doc, row[0], row[1], ML, y, CW, false);
    });

    y += 4;

    // ---- Life Events Timeline ----
    y = sectionHeading(doc, '02  主要ライフイベント（目安）', y);

    var events = buildLifeEvents(age, cs.familyCompo || '');

    // Timeline visual
    var timelineY = y + 2;
    var timelineH  = 22;
    fillRect(doc, ML, timelineY, CW, timelineH, C.bgGray);
    strokeRect(doc, ML, timelineY, CW, timelineH, C.lightGray, 0.2);

    // Axis line
    var axisY = timelineY + timelineH * 0.55;
    hRule(doc, ML + 4, axisY, CW - 8, C.lightGray, 0.5);

    // Plot events
    var maxAge = Math.max(70, age + 35);
    var minAge = Math.max(20, age - 2);
    var span   = maxAge - minAge;

    events.forEach(function (ev) {
      var ratio = (ev.age - minAge) / span;
      var ex    = ML + 4 + ratio * (CW - 8);
      ex = Math.min(Math.max(ex, ML + 4), ML + CW - 8);

      // Dot
      setFill(doc, C.gold);
      setDraw(doc, C.gold);
      doc.circle(ex, axisY, 1.8, 'F');

      // Age label below
      applyFont(doc);
      doc.setFontSize(6);
      setTextColor(doc, C.navy);
      textCenter(doc, ev.age + '歳', ex, axisY + 5.5);

      // Event label above
      setTextColor(doc, C.navyDark);
      textCenter(doc, ev.label, ex, axisY - 5);
    });

    y = timelineY + timelineH + 5;

    // ---- Housing Needs ----
    y = sectionHeading(doc, '03  住まいニーズ分析', y);

    var housingNeeds = buildHousingNeeds(age, cs.familyCompo || '', income);
    applyFont(doc);
    doc.setFontSize(8);
    setTextColor(doc, C.black);
    var lines = doc.splitTextToSize(housingNeeds, CW - 4);
    fillRect(doc, ML, y, CW, lines.length * 5 + 6, C.bgGray);
    strokeRect(doc, ML, y, CW, lines.length * 5 + 6, C.lightGray, 0.2);
    setTextColor(doc, C.navy);
    doc.text(lines, ML + 3, y + 5);
    y += lines.length * 5 + 10;

    // ---- Life Stage Description ----
    y = sectionHeading(doc, '04  ライフステージ別チェックポイント', y);

    var checkpoints = buildCheckpoints(age);
    checkpoints.forEach(function (cp) {
      applyFont(doc);
      doc.setFontSize(7.5);
      // Bullet
      setFill(doc, C.navyMid);
      setDraw(doc, C.navyMid);
      doc.circle(ML + 2, y + 2, 1.5, 'F');
      setTextColor(doc, C.black);
      doc.text(cp, ML + 6, y + 3.5);
      y += 6.5;
    });

    drawPageFooter(doc, 2, 6);
  };

  // Life event builder
  function buildLifeEvents(age, familyCompo) {
    var events = [];
    events.push({ age: age,      label: '現在' });
    if (age < 35) {
      events.push({ age: age + 2,  label: '結婚' });
      events.push({ age: age + 4,  label: '第1子' });
    }
    if (age < 45) {
      events.push({ age: age + 12, label: '子 小学校' });
      events.push({ age: age + 18, label: '子 大学' });
    }
    events.push({ age: 60,       label: '退職準備' });
    events.push({ age: 65,       label: '定年退職' });
    // Remove events before current age or duplicates
    var seen = {};
    return events.filter(function (ev) {
      if (ev.age < age || seen[ev.age]) return false;
      seen[ev.age] = true;
      return true;
    }).slice(0, 6);
  }

  // Housing needs text builder
  function buildHousingNeeds(age, family, income) {
    var base = '';
    if (age < 35) {
      base = 'キャリア形成期は利便性と将来の家族計画を見据えた住まい選びが重要です。';
    } else if (age < 45) {
      base = 'ファミリー形成期は子育て環境・学区・広さが住宅選びの主要要件となります。';
    } else if (age < 55) {
      base = '資産充実期は不動産を資産形成の柱として位置付け、老後の住まいも視野に入れましょう。';
    } else {
      base = '老後準備期はバリアフリー・管理の容易さ・医療アクセスを重視した住まい選びをお勧めします。';
    }
    if (income > 8000000) {
      base += '年収水準から都市部・好立地物件も選択肢に入ります。';
    } else if (income > 5000000) {
      base += '年収水準に見合った無理のない住宅ローン設計が重要です。';
    }
    return base;
  }

  // Checkpoint builder
  function buildCheckpoints(age) {
    if (age < 35) {
      return [
        '緊急予備資金（生活費6ヶ月分）の確保を優先する',
        '住宅購入の頭金として少なくとも物件価格の10%〜20%を貯蓄する',
        '変動・固定金利の特性を理解し、ライフプランに合う返済計画を立てる',
        '共働き継続の想定でダブルインカムの活用を検討する'
      ];
    } else if (age < 45) {
      return [
        '教育費ピーク（高校〜大学）に備えた計画的積立を開始する',
        '住宅ローン繰上返済と教育費・老後資金のバランスを最適化する',
        '団体信用生命保険の保障内容を確認し、生命保険の見直しを行う',
        '住宅ローン控除の残余期間を確認し、節税メリットを最大化する'
      ];
    } else if (age < 55) {
      return [
        '老後資金（退職後20〜30年分）の不足額を試算し積立を強化する',
        '住宅ローン完済時期と退職時期の整合性を確認する',
        'iDeCo・NISAを活用した税制優遇投資を継続する',
        '不動産の維持費・修繕費の積立計画を立てる'
      ];
    } else {
      return [
        '退職後の収入（年金・資産運用）と支出のバランスを再確認する',
        'リバースモーゲージ等の活用も含め住宅資産の活用方法を検討する',
        '相続・贈与の観点から不動産の名義・持分を整理する',
        'バリアフリーリフォームの計画と費用を準備する'
      ];
    }
  }

  // ---------------------------------------------------------------------------
  // Page 3: 収支分析・住宅取得力
  // ---------------------------------------------------------------------------

  RG.generateFinancialPage = function (doc, data) {
    var ie  = data.incomeExpenseSummary || {};
    var af  = data.affordabilityResult  || {};
    var cs  = data.clientSummary        || {};

    drawPageHeader(doc, '収支分析・住宅取得力');
    var y = 26;

    // ---- Income/Expense ----
    y = sectionHeading(doc, '01  月次収支サマリー', y);

    var monthlyNet     = ie.monthlyNetIncome    || 0;
    var monthlyExp     = ie.monthlyTotalExpense || 0;
    var monthlySurplus = ie.monthlySurplus      || (monthlyNet - monthlyExp);
    var savingsRate    = ie.savingsRate || (monthlyNet > 0 ? (monthlySurplus / monthlyNet * 100) : 0);

    // Two-column info cards
    var halfW = CW / 2 - 2;
    var incomeRows = [
      ['手取り月収',    fmtMan(monthlyNet)],
      ['月次支出合計',  fmtMan(monthlyExp)],
      ['月次余剰',      fmtMan(monthlySurplus)]
    ];
    incomeRows.forEach(function (row) {
      y = infoRow(doc, row[0], row[1], ML, y, CW, row[0] === '月次余剰');
    });

    y += 3;

    // Savings rate bar
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.navy);
    doc.text('貯蓄率', ML, y + 4);
    var barColor = savingsRate >= 20 ? C.success : (savingsRate >= 10 ? C.warning : C.danger);
    drawBar(doc, ML + 16, y, CW - 40, 5, savingsRate, 40, barColor);
    doc.setFontSize(7.5);
    setTextColor(doc, C.black);
    textRight(doc, fmtPct(savingsRate), ML + CW, y + 4);
    y += 10;

    // Diagnosis text
    if (ie.diagnosis) {
      fillRect(doc, ML, y, CW, 8, C.bgBlue);
      strokeRect(doc, ML, y, CW, 8, C.lightGray, 0.15);
      doc.setFontSize(7.5);
      setTextColor(doc, C.navyDark);
      doc.text(truncate(doc, ie.diagnosis, CW - 6), ML + 3, y + 5.5);
      y += 11;
    }

    // ---- Affordability ----
    y = sectionHeading(doc, '02  住宅取得能力分析', y);

    if (af.maxLoanAmount) {
      y = infoRow(doc, '最大借入可能額',    fmtMan(af.maxLoanAmount),         ML, y, CW, false);
      y = infoRow(doc, '推奨借入額',        fmtMan(af.recommendedLoanAmount), ML, y, CW, true);

      // Monthly payment estimate
      var recLoan    = af.recommendedLoanAmount || 0;
      var monthlyPmt = recLoan > 0 ? Math.round(recLoan * 0.015 / 12 /
        (1 - Math.pow(1 + 0.015 / 12, -420))) : 0;
      y = infoRow(doc, '月次返済目安（35年/1.5%）', fmtMan(monthlyPmt) + '/月', ML, y, CW, false);

      // Risk level with traffic light
      var riskY = y;
      fillRect(doc, ML, riskY, CW * 0.38, 9, C.bgBlue);
      fillRect(doc, ML + CW * 0.38, riskY, CW * 0.62, 9, C.white);
      strokeRect(doc, ML, riskY, CW, 9, C.lightGray, 0.15);
      applyFont(doc);
      doc.setFontSize(7.5);
      setTextColor(doc, C.navy);
      doc.text('リスク判定', ML + 2, riskY + 6);
      var tlevel = af.riskLevel === 'safe' ? 'safe' : (af.riskLevel === 'caution' ? 'caution' : 'danger');
      drawTrafficLight(doc, ML + CW * 0.38 + 4, riskY + 0.5, tlevel);
      setTextColor(doc, C.black);
      doc.setFontSize(7.5);
      doc.text('（' + (af.riskLevelJa || af.riskLevel || '—') + '）', ML + CW * 0.38 + 36, riskY + 6);
      y = riskY + 10;

      // Explanation
      if (af.explanation) {
        fillRect(doc, ML, y, CW, 9, C.bgGray);
        strokeRect(doc, ML, y, CW, 9, C.lightGray, 0.15);
        applyFont(doc);
        doc.setFontSize(7.5);
        setTextColor(doc, C.gray);
        doc.text(truncate(doc, af.explanation, CW - 6), ML + 3, y + 6);
        y += 12;
      }
    } else {
      applyFont(doc);
      doc.setFontSize(8);
      setTextColor(doc, C.gray);
      doc.text('借入能力分析データがありません。', ML + 3, y + 6);
      y += 12;
    }

    // ---- Annual Income Guideline ----
    y = sectionHeading(doc, '03  年収別 住宅購入目安', y);

    var income = cs.annualIncome || 0;
    var guideRows = [
      ['年収 300万円', '1,800〜2,100万円', '5〜6倍'],
      ['年収 400万円', '2,400〜2,800万円', '6〜7倍'],
      ['年収 500万円', '3,000〜3,500万円', '6〜7倍'],
      ['年収 600万円', '3,600〜4,200万円', '6〜7倍'],
      ['年収 800万円', '4,800〜5,600万円', '6〜7倍'],
      ['年収1,000万円', '6,000〜7,000万円', '6〜7倍']
    ];

    var hiliteRows = [];
    guideRows.forEach(function (r, i) {
      var rowIncome = parseInt(r[0].replace(/[^0-9]/g, '')) * 10000;
      var diff = Math.abs(rowIncome - income);
      if (diff < 150 * 10000) hiliteRows.push(i);
    });

    y = drawTable(doc, y, ['年収目安', '物件価格目安', '年収倍率'], guideRows, {
      colWidths:    [60, 80, 42],
      rowHeight:    6.5,
      fontSize:     7.5,
      headerBg:     C.navyMid,
      highlightRows: hiliteRows
    });

    drawPageFooter(doc, 3, 6);
  };

  // ---------------------------------------------------------------------------
  // Page 4: 資産形成シミュレーション
  // ---------------------------------------------------------------------------

  RG.generateAssetPage = function (doc, data) {
    var cs    = data.clientSummary      || {};
    var proj  = data.lifeplanProjection || [];

    drawPageHeader(doc, '資産形成シミュレーション');
    var y = 26;

    y = sectionHeading(doc, '01  純資産推移シミュレーション', y);

    if (proj && proj.length > 0) {
      // Pick every 5 years
      var currentAge = parseInt(cs.age) || 30;
      var tableRows  = [];
      var highlight  = [];

      proj.forEach(function (row, idx) {
        var age = row.age || (currentAge + idx);
        if ((age - currentAge) % 5 === 0 || age === currentAge) {
          var isRetire = (age >= 60 && age <= 67);
          if (isRetire && tableRows.length > 0 && tableRows[tableRows.length - 1][0] === age + '歳') return;
          tableRows.push([
            age + '歳',
            fmtMan(row.financialAssets),
            fmtMan(row.propertyValue),
            fmtMan(row.loanBalance),
            fmtMan(row.netWorth)
          ]);
          if (isRetire) highlight.push(tableRows.length - 1);
        }
      });

      // Limit to 10 rows
      if (tableRows.length > 10) tableRows = tableRows.slice(0, 10);

      y = drawTable(doc, y,
        ['年齢', '金融資産', '不動産資産', 'ローン残高', '純資産'],
        tableRows, {
          colWidths:    [22, 42, 42, 42, 34],
          rowHeight:    7,
          fontSize:     7.5,
          headerBg:     C.navy,
          highlightRows: highlight
        }
      );

      // Retirement note
      applyFont(doc);
      doc.setFontSize(6.5);
      setTextColor(doc, C.gold);
      doc.text('★ 定年退職前後の行を金色でハイライト表示', ML, y);
      y += 6;
    } else {
      applyFont(doc);
      doc.setFontSize(8);
      setTextColor(doc, C.gray);
      doc.text('資産形成シミュレーションデータがありません。', ML, y + 5);
      y += 12;
    }

    // ---- Milestones ----
    y = sectionHeading(doc, '02  主要マイルストーン', y);

    var age = parseInt(cs.age) || 30;
    var milestones = [
      { label: '住宅ローン完済予定',   value: (age + 35) + '歳頃（35年ローン想定）' },
      { label: '子どもの教育費ピーク', value: (age + 18) + '〜' + (age + 22) + '歳頃（大学費用）' },
      { label: 'リタイアメント',        value: '65歳（年金受給開始）' },
      { label: '老後必要資金目安',      value: '2,000〜3,000万円（公的年金補完分）' }
    ];

    milestones.forEach(function (ms) {
      y = infoRow(doc, ms.label, ms.value, ML, y, CW, false);
    });

    y += 4;

    // ---- Retirement Readiness ----
    y = sectionHeading(doc, '03  老後準備度チェック', y);

    var lastRow = proj && proj.length > 0 ? proj[proj.length - 1] : null;
    var retireNetWorth = lastRow ? (lastRow.netWorth || 0) : 0;
    var targetRetire   = 30000000; // 3,000万円
    var readinessPct   = Math.min(100, Math.round((retireNetWorth / targetRetire) * 100));

    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.navy);
    doc.text('老後資金目標達成率（目標：' + fmtMan(targetRetire) + '）', ML, y + 4);
    y += 7;

    var readColor = readinessPct >= 80 ? C.success : (readinessPct >= 50 ? C.warning : C.danger);
    drawBar(doc, ML, y, CW - 25, 7, readinessPct, 100, readColor);
    doc.setFontSize(9);
    setTextColor(doc, readColor);
    textRight(doc, readinessPct + '%', ML + CW, y + 5.5);
    y += 12;

    var readMsg;
    if (readinessPct >= 80)     readMsg = '老後資金の準備は順調です。引き続き計画的な積立を継続しましょう。';
    else if (readinessPct >= 50) readMsg = '老後資金の準備はある程度進んでいますが、積立額の増加が望まれます。';
    else                         readMsg = '老後資金の準備が不足しています。iDeCo・NISAの活用と支出見直しを検討しましょう。';

    fillRect(doc, ML, y, CW, 9, C.bgGray);
    strokeRect(doc, ML, y, CW, 9, C.lightGray, 0.15);
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.black);
    var msgLines = doc.splitTextToSize(readMsg, CW - 6);
    doc.text(msgLines[0] || '', ML + 3, y + 6);
    y += 12;

    drawPageFooter(doc, 4, 6);
  };

  // ---------------------------------------------------------------------------
  // Page 5: 不動産オプション比較
  // ---------------------------------------------------------------------------

  RG.generateOptionsPage = function (doc, data) {
    var ro  = (data.recommendedOptions && data.recommendedOptions[0]) || {};
    var cs  = data.clientSummary || {};

    drawPageHeader(doc, '不動産オプション比較');
    var y = 26;

    // ---- Rent vs Buy ----
    y = sectionHeading(doc, '01  賃貸 vs 購入 比較', y);

    var income = cs.annualIncome || 0;
    var rvbRows = [];
    var rvbHeaders = ['比較項目', '賃貸', '購入'];

    rvbRows.push(['初期費用',         '敷金礼金 2〜3ヶ月',    '頭金＋諸費用 10〜20%']);
    rvbRows.push(['月次コスト',       '家賃（変動なし）',     'ローン＋管理・修繕費']);
    rvbRows.push(['資産形成',         '資産にならない',        '不動産資産を形成']);
    rvbRows.push(['住替えの柔軟性',   '高い（解約3ヶ月前）',  '低い（売却に時間要）']);
    rvbRows.push(['老後の住居費',     '家賃負担が続く',        'ローン完済後は低減']);
    rvbRows.push(['税制優遇',         'なし',                  '住宅ローン控除あり']);

    y = drawTable(doc, y, rvbHeaders, rvbRows, {
      colWidths: [48, 60, 74],
      rowHeight: 7,
      fontSize:  7.5,
      headerBg:  C.navyMid
    });

    // Break-even note
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.navy);
    doc.text('目安：購入コストが賃貸コストを下回るまでの損益分岐点は概ね8〜12年前後となります。', ML, y + 4);
    y += 10;

    // ---- New vs Used ----
    y = sectionHeading(doc, '02  新築 vs 中古 比較', y);

    var nvuRows = [
      ['価格水準',   '高め（プレミアム付）', '低め（築年数により）'],
      ['広さ（同予算）', '狭くなりがち',    '広くなりやすい'],
      ['設備・仕様', '最新設備',            '古い場合あり（リノベ可）'],
      ['住宅ローン控除', '最大13年間',       '築年数条件あり（10年等）'],
      ['修繕リスク', '当面低い',            '事前インスペクション推奨'],
      ['資産価値低下', '入居後急落傾向',    '下落率が緩やか']
    ];

    y = drawTable(doc, y, ['比較項目', '新築', '中古'], nvuRows, {
      colWidths: [44, 68, 70],
      rowHeight: 6.5,
      fontSize:  7.5,
      headerBg:  C.navy
    });

    // ---- Insurance & Tax ----
    y = sectionHeading(doc, '03  団体信用生命保険・住宅ローン控除 概要', y);

    var insRows = [
      ['団体信用生命保険', '住宅ローン付帯（一般団信）', '死亡・高度障害時にローン残高を保障'],
      ['三大疾病保障団信',  '特約付き（金利上乗せ）',    'がん・脳卒中・心筋梗塞で保障拡充'],
      ['住宅ローン控除',    '年末残高×0.7%を税額控除',  '最大13年間（新築・認定住宅）']
    ];

    y = drawTable(doc, y, ['保障・優遇', '概要', '備考'], insRows, {
      colWidths: [44, 72, 66],
      rowHeight: 7,
      fontSize:  7,
      headerBg:  C.navyMid
    });

    // ---- Interest Rate Scenarios ----
    y = sectionHeading(doc, '04  金利シナリオ別 月次返済試算（3,000万円・35年）', y);

    var scenarios = [
      ['変動金利（現在水準）', '0.5%',   fmtMan(calcMonthlyPmt(30000000, 0.005, 35)) + '/月'],
      ['変動金利（上昇後）',   '1.5%',   fmtMan(calcMonthlyPmt(30000000, 0.015, 35)) + '/月'],
      ['固定10年',             '1.8%',   fmtMan(calcMonthlyPmt(30000000, 0.018, 35)) + '/月'],
      ['フラット35',           '2.0%',   fmtMan(calcMonthlyPmt(30000000, 0.020, 35)) + '/月'],
      ['金利2.5%想定',         '2.5%',   fmtMan(calcMonthlyPmt(30000000, 0.025, 35)) + '/月']
    ];

    y = drawTable(doc, y, ['金利タイプ', '金利', '月次返済額'], scenarios, {
      colWidths: [70, 40, 72],
      rowHeight: 6.5,
      fontSize:  7.5,
      headerBg:  C.navy,
      highlightRows: [1]
    });

    drawPageFooter(doc, 5, 6);
  };

  // PMT helper for scenarios
  function calcMonthlyPmt(principal, annualRate, years) {
    var r = annualRate / 12;
    var n = years * 12;
    if (r === 0) return principal / n;
    return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  // ---------------------------------------------------------------------------
  // Page 6: Back Cover
  // ---------------------------------------------------------------------------

  RG.generateBackCover = function (doc, data) {
    var cs   = data.clientSummary     || {};
    var recs = data.keyRecommendations || [];

    // Navy full-page background
    fillRect(doc, 0, 0, PW, PH, C.navyDark);
    fillRect(doc, 0, 0, PW, 2.5, C.gold);
    fillRect(doc, 0, PH - 2.5, PW, 2.5, C.gold);
    fillRect(doc, 0, 2.5, 4, PH - 5, C.navyMid);
    fillRect(doc, 4, 2.5, 1, PH - 5, C.gold);

    applyFont(doc);

    // Section: Key Recommendations (white card)
    var cx = 22;
    var cy = 18;
    var cw = PW - 44;

    fillRect(doc, cx, cy, cw, 9, C.gold);
    doc.setFontSize(10);
    setTextColor(doc, C.navyDark);
    textCenter(doc, '主要アドバイス・ポイント', PW / 2, cy + 6.5);

    var recY = cy + 12;
    if (recs.length === 0) {
      recs = [
        { category: '住宅計画', text: 'ライフステージに合った住宅取得時期と物件選びを検討しましょう。' },
        { category: '家計管理', text: '月次収支を把握し、住宅費比率25%以内を目標にしてください。' },
        { category: '資産形成', text: 'iDeCo・NISAを活用し、長期・分散・積立の投資習慣を構築しましょう。' },
        { category: 'リスク管理', text: '団体信用生命保険と民間保険の保障内容を整合させてください。' },
        { category: '税制活用', text: '住宅ローン控除（最大13年間）を最大限に活用してください。' }
      ];
    }

    recs.slice(0, 5).forEach(function (rec, i) {
      // Light card per rec
      var rh = 13;
      fillRect(doc, cx, recY, cw, rh, i % 2 === 0 ? [30, 45, 140] : [22, 35, 110]);
      // Number circle
      setFill(doc, C.gold);
      setDraw(doc, C.gold);
      doc.circle(cx + 6, recY + rh / 2, 4.5, 'F');
      applyFont(doc);
      doc.setFontSize(8);
      setTextColor(doc, C.navyDark);
      textCenter(doc, String(i + 1), cx + 6, recY + rh / 2 + 2.8);
      // Category
      doc.setFontSize(7);
      setTextColor(doc, C.goldLight);
      doc.text(rec.category || '', cx + 14, recY + 5.5);
      // Text
      doc.setFontSize(8);
      setTextColor(doc, C.white);
      var maxW = cw - 18;
      var recText = truncate(doc, rec.text || '', maxW);
      doc.text(recText, cx + 14, recY + 10.5);
      recY += rh + 1;
    });

    // Divider
    hRule(doc, cx, recY + 4, cw, C.gold, 0.5);

    // Disclaimers
    var disclY = recY + 10;
    fillRect(doc, cx, disclY, cw, 38, [18, 28, 90]);
    strokeRect(doc, cx, disclY, cw, 38, C.gold, 0.3);

    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.goldLight);
    textCenter(doc, '【重要事項・免責事項】', PW / 2, disclY + 6);

    var disclaimers = [
      '本資料はライフプランニングの参考情報です',
      '投資判断は自己責任でお願いいたします',
      '金利・税制等は変更される場合があります',
      '詳細は専門家（税理士・司法書士等）にご相談ください',
      '将来の運用成果・収益を保証するものではありません'
    ];

    doc.setFontSize(7.5);
    setTextColor(doc, [200, 210, 240]);
    disclaimers.forEach(function (d, i) {
      // Bullet dot
      setFill(doc, C.gold);
      setDraw(doc, C.gold);
      doc.circle(cx + 4, disclY + 13 + i * 5.5, 1, 'F');
      doc.text(d, cx + 8, disclY + 14.5 + i * 5.5);
    });

    // Mission statement
    var missionY = disclY + 43;
    hRule(doc, cx, missionY, cw, C.gold, 0.4);
    applyFont(doc);
    doc.setFontSize(9);
    setTextColor(doc, C.goldLight);
    textCenter(doc, 'クライアントにとって最良の生活基盤を創出する', PW / 2, missionY + 8);

    // Brand
    doc.setFontSize(16);
    setTextColor(doc, C.white);
    textCenter(doc, 'LIFE DESIGN PARTNER', PW / 2, missionY + 20);

    hRule(doc, cx + 30, missionY + 24, cw - 60, C.gold, 0.6);

    // Prepared by area
    var prepY = missionY + 32;
    fillRect(doc, cx, prepY, cw, 22, [18, 28, 90]);
    strokeRect(doc, cx, prepY, cw, 22, C.gold, 0.3);
    applyFont(doc);
    doc.setFontSize(7.5);
    setTextColor(doc, C.goldLight);
    doc.text('担当者：', cx + 5, prepY + 7);
    doc.text('日付：' + (cs.reportDate || fmtDate(new Date())), cx + 5, prepY + 14);
    if (cs.advisorName) {
      setTextColor(doc, C.white);
      doc.text(cs.advisorName, cx + 24, prepY + 7);
    }

    // Page footer
    applyFont(doc);
    doc.setFontSize(6.5);
    setTextColor(doc, [120, 130, 170]);
    textCenter(doc, '6 / 6', PW / 2, PH - 6);
  };

  // ---------------------------------------------------------------------------
  // Main orchestration
  // ---------------------------------------------------------------------------

  /**
   * Generate all 6 pages and return the jsPDF document.
   * @param {object} reportData  Result of FinancialEngine.generateReportData() + clientSummary
   */
  RG.generate = function (reportData) {
    var doc = new jspdf.jsPDF({
      orientation: 'portrait',
      unit:        'mm',
      format:      'a4'
    });

    applyFont(doc);

    this.generateCoverPage(doc, reportData);

    doc.addPage();
    this.generateLifePlanPage(doc, reportData);

    doc.addPage();
    this.generateFinancialPage(doc, reportData);

    doc.addPage();
    this.generateAssetPage(doc, reportData);

    doc.addPage();
    this.generateOptionsPage(doc, reportData);

    doc.addPage();
    this.generateBackCover(doc, reportData);

    return doc;
  };

  /**
   * Download the PDF to the user's device.
   * @param {object} reportData
   */
  RG.download = function (reportData) {
    var doc      = this.generate(reportData);
    var name     = (reportData.clientSummary && reportData.clientSummary.name) || 'クライアント';
    var dateStr  = new Date().toISOString().slice(0, 10);
    var filename = name + '_ライフデザインレポート_' + dateStr + '.pdf';
    doc.save(filename);
  };

  /**
   * Open a preview of the PDF in a new browser tab.
   * @param {object} reportData
   */
  RG.preview = function (reportData) {
    var doc  = this.generate(reportData);
    var blob = doc.output('blob');
    var url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return RG;

}());

// CommonJS / Node.js support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportGenerator;
}
