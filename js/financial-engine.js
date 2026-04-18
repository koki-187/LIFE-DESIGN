/**
 * LIFE DESIGN PARTNER - Financial Analysis Engine
 * AFP (Affiliated Financial Planner) 対応 不動産ライフプランシステム
 *
 * 金融計算エンジン - 日本市場向け住宅・資産形成分析
 * All monetary values in Japanese Yen (円)
 */

var FinancialEngine = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 内部ユーティリティ
  // ---------------------------------------------------------------------------

  /**
   * 元利均等返済の月次返済額を計算 (PMT公式)
   * @param {number} rate  月利
   * @param {number} nper  返済回数（月）
   * @param {number} pv    借入元金
   * @returns {number} 月次返済額（円）
   */
  function pmt(rate, nper, pv) {
    if (rate === 0) return pv / nper;
    return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
  }

  /**
   * 数値を万円単位の文字列に変換
   */
  function toManEn(yen) {
    return Math.round(yen / 10000).toLocaleString('ja-JP') + '万円';
  }

  /**
   * 数値を円単位の文字列に変換
   */
  function toEn(yen) {
    return Math.round(yen).toLocaleString('ja-JP') + '円';
  }

  /**
   * 年収から所得税・住民税合算の実効税率を概算（簡易計算）
   * 日本の給与所得者を想定
   */
  function estimateTaxRate(annualIncome) {
    if (annualIncome <= 1950000) return 0.05;
    if (annualIncome <= 3300000) return 0.10;
    if (annualIncome <= 6950000) return 0.20;
    if (annualIncome <= 9000000) return 0.23;
    if (annualIncome <= 18000000) return 0.33;
    return 0.40;
  }

  /**
   * 給与所得控除後の課税所得を概算
   */
  function estimateTaxableIncome(annualIncome) {
    if (annualIncome <= 1625000) return annualIncome - 550000;
    if (annualIncome <= 1800000) return annualIncome * 0.60 - 100000;
    if (annualIncome <= 3600000) return annualIncome * 0.70 - 180000;
    if (annualIncome <= 6600000) return annualIncome * 0.80 - 540000;
    if (annualIncome <= 8500000) return annualIncome * 0.90 - 1200000;
    return annualIncome - 1950000;
  }

  // ---------------------------------------------------------------------------
  // 1. 住宅ローン計算
  // ---------------------------------------------------------------------------

  /**
   * 住宅ローン計算
   * @param {object} params
   * @param {number} params.loanAmount        借入額（円）
   * @param {number} params.interestRate      年利（例: 0.015 = 1.5%）
   * @param {number} params.termYears         返済年数
   * @param {number} [params.bonusPayment=0]  ボーナス加算月額（円）
   * @param {string} [params.repaymentType]   'equal_payment'(元利均等) | 'equal_principal'(元金均等)
   */
  function calculateMortgage(params) {
    var loanAmount     = params.loanAmount     || 0;
    var interestRate   = params.interestRate   || 0.015;
    var termYears      = params.termYears      || 35;
    var bonusPayment   = params.bonusPayment   || 0;
    var repaymentType  = params.repaymentType  || 'equal_payment';

    var monthlyRate  = interestRate / 12;
    var totalMonths  = termYears * 12;

    var monthlySchedule = [];
    var yearlySchedule  = [];

    var totalPayment  = 0;
    var totalInterest = 0;
    var monthlyPayment;

    if (repaymentType === 'equal_payment') {
      // 元利均等返済
      monthlyPayment = pmt(monthlyRate, totalMonths, loanAmount);
      var balance = loanAmount;

      for (var m = 1; m <= totalMonths; m++) {
        var interestPortion   = balance * monthlyRate;
        var principalPortion  = monthlyPayment - interestPortion;
        balance -= principalPortion;
        if (balance < 0) balance = 0;

        totalPayment  += monthlyPayment + (m % 6 === 0 ? bonusPayment : 0);
        totalInterest += interestPortion;

        if (m <= 12) {
          monthlySchedule.push({
            month:            m,
            payment:          Math.round(monthlyPayment),
            principalPaid:    Math.round(principalPortion),
            interestPaid:     Math.round(interestPortion),
            remainingBalance: Math.round(balance)
          });
        }

        if (m % 12 === 0) {
          var yr = m / 12;
          var yearStart = yr === 1 ? loanAmount : yearlySchedule[yr - 2].remainingBalance;
          yearlySchedule.push({
            year:             yr,
            principalPaid:    Math.round(yearStart - balance),
            interestPaid:     Math.round(interestPortion * 12),
            remainingBalance: Math.round(balance)
          });
        }
      }
    } else {
      // 元金均等返済
      var monthlyPrincipal = loanAmount / totalMonths;
      var balance2 = loanAmount;
      monthlyPayment = monthlyPrincipal + balance2 * monthlyRate; // 初月

      for (var m2 = 1; m2 <= totalMonths; m2++) {
        var ip2 = balance2 * monthlyRate;
        var payment2 = monthlyPrincipal + ip2;
        balance2 -= monthlyPrincipal;
        if (balance2 < 0) balance2 = 0;

        totalPayment  += payment2 + (m2 % 6 === 0 ? bonusPayment : 0);
        totalInterest += ip2;

        if (m2 <= 12) {
          monthlySchedule.push({
            month:            m2,
            payment:          Math.round(payment2),
            principalPaid:    Math.round(monthlyPrincipal),
            interestPaid:     Math.round(ip2),
            remainingBalance: Math.round(balance2)
          });
        }

        if (m2 % 12 === 0) {
          var yr2 = m2 / 12;
          var yStart2 = yr2 === 1 ? loanAmount : yearlySchedule[yr2 - 2].remainingBalance;
          yearlySchedule.push({
            year:             yr2,
            principalPaid:    Math.round(yStart2 - balance2),
            interestPaid:     Math.round(ip2 * 12),
            remainingBalance: Math.round(balance2)
          });
        }
      }
    }

    return {
      monthlyPayment:   Math.round(monthlyPayment),
      totalPayment:     Math.round(totalPayment),
      totalInterest:    Math.round(totalInterest),
      yearlySchedule:   yearlySchedule,
      monthlySchedule:  monthlySchedule
    };
  }

  // ---------------------------------------------------------------------------
  // 2. 収支分析
  // ---------------------------------------------------------------------------

  /**
   * 収支分析
   * @param {object} params
   * @param {number} params.annualIncome   本人年収（円）
   * @param {number} [params.spouseIncome] 配偶者年収（円）
   * @param {object} params.expenses       月次支出内訳（円）
   * @param {number} [params.currentRent]  現在の家賃（円）
   * @param {number} [params.savings]      月次貯蓄額（円）
   */
  function analyzeIncomeExpense(params) {
    var annualIncome  = params.annualIncome  || 0;
    var spouseIncome  = params.spouseIncome  || 0;
    var currentRent   = params.currentRent   || 0;
    var savings       = params.savings       || 0;
    var exp           = params.expenses      || {};

    var totalAnnual = annualIncome + spouseIncome;
    var monthlyGross = totalAnnual / 12;

    // 手取り概算（社会保険料約15%、所得税・住民税）
    var taxRate      = estimateTaxRate(annualIncome);
    var spouseTaxRate = estimateTaxRate(spouseIncome);
    var netAnnual    = annualIncome * (1 - taxRate - 0.15) + spouseIncome * (1 - spouseTaxRate - 0.14);
    var monthlyNet   = netAnnual / 12;

    var expenseItems = {
      food:           exp.food          || 0,
      utilities:      exp.utilities     || 0,
      communication:  exp.communication || 0,
      transportation: exp.transportation|| 0,
      insurance:      exp.insurance     || 0,
      education:      exp.education     || 0,
      entertainment:  exp.entertainment || 0,
      other:          exp.other         || 0,
      rent:           currentRent
    };

    var totalExpense = Object.values(expenseItems).reduce(function (s, v) { return s + v; }, 0);
    var surplus      = monthlyNet - totalExpense;
    var savingsRate  = monthlyNet > 0 ? (savings / monthlyNet) * 100 : 0;

    var expenseBreakdown = [
      { label: '食費',         value: expenseItems.food,           ratio: 0 },
      { label: '水道光熱費',   value: expenseItems.utilities,      ratio: 0 },
      { label: '通信費',       value: expenseItems.communication,  ratio: 0 },
      { label: '交通費',       value: expenseItems.transportation, ratio: 0 },
      { label: '保険料',       value: expenseItems.insurance,      ratio: 0 },
      { label: '教育費',       value: expenseItems.education,      ratio: 0 },
      { label: '娯楽費',       value: expenseItems.entertainment,  ratio: 0 },
      { label: '住居費',       value: expenseItems.rent,           ratio: 0 },
      { label: 'その他',       value: expenseItems.other,          ratio: 0 }
    ].filter(function (i) { return i.value > 0; });

    expenseBreakdown.forEach(function (item) {
      item.ratio = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
    });

    // 診断テキスト
    var diagnosis;
    var recommendations = [];

    if (savingsRate >= 20) {
      diagnosis = '家計は非常に健全です。貯蓄率' + savingsRate.toFixed(1) + '%は理想的な水準を達成しています。住宅購入に向けた資産形成が順調に進んでいます。';
    } else if (savingsRate >= 10) {
      diagnosis = '家計は概ね安定しています。貯蓄率' + savingsRate.toFixed(1) + '%はまずまずの水準ですが、住宅取得後の生活費増加に備え、さらなる改善が望まれます。';
      recommendations.push('住居費以外の固定費（通信費・保険料）の見直しを検討しましょう。');
    } else if (savingsRate >= 5) {
      diagnosis = '家計にやや余裕が少ない状態です。貯蓄率' + savingsRate.toFixed(1) + '%は住宅ローン返済開始後に生活が苦しくなる可能性があります。';
      recommendations.push('月々の変動費を10〜15%削減することを目標にしてください。');
      recommendations.push('副収入や収入増加の可能性を検討しましょう。');
    } else {
      diagnosis = '家計の収支改善が住宅取得の前提条件です。貯蓄率が低く、ローン返済能力に不安があります。まず家計の見直しを優先してください。';
      recommendations.push('固定費の大幅な見直しが急務です（目安：月収の25%以内）。');
      recommendations.push('住宅取得は最低1〜2年後を目標に、その間に頭金を積み立てましょう。');
    }

    if (expenseItems.food > monthlyNet * 0.15) {
      recommendations.push('食費が収入の15%を超えています。食費の節約（自炊増加等）を検討してください。');
    }
    if (expenseItems.communication > 20000) {
      recommendations.push('通信費が月2万円を超えています。格安SIMへの乗り換え等で削減できる可能性があります。');
    }
    if (expenseItems.entertainment > monthlyNet * 0.10) {
      recommendations.push('娯楽費が収入の10%を超えています。優先順位をつけた支出管理を心がけましょう。');
    }
    if (recommendations.length === 0) {
      recommendations.push('現在の家計管理は良好です。このペースを維持しながら頭金の積み立てを続けましょう。');
      recommendations.push('NISAやiDeCoを活用した資産運用も検討することをお勧めします。');
    }

    return {
      monthlyGrossIncome:  Math.round(monthlyGross),
      monthlyNetIncome:    Math.round(monthlyNet),
      monthlyTotalExpense: Math.round(totalExpense),
      monthlySurplus:      Math.round(surplus),
      savingsRate:         Math.round(savingsRate * 10) / 10,
      expenseBreakdown:    expenseBreakdown,
      diagnosis:           diagnosis,
      recommendations:     recommendations
    };
  }

  // ---------------------------------------------------------------------------
  // 3. 住宅取得可能額
  // ---------------------------------------------------------------------------

  /**
   * 住宅取得可能額の算出
   * @param {object} params
   * @param {number} params.annualIncome        本人年収（円）
   * @param {number} [params.spouseIncome]      配偶者年収（円）
   * @param {number} [params.existingDebt]      既存借入月返済額（円）
   * @param {number} [params.savings]           自己資金（円）
   * @param {number} [params.desiredTermYears]  希望返済年数
   * @param {number} [params.interestRate]      適用金利（年利）
   */
  function calculateAffordability(params) {
    var annualIncome   = params.annualIncome   || 0;
    var spouseIncome   = params.spouseIncome   || 0;
    var existingDebt   = params.existingDebt   || 0;
    var savings        = params.savings        || 0;
    var termYears      = params.desiredTermYears || 35;
    var interestRate   = params.interestRate   || 0.015;

    var totalAnnual    = annualIncome + spouseIncome;
    var monthlyIncome  = totalAnnual / 12;
    var monthlyRate    = interestRate / 12;
    var totalMonths    = termYears * 12;

    // 返済比率の目安（日本の金融機関審査基準）
    // 年収400万円未満: 30%, 400万円以上: 35%
    var maxRatio     = totalAnnual < 4000000 ? 0.30 : 0.35;
    var safeRatio    = 0.25;
    var idealRatio   = 0.20;

    var maxMonthlyPayment         = monthlyIncome * maxRatio - existingDebt;
    var recommendedMonthlyPayment = monthlyIncome * safeRatio - existingDebt;

    if (maxMonthlyPayment < 0) maxMonthlyPayment = 0;
    if (recommendedMonthlyPayment < 0) recommendedMonthlyPayment = 0;

    // PMT逆算: 借入可能額 = payment * [(1-(1+r)^-n) / r]
    function maxLoanFromPayment(payment) {
      if (monthlyRate === 0) return payment * totalMonths;
      return payment * (1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate;
    }

    var maxLoanAmount         = maxLoanFromPayment(maxMonthlyPayment);
    var recommendedLoanAmount = maxLoanFromPayment(recommendedMonthlyPayment);

    var housingCostRatio = monthlyIncome > 0
      ? (maxMonthlyPayment / monthlyIncome) * 100
      : 0;

    // リスク判定
    var actualRatio = existingDebt > 0
      ? ((maxMonthlyPayment + existingDebt) / monthlyIncome)
      : (maxMonthlyPayment / monthlyIncome);

    var riskLevel, riskLevelJa, explanation;
    if (actualRatio <= 0.20) {
      riskLevel   = 'safe';
      riskLevelJa = '安全圏';
      explanation = '返済比率は' + (actualRatio * 100).toFixed(1) + '%と余裕のある水準です。万一の収入減や金利上昇にも対応できる安定した返済計画が組めます。';
    } else if (actualRatio <= 0.25) {
      riskLevel   = 'moderate';
      riskLevelJa = '標準圏';
      explanation = '返済比率は' + (actualRatio * 100).toFixed(1) + '%で、一般的な水準です。収入の安定性を維持すれば無理のない返済が可能です。';
    } else if (actualRatio <= 0.35) {
      riskLevel   = 'risky';
      riskLevelJa = '要注意圏';
      explanation = '返済比率は' + (actualRatio * 100).toFixed(1) + '%とやや高めです。収入変動や金利上昇リスクへの備えが必要です。緊急予備資金の確保を優先してください。';
    } else {
      riskLevel   = 'dangerous';
      riskLevelJa = '危険圏';
      explanation = '返済比率が' + (actualRatio * 100).toFixed(1) + '%と高水準です。借入額の見直しまたは収入増加が強く推奨されます。現状での住宅取得はリスクが高い状態です。';
    }

    var safetyLine = maxLoanFromPayment(monthlyIncome * 0.35 - existingDebt);

    return {
      maxLoanAmount:             Math.round(maxLoanAmount),
      recommendedLoanAmount:     Math.round(recommendedLoanAmount),
      maxMonthlyPayment:         Math.round(maxMonthlyPayment),
      recommendedMonthlyPayment: Math.round(recommendedMonthlyPayment),
      housingCostRatio:          Math.round(housingCostRatio * 10) / 10,
      riskLevel:                 riskLevel,
      riskLevelJa:               riskLevelJa,
      explanation:               explanation,
      idealRange: {
        min: Math.round(recommendedLoanAmount * 0.80),
        max: Math.round(recommendedLoanAmount)
      },
      safetyLine:                Math.round(safetyLine),
      selfFundingRequired:       Math.round(savings * 0.10) // 購入諸費用の目安
    };
  }

  // ---------------------------------------------------------------------------
  // 4. 賃貸 vs 購入 比較
  // ---------------------------------------------------------------------------

  /**
   * 賃貸 vs 購入 比較分析
   */
  function compareRentVsBuy(params) {
    var monthlyRent        = params.monthlyRent        || 100000;    // 現在の家賃（円）
    var annualRentIncrease = params.annualRentIncrease || 0.005;     // 0.5%
    var propertyPrice      = params.propertyPrice      || 40000000;  // 物件価格（円）
    var downPayment        = params.downPayment        || 4000000;   // 頭金（円）
    var loanInterestRate   = params.loanInterestRate   || 0.015;
    var loanTermYears      = params.loanTermYears      || 35;
    var propertyTax        = params.propertyTax        || 120000;    // 年額（円）
    var maintenanceFee     = params.maintenanceFee     || 10000;     // 月額（修繕積立金）（円）
    var managementFee      = params.managementFee      || 15000;     // 月額（管理費）（円）
    var investmentReturn   = params.investmentReturnRate || 0.03;    // 年率
    var inflationRate      = params.inflationRate      || 0.01;
    var years              = params.comparisonYears    || 35;
    // 追加: より正確な計算のための新パラメータ
    var renewalFee         = params.renewalFee         || monthlyRent;    // 更新料（2年ごと・家賃1ヶ月分）（円）
    var fireInsurance      = params.fireInsurance      || 20000;          // 火災保険（円/年）
    var rentIncreaseRate   = params.rentIncreaseRate   || 0.005;          // 賃料上昇率（0.5%/年）

    var loanAmount    = propertyPrice - downPayment;
    var mortgageResult = calculateMortgage({
      loanAmount:    loanAmount,
      interestRate:  loanInterestRate,
      termYears:     loanTermYears,
      repaymentType: 'equal_payment'
    });
    var monthlyMortgage = mortgageResult.monthlyPayment;

    // 購入時諸費用（物件価格の約7%）
    var purchaseCosts = propertyPrice * 0.07;

    var yearlyComparison  = [];
    var rentCumulative    = 0;
    var buyCumulative     = downPayment + purchaseCosts;
    var totalDeduction    = 0;

    // 賃貸：差額を運用に回す想定（頭金＋諸費用を初期投資として運用）
    var rentInvestment   = downPayment + purchaseCosts;
    var buyEquity        = downPayment;
    var loanBalance      = loanAmount;
    var currentPropertyValue = propertyPrice;

    // 不動産価値減価率（日本の中古マンション平均）
    var annualDepreciation = 0.015;

    for (var y = 1; y <= years; y++) {
      // 賃貸コスト（賃料上昇率を考慮）
      var yearlyRent  = monthlyRent * 12 * Math.pow(1 + rentIncreaseRate, y);
      // 2年ごとに更新料（家賃1ヶ月分）を加算
      var yearRenewal = (y % 2 === 0) ? monthlyRent * Math.pow(1 + rentIncreaseRate, y) : 0;
      rentCumulative += yearlyRent + yearRenewal;

      // 賃貸での差額投資（購入月次コストとの差額）
      var buyMonthlyCost  = monthlyMortgage + maintenanceFee + managementFee + propertyTax / 12;
      var diffMonthly     = Math.max(0, buyMonthlyCost - monthlyRent);
      rentInvestment      = rentInvestment * (1 + investmentReturn) + diffMonthly * 12;

      // 購入コスト（火災保険を含む）
      var yearlyBuyCost = (y <= loanTermYears ? monthlyMortgage * 12 : 0)
                        + maintenanceFee * 12
                        + managementFee * 12
                        + propertyTax
                        + fireInsurance;
      buyCumulative += yearlyBuyCost;

      // 残債更新
      if (y <= loanTermYears) {
        loanBalance = mortgageResult.yearlySchedule[Math.min(y - 1, mortgageResult.yearlySchedule.length - 1)].remainingBalance;
      } else {
        loanBalance = 0;
      }

      // 住宅ローン控除（13年間・年末残債×0.7%・上限21万円）
      if (y <= 13) {
        var deduction = Math.min(loanBalance * 0.007, 210000);
        buyCumulative  -= deduction;
        totalDeduction += deduction;
      }

      // 不動産評価額更新（10年目以降は緩やかな下落→底値）
      if (y <= 10) {
        currentPropertyValue *= (1 - annualDepreciation);
      } else {
        currentPropertyValue *= (1 - annualDepreciation * 0.3);
      }

      buyEquity = currentPropertyValue - loanBalance;

      var rentNetWorth = rentInvestment - rentCumulative;
      var buyNetWorth  = buyEquity - buyCumulative; // buyEquity = currentPropertyValue - loanBalance（物件価値を二重計上しない）

      yearlyComparison.push({
        year:               y,
        rentCumulativeCost: Math.round(rentCumulative),
        buyCumulativeCost:  Math.round(buyCumulative),
        rentAssets:         Math.round(rentInvestment),
        buyAssets:          Math.round(currentPropertyValue),
        rentNetWorth:       Math.round(rentInvestment - rentCumulative),
        buyNetWorth:        Math.round(buyEquity - buyCumulative)
      });
    }

    // 損益分岐点（購入の純資産 > 賃貸の純資産）
    var breakEvenYear = null;
    for (var i = 0; i < yearlyComparison.length; i++) {
      if (yearlyComparison[i].buyNetWorth >= yearlyComparison[i].rentNetWorth) {
        breakEvenYear = yearlyComparison[i].year;
        break;
      }
    }

    var finalYear    = yearlyComparison[years - 1];
    var difference   = finalYear.buyNetWorth - finalYear.rentNetWorth;
    var recommendation = difference > 0 ? 'buy' : 'rent';

    // 減価係数（最終年の物件価値算出用）
    var depreciationFactor = 1;
    for (var dy = 1; dy <= years; dy++) {
      if (dy <= 10) {
        depreciationFactor *= (1 - annualDepreciation);
      } else {
        depreciationFactor *= (1 - annualDepreciation * 0.3);
      }
    }
    var finalPropertyValue = propertyPrice * depreciationFactor;
    var finalLoanBalance   = years >= loanTermYears ? 0 : (mortgageResult.yearlySchedule[Math.min(years - 1, mortgageResult.yearlySchedule.length - 1)] || {remainingBalance: 0}).remainingBalance;

    var analysis = recommendation === 'buy'
      ? years + '年後の純資産比較では、購入が賃貸より約' + toManEn(Math.abs(difference)) + '有利な結果となっています。'
        + (breakEvenYear ? '損益分岐点は' + breakEvenYear + '年目です。' : '')
        + '長期居住を前提とすれば、購入は資産形成の観点から合理的な選択です。'
      : years + '年後の純資産比較では、賃貸が購入より約' + toManEn(Math.abs(difference)) + '有利な結果となっています。'
        + '流動性・柔軟性を重視する場合や、短期居住の場合は賃貸が合理的です。';

    var factors = [
      '【購入メリット】資産として残る／家賃上昇リスクなし／自由にリフォーム可',
      '【購入デメリット】初期費用（頭金＋諸費用）が大きい／転居の柔軟性が低下',
      '【賃貸メリット】初期費用が少ない／転居・ライフスタイル変更が容易',
      '【賃貸デメリット】家賃は資産にならない／更新・退去リスク',
      '【金利リスク】変動金利選択の場合、将来の金利上昇に注意が必要',
      '【不動産市況】エリアの将来性・利便性が資産価値に大きく影響'
    ];

    return {
      rentTotal:          Math.round(finalYear.rentCumulativeCost),
      buyTotal:           Math.round(finalYear.buyCumulativeCost),
      difference:         Math.round(difference),
      recommendation:     recommendation,
      breakEvenYear:      breakEvenYear,
      yearlyComparison:   yearlyComparison,
      propertyValue:      Math.round(finalPropertyValue),
      inputMonthlyRent:   monthlyRent,
      loanDeductionTotal: Math.round(totalDeduction),
      rentNetWorth:       Math.round(rentInvestment - rentCumulative),
      buyNetWorth:        Math.round(finalPropertyValue - finalLoanBalance - buyCumulative),
      analysis:           analysis,
      factors:            factors
    };
  }

  // ---------------------------------------------------------------------------
  // 5. 団信 vs 民間生命保険 比較
  // ---------------------------------------------------------------------------

  /**
   * 団体信用生命保険（団信）と民間生命保険の比較
   */
  function compareInsurance(params) {
    var age               = params.age               || 35;
    var loanAmount        = params.loanAmount        || 35000000;
    var loanTermYears     = params.loanTermYears      || 35;
    var currentPremium    = params.currentInsurancePremium || 15000; // 月額
    var familyMembers     = params.familyMembers     || 3;

    // 団信コスト（金利に0.2〜0.3%上乗せが一般的）
    // ここでは通常団信は金利込みとして月0円とし、特約団信のコストを示す
    var danshinMonthlyRate = loanAmount * 0.002 / 12; // 0.2%/年
    var danshinAnnual      = danshinMonthlyRate * 12;
    var danshinTotal       = danshinAnnual * loanTermYears;

    // 民間生命保険の代替コスト（収入保障保険+死亡保障の概算）
    // 年齢・家族構成から必要保障額を推算
    var necessaryDeathCoverage = loanAmount + familyMembers * 5000000; // 借入額＋生活費
    var regularAnnualPremium   = Math.max(currentPremium * 12, necessaryDeathCoverage * 0.001); // 保険料率0.1%目安
    var regularTotal           = regularAnnualPremium * loanTermYears;

    var monthlySavings      = Math.max(0, (regularAnnualPremium - danshinAnnual) / 12);
    var totalSavings        = Math.max(0, regularTotal - danshinTotal);

    var recommendation = '団信（団体信用生命保険）は住宅ローンに付帯される生命保険で、'
      + '死亡・高度障害時にローン残債が全額弁済されます。'
      + '一般的には金利に含まれるため実質的な追加コストが低く、'
      + '民間の定期保険と比較してコストパフォーマンスに優れています。\n'
      + '団信加入後は、重複する死亡保険の保険金額を見直し、'
      + '医療保険・就業不能保険など他のリスクへの備えに資源を振り向けることを推奨します。';

    var comparisonTable = [
      { item: '死亡・高度障害',     danshin: 'ローン残債を全額弁済',       regular: '保険金を遺族へ支払い' },
      { item: '月額コスト',         danshin: '金利に含まれる（実質0円〜）', regular: toEn(Math.round(regularAnnualPremium / 12)) },
      { item: '保障期間',           danshin: 'ローン完済まで',              regular: '契約期間（更新必要）' },
      { item: '告知・審査',         danshin: '健康状態の告知が必要',        regular: '告知または医師の診査' },
      { item: '保障額の変化',       danshin: '残債に連動して減少',          regular: '定額または逓減' },
      { item: '特約（がん・3大疾病）', danshin: '特約付団信で選択可',       regular: '別途特約追加で対応可' },
      { item: '解約返戻金',         danshin: 'なし',                        regular: '掛捨ては原則なし' }
    ];

    var optimizationPlan = '【保険最適化プラン】\n'
      + '1. 団信加入により、住宅ローン相当の死亡保険は実質不要になります。\n'
      + '2. 現在加入の生命保険の死亡保障を' + toManEn(necessaryDeathCoverage * 0.5) + '程度に減額することを検討してください。\n'
      + '3. 浮いた保険料を医療保険・就業不能保険の充実に回すことで、'
      + '入院・病気・ケガによる収入ダウンリスクをカバーできます。\n'
      + '4. ワイド団信（3大疾病・がん保障付）を選択すると、'
      + '重篤な疾病時もローンが免除される安心感が得られます（金利+0.1〜0.3%程度）。';

    return {
      danshinCost:          Math.round(danshinAnnual),
      danshinCoverage:      '住宅ローン残債（死亡・高度障害時に全額免除）',
      regularInsuranceCost: Math.round(regularAnnualPremium),
      monthlySavings:       Math.round(monthlySavings),
      totalSavingsOverTerm: Math.round(totalSavings),
      recommendation:       recommendation,
      comparisonTable:      comparisonTable,
      optimizationPlan:     optimizationPlan
    };
  }

  // ---------------------------------------------------------------------------
  // 6. 住宅ローン控除
  // ---------------------------------------------------------------------------

  /**
   * 住宅ローン控除（住宅借入金等特別控除）の試算
   * 2024年度税制（令和6年以降）に基づく概算
   */
  function calculateTaxBenefits(params) {
    var loanAmount       = params.loanAmount       || 35000000;
    var annualIncome     = params.annualIncome      || 6000000;
    var propertyType     = params.propertyType      || 'existing'; // 'new' | 'existing'
    var isNewConstruction = params.isNewConstruction || false;
    var moveInYear       = params.moveInYear        || 2024;

    // 2024年度税制（令和6年以降）住宅ローン控除 借入限度額・控除期間
    //   新築 長期優良住宅・ZEH水準省エネ住宅: 上限5,000万円 × 0.7% × 13年 → 最大35万円/年
    //   新築 一般住宅（省エネ基準適合）:       上限3,000万円 × 0.7% × 13年 → 最大21万円/年
    //   中古住宅:                               上限2,000万円 × 0.7% × 10年 → 最大14万円/年
    // params.certifiedHousing = true で長期優良住宅/ZEH扱いとする
    var isNew            = isNewConstruction || propertyType === 'new';
    var isCertified      = params.certifiedHousing || false; // 長期優良住宅・ZEH
    var limitAmount      = isNew ? (isCertified ? 50000000 : 30000000) : 20000000;
    var deductionRate    = 0.007; // 0.7%
    var deductionYears   = isNew ? 13 : 10;

    // 課税所得と所得税額の概算
    var taxableIncome = estimateTaxableIncome(annualIncome);
    var incomeTax     = taxableIncome * estimateTaxRate(annualIncome);
    var residentialTax = annualIncome * 0.05; // 住民税5%概算
    var totalTax       = incomeTax + residentialTax;

    // 住民税控除上限（令和4年以降 9.75万円）
    var residentialTaxLimit = 97500;

    var mortgageResult = calculateMortgage({
      loanAmount:   loanAmount,
      interestRate: 0.015,
      termYears:    35,
      repaymentType: 'equal_payment'
    });

    var yearlyDeduction = [];
    var totalBenefit    = 0;

    for (var y = 1; y <= deductionYears; y++) {
      var scheduleIdx  = Math.min(y - 1, mortgageResult.yearlySchedule.length - 1);
      var loanBalance  = y === 1 ? loanAmount : mortgageResult.yearlySchedule[scheduleIdx - 1].remainingBalance;
      var calcBase     = Math.min(loanBalance, limitAmount);
      var deduction    = Math.round(calcBase * deductionRate);

      // 実際の節税額は所得税＋住民税（上限あり）で按分
      var incomeTaxBenefit    = Math.min(deduction, incomeTax);
      var residentialBenefit  = Math.min(Math.max(0, deduction - incomeTaxBenefit), residentialTaxLimit);
      var actualBenefit       = incomeTaxBenefit + residentialBenefit;

      totalBenefit += actualBenefit;

      yearlyDeduction.push({
        year:          moveInYear + y - 1,
        loanBalance:   Math.round(loanBalance),
        deduction:     deduction,
        actualBenefit: Math.round(actualBenefit)
      });
    }

    var propertyLabel = isNew
      ? (isCertified ? '新築（長期優良住宅・ZEH）' : '新築（一般住宅）')
      : '中古住宅';
    var explanation = '【住宅ローン控除（住宅借入金等特別控除）について】\n'
      + '物件区分: ' + propertyLabel + '\n'
      + '年末のローン残高（上限' + toManEn(limitAmount) + '）の0.7%を所得税・住民税から最大' + deductionYears + '年間控除できます。\n'
      + '年間最大控除額: ' + toManEn(Math.round(limitAmount * deductionRate)) + '\n'
      + '試算では' + deductionYears + '年間の合計控除メリットは約' + toManEn(totalBenefit) + 'となります。\n'
      + '実際の控除額は確定申告（初年度）および年末調整（2年目以降）で適用されます。';

    var eligibilityNotes = [
      '入居年の翌年3月15日までに確定申告が必要（初年度のみ）',
      '合計所得金額が2,000万円以下であること',
      '新築・取得日から6ヶ月以内に居住を開始すること',
      '控除を受ける年の12月31日まで引き続き居住していること',
      '床面積が50㎡以上（合計所得1,000万円以下の場合は40㎡以上）',
      '「省エネ基準適合住宅」等の認定区分により控除限度額が異なります',
      '中古住宅の場合、昭和57年以降建築または耐震基準適合証明書が必要'
    ];

    return {
      yearlyDeduction:    yearlyDeduction,
      totalBenefit:       Math.round(totalBenefit),
      explanation:        explanation,
      eligibilityNotes:   eligibilityNotes
    };
  }

  // ---------------------------------------------------------------------------
  // 7. 金利変動シミュレーション
  // ---------------------------------------------------------------------------

  /**
   * 金利変動による影響分析
   */
  function analyzeInterestRateImpact(params) {
    var loanAmount = params.loanAmount || 35000000;
    var termYears  = params.termYears  || 35;
    var baseRate   = params.baseRate   || 0.005; // 0.5%（変動金利基準）

    var offsets    = [-0.005, 0, 0.005, 0.010, 0.015];
    var labels     = ['金利-0.5%', '現在金利', '金利+0.5%', '金利+1.0%', '金利+1.5%'];
    var scenarios  = offsets.map(function (offset, i) {
      var rate   = Math.max(0.001, baseRate + offset);
      var result = calculateMortgage({ loanAmount: loanAmount, interestRate: rate, termYears: termYears });
      return {
        name:               labels[i],
        label:              labels[i],
        rate:               Math.round(rate * 1000) / 10,  // %表示
        rateDecimal:        rate,
        monthlyPayment:     result.monthlyPayment,
        totalPayment:       result.totalPayment,
        totalInterest:      result.totalInterest,
        differenceFromBase: 0
      };
    });

    var base = scenarios[1];
    scenarios.forEach(function (s) {
      s.differenceFromBase = s.totalPayment - base.totalPayment;
    });

    var maxImpact = scenarios[scenarios.length - 1].differenceFromBase;

    var riskAssessment = '【金利上昇リスク評価】\n'
      + '現在の変動金利水準（' + (baseRate * 100).toFixed(2) + '%）から1.5%上昇した場合、\n'
      + '総返済額は約' + toManEn(maxImpact) + '増加（月次' + toEn(scenarios[scenarios.length - 1].monthlyPayment - base.monthlyPayment) + '増）します。\n'
      + '日本銀行の金融政策正常化により、今後5〜10年で金利が上昇する可能性は否定できません。\n'
      + '変動金利を選択する場合は、金利が1〜2%上昇した水準でも返済可能かどうかを必ず試算してください。';

    var recommendation;
    if (baseRate <= 0.005) {
      recommendation = '【固定 vs 変動の選択】\n'
        + '現在の変動金利は歴史的低水準にあります。固定金利への切替コストと金利上昇リスクを比較し、\n'
        + '返済総額の安心感を重視するなら「10年固定」または「全期間固定」を、\n'
        + '当面の返済負担軽減を優先するなら「変動金利」を選択するのが一般的です。\n'
        + '借入額が大きいほど固定金利のリスクヘッジ効果が高くなります。\n'
        + '繰り上げ返済を積極的に活用する場合は変動金利も有効な選択肢です。';
    } else {
      recommendation = '【固定 vs 変動の選択】\n'
        + '金利水準が上昇傾向にある局面では、固定金利による返済計画の安定化が有効です。\n'
        + '10年固定後に変動へ切り替える「ミックス戦略」も検討価値があります。\n'
        + 'ライフプランの安定性を最優先とするなら、全期間固定金利をお勧めします。';
    }

    return {
      scenarios:       scenarios,
      riskAssessment:  riskAssessment,
      recommendation:  recommendation
    };
  }

  // ---------------------------------------------------------------------------
  // 8. 資産形成シミュレーション
  // ---------------------------------------------------------------------------

  /**
   * 資産形成・老後資産シミュレーション
   */
  function projectAssetFormation(params) {
    var currentAge             = params.currentAge             || 35;
    var retirementAge          = params.retirementAge          || 65;
    var currentSavings         = params.currentSavings  || params.initialAssets    || 5000000;
    var monthlySavings         = params.monthlySavings  || params.monthlyInvestment || 50000;
    var propertyValue          = params.propertyValue          || 40000000;
    var loanBalance            = params.loanBalance            || 35000000;
    var annualPropertyAppreciation = params.annualPropertyAppreciation || -0.01;
    var investmentReturn       = params.investmentReturnRate || params.annualReturnRate || 0.03;
    var inflationRate          = params.inflationRate          || 0.01;
    var simYears               = params.years                  || 0;

    var yearsToRetirement = simYears > 0 ? simYears : (retirementAge - currentAge);
    if (simYears > 0) retirementAge = currentAge + simYears;
    var yearlyProjection  = [];

    var financialAssets   = currentSavings;
    var currentProperty   = propertyValue;
    var currentLoan       = loanBalance;

    // ライフイベントの定義（年齢ベース）
    var lifeEvents = {
      40: '子どもの教育費増加期',
      45: '住宅ローン残り20年',
      50: '子どもの大学・独立期',
      55: '老後資産形成ラストスパート',
      60: '早期退職・定年準備',
      65: '定年退職・年金受給開始',
      70: '退職後の安定生活期'
    };

    // simYears 指定時は指定年数のみ、退職プランニング時は退職後10年まで
    var maxLoopYears = simYears > 0 ? simYears : Math.max(yearsToRetirement + 10, 30);

    for (var y = 1; y <= maxLoopYears; y++) {
      var age = currentAge + y;

      // 金融資産：複利運用＋月次積立
      financialAssets = financialAssets * (1 + investmentReturn) + monthlySavings * 12;

      // ローン残債の減少（簡略化：線形に残35年で完済）
      if (currentLoan > 0) {
        var annualPrincipalPaydown = loanBalance / 35; // 簡略化
        currentLoan = Math.max(0, currentLoan - annualPrincipalPaydown);
      }

      // 不動産価値の推移
      currentProperty *= (1 + annualPropertyAppreciation);

      var netWorth = financialAssets + currentProperty - currentLoan;
      var event    = lifeEvents[age] || '';

      yearlyProjection.push({
        age:             age,
        financialAssets: Math.round(financialAssets),
        propertyValue:   Math.round(currentProperty),
        loanBalance:     Math.round(currentLoan),
        netWorth:        Math.round(netWorth),
        event:           event
      });

      if (simYears <= 0 && age >= retirementAge + 10) break;
    }

    var retirementIdx    = yearlyProjection.findIndex(function (p) { return p.age >= retirementAge; });
    var retirementData   = retirementIdx >= 0 ? yearlyProjection[retirementIdx] : yearlyProjection[yearlyProjection.length - 1];
    var retirementNetWorth = retirementData.netWorth;

    // 老後月次生活費の推算（4%ルールの変形）
    var retirementMonthlyIncome = Math.round(retirementData.financialAssets * 0.04 / 12);

    var assessment;
    if (retirementNetWorth >= 50000000) {
      assessment = '老後の資産形成は非常に順調です。定年時の純資産は約' + toManEn(retirementNetWorth)
        + 'となる見込みで、豊かな老後生活を支える十分な資産基盤が形成できます。';
    } else if (retirementNetWorth >= 30000000) {
      assessment = '老後の資産形成は概ね良好です。定年時の純資産は約' + toManEn(retirementNetWorth)
        + 'となる見込みです。年金と組み合わせることで安定した老後生活が期待できます。';
    } else if (retirementNetWorth >= 10000000) {
      assessment = '老後の資産形成は最低限の水準を確保できる見通しです。定年時の純資産は約' + toManEn(retirementNetWorth)
        + 'ですが、月々の積立額を増やし、資産形成をより積極的に進めることをお勧めします。';
    } else {
      assessment = '老後の資産形成に不安がある状態です。定年時の純資産は約' + toManEn(retirementNetWorth)
        + 'となる見込みで、老後の生活水準の維持に課題があります。今すぐ抜本的な見直しが必要です。';
    }

    var recommendations = [
      'iDeCo（個人型確定拠出年金）を最大拠出することで、節税しながら老後資産を形成できます。',
      'NISA（少額投資非課税制度）の年間投資枠を活用し、長期・分散投資を続けてください。',
      '住宅ローンの繰り上げ返済と投資のバランスを取り、金利差を意識した資産配分を行いましょう。',
      '50代以降は株式比率を下げ、債券・REITを組み合わせたリスク管理型のポートフォリオに移行することを検討してください。'
    ];

    return {
      yearlyProjection:       yearlyProjection,
      retirementNetWorth:     retirementNetWorth,
      retirementMonthlyIncome: retirementMonthlyIncome,
      assessment:             assessment,
      recommendations:        recommendations
    };
  }

  // ---------------------------------------------------------------------------
  // 9. 年収別住宅費用ガイドライン
  // ---------------------------------------------------------------------------

  /**
   * 年収別の住宅費用ガイドライン（日本市場標準）
   * @param {number} annualIncome 年収（円）
   */
  function getHousingCostGuideline(annualIncome) {
    var income10k = annualIncome / 10000; // 万円単位

    var bracket, rentRange, mortgageRange, maxRatio, safeRatio, idealRatio, notes;

    if (income10k < 300) {
      bracket      = '年収300万円未満';
      rentRange     = { min: 45000, max: 60000 };
      mortgageRange = { min: 45000, max: 60000 };
      maxRatio      = 25;
      safeRatio     = 20;
      idealRatio    = 18;
      notes         = '収入に対して住宅費の割合が高くなりやすい層です。公営住宅・UR賃貸も選択肢として検討し、無理のない範囲での住まい選びが重要です。';
    } else if (income10k < 400) {
      bracket       = '年収300〜400万円';
      rentRange     = { min: 60000, max: 80000 };
      mortgageRange = { min: 60000, max: 80000 };
      maxRatio      = 28;
      safeRatio     = 22;
      idealRatio    = 20;
      notes         = '住宅費は月6〜8万円が目安です。頭金の積み立てを進め、将来の住宅取得に備えましょう。フラット35の活用も検討価値があります。';
    } else if (income10k < 500) {
      bracket       = '年収400〜500万円';
      rentRange     = { min: 80000, max: 100000 };
      mortgageRange = { min: 70000, max: 90000 };
      maxRatio      = 30;
      safeRatio     = 25;
      idealRatio    = 22;
      notes         = '一般的なサラリーマン世帯の標準的な収入層です。3,000〜3,500万円程度の住宅取得が現実的な選択肢になります。';
    } else if (income10k < 700) {
      bracket       = '年収500〜700万円';
      rentRange     = { min: 100000, max: 130000 };
      mortgageRange = { min: 90000, max: 120000 };
      maxRatio      = 33;
      safeRatio     = 27;
      idealRatio    = 23;
      notes         = '住宅取得の選択肢が広がる層です。3,500〜5,000万円程度の住宅を無理なく検討できます。繰り上げ返済を活用した効率的な返済計画を立てましょう。';
    } else if (income10k < 1000) {
      bracket       = '年収700〜1,000万円';
      rentRange     = { min: 130000, max: 180000 };
      mortgageRange = { min: 120000, max: 160000 };
      maxRatio      = 35;
      safeRatio     = 28;
      idealRatio    = 25;
      notes         = '比較的余裕のある住宅取得が可能な層です。5,000〜7,000万円の物件も検討範囲に入ります。資産形成との両立を意識した計画が重要です。';
    } else {
      bracket       = '年収1,000万円以上';
      rentRange     = { min: 180000, max: 300000 };
      mortgageRange = { min: 160000, max: 280000 };
      maxRatio      = 35;
      safeRatio     = 28;
      idealRatio    = 25;
      notes         = '高収入層でも返済比率の管理は重要です。タワーマンションや注文住宅など選択肢が広がりますが、教育費・老後資産とのバランスを取った計画をお勧めします。';
    }

    return {
      incomeBracket:      bracket,
      recommendedRent:    rentRange,
      recommendedMortgage: mortgageRange,
      maxRatio:           maxRatio,
      safeRatio:          safeRatio,
      idealRatio:         idealRatio,
      notes:              notes
    };
  }

  // ---------------------------------------------------------------------------
  // 10. 新築 vs 中古 比較
  // ---------------------------------------------------------------------------

  /**
   * 新築 vs 中古マンション・戸建て比較
   */
  function compareNewVsUsed(params) {
    var budget      = params.budget     || 40000000;
    var area        = params.area       || 'suburban'; // 'urban' | 'suburban' | 'rural'
    var familySize  = params.familySize || 3;

    var newBudgetNote  = budget >= 50000000 ? '予算範囲内' : '予算オーバーの可能性あり（エリアによる）';
    var usedBudgetNote = budget >= 30000000 ? '予算範囲内で選択肢多数' : '予算範囲内';

    var comparison = [
      {
        item:        '価格',
        newProperty: budget < 50000000 ? '割高になりやすい（' + newBudgetNote + '）' : '選択肢あり',
        usedProperty: '同条件で15〜30%程度割安',
        advantage:   'used'
      },
      {
        item:        '広さ・間取り',
        newProperty: '最新の効率的な間取り設計',
        usedProperty: '同予算でより広い物件が見つかりやすい',
        advantage:   'used'
      },
      {
        item:        '設備・仕様',
        newProperty: '最新設備・スマートホーム対応',
        usedProperty: '古い設備（リノベーションで改善可能）',
        advantage:   'new'
      },
      {
        item:        '耐震性',
        newProperty: '2000年基準（最新耐震）適合',
        usedProperty: '1981年以降は新耐震基準、2000年以降はさらに強化',
        advantage:   'new'
      },
      {
        item:        '修繕費・メンテナンス',
        newProperty: '当面の大規模修繕費用が少ない',
        usedProperty: '築年数に応じた修繕費用に注意',
        advantage:   'new'
      },
      {
        item:        '住宅ローン控除',
        newProperty: '借入限度額4,500万円（認定住宅）・13年間',
        usedProperty: '借入限度額2,000万円・10年間',
        advantage:   'new'
      },
      {
        item:        '資産価値の推移',
        newProperty: '購入直後から急速に価値が下落（新築プレミアム消滅）',
        usedProperty: '中古時点での価値がほぼ底値に近く、下落幅が小さい',
        advantage:   'used'
      },
      {
        item:        'すぐ住めるか',
        newProperty: '完成前契約の場合、入居まで待機期間あり',
        usedProperty: '即入居可能なケースが多い',
        advantage:   'used'
      },
      {
        item:        'カスタマイズ性',
        newProperty: '建設中なら間取り変更・仕様選択が可能',
        usedProperty: 'リノベーションで自由度高くカスタマイズ可能',
        advantage:   'equal'
      },
      {
        item:        '仲介手数料',
        newProperty: '不要（デベロッパー直販の場合）',
        usedProperty: '物件価格の約3%+6万円+消費税',
        advantage:   'new'
      }
    ];

    var newCount  = comparison.filter(function (c) { return c.advantage === 'new'; }).length;
    var usedCount = comparison.filter(function (c) { return c.advantage === 'used'; }).length;

    var summary = '比較項目10点のうち、新築が優位な項目は' + newCount + '点、中古が優位な項目は' + usedCount + '点です。\n'
      + '同じ予算であれば「広さ・立地」を優先するなら中古、「最新設備・安心感」を優先するなら新築が適しています。';

    var recommendation;
    if (budget < 35000000) {
      recommendation = '予算を考慮すると、中古物件（築10〜15年）＋リノベーションの組み合わせが最もコストパフォーマンスに優れた選択肢となります。住宅ローン控除の適用条件を確認し、物件を選びましょう。';
    } else if (familySize >= 4) {
      recommendation = '家族構成を考慮すると、同予算で広い面積を確保しやすい中古物件が実用面で有利です。耐震診断・インスペクションを活用し、品質確認の上で購入することをお勧めします。';
    } else {
      recommendation = '予算と家族構成からは、新築・中古どちらも選択肢に入ります。最終的にはエリアの将来性（再開発・利便性向上）と自身のライフプランを重ね合わせて判断することが重要です。';
    }

    return {
      comparison:     comparison,
      summary:        summary,
      recommendation: recommendation
    };
  }

  // ---------------------------------------------------------------------------
  // 11. 総合レポートデータ生成
  // ---------------------------------------------------------------------------

  /**
   * AFPレポート用データをまとめて生成
   * ReportGenerator の各ページが期待するフィールド名に正確にマッピングする
   * @param {object} clientInfo    顧客基本情報
   * @param {object} allAnalysis   各分析結果オブジェクト (state.financialResults)
   */
  function generateReportData(clientInfo, allAnalysis) {
    var info     = clientInfo  || {};
    var analysis = allAnalysis || {};

    var reportDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    /* ---- clientSummary (Page 2) ---- */
    var clientSummary = {
      name:           info.name          || '',
      age:            info.age           || 0,
      familyCompo:    info.familyCompo   || '',
      annualIncome:   info.annualIncome  || 0,
      currentHousing: (info.currentRent && info.currentRent > 0) ? 'rent' : 'own',
      currentRent:    info.currentRent   || 0,
      reportDate:     reportDate,
      advisorName:    info.advisorName   || ''
    };

    /* ---- incomeExpenseSummary (Page 2 & 3) ---- */
    var incomeExpenseSummary = null;
    if (analysis.incomeExpense) {
      var ie = analysis.incomeExpense;

      // expenseBreakdown: 配列→オブジェクトに変換 (ReportGenerator が期待する形式)
      var expObj = {};
      var labelToKey = {
        '住居費': 'housing', '食費': 'food', '交通費': 'transport',
        '保険料': 'insurance', '教育費': 'education', '娯楽費': 'entertainment',
        '貯蓄': 'savings', 'その他': 'other', '水道光熱費': 'other', '通信費': 'other'
      };
      if (ie.expenseBreakdown && Array.isArray(ie.expenseBreakdown)) {
        ie.expenseBreakdown.forEach(function (item) {
          var key = labelToKey[item.label];
          if (key) expObj[key] = (expObj[key] || 0) + item.value;
        });
      }
      if (!expObj.housing && info.currentRent) {
        expObj.housing = info.currentRent;
      }

      incomeExpenseSummary = {
        monthlyGrossIncome: ie.monthlyGrossIncome    || 0,
        monthlyNetIncome:   ie.monthlyNetIncome      || 0,
        monthlyExpense:     ie.monthlyTotalExpense   || 0,
        monthlySurplus:     ie.monthlySurplus        || 0,
        savingsRate:        ie.savingsRate            || 0,
        expenseBreakdown:   expObj,
        commentary:         [ie.diagnosis].concat(ie.recommendations || []).filter(Boolean)
      };
    }

    /* ---- affordabilityResult (Page 2 & 5) ---- */
    var affordabilityResult = null;
    if (analysis.affordability) {
      var af = analysis.affordability;
      affordabilityResult = {
        maxLoanAmount:             af.maxLoanAmount,
        recommendedLoanAmount:     af.recommendedLoanAmount,
        maxMonthlyPayment:         af.maxMonthlyPayment,
        recommendedMonthlyPayment: af.recommendedMonthlyPayment,
        housingCostRatio:          af.housingCostRatio,
        riskLevel:                 af.riskLevel,
        riskLevelJa:               af.riskLevelJa,
        explanation:               af.explanation,
        recommendation:            af.explanation
      };
    }

    /* ---- rentVsBuyResult (Page 5) ---- */
    var rentVsBuyResult = null;
    if (analysis.rentVsBuy) {
      var rvb = analysis.rentVsBuy;
      // 月次ローン支払額・物件価格を再計算
      var rvbPropertyPrice = 40000000;
      var rvbDownPayment   = info.savings ? Math.min(Math.round(info.savings * 0.5), 8000000) : 4000000;
      var rvbLoanAmount    = rvbPropertyPrice - rvbDownPayment;
      var rvbMortgage      = calculateMortgage({ loanAmount: rvbLoanAmount, interestRate: 0.015, termYears: 35 });

      rentVsBuyResult = {
        monthlyRent:        info.currentRent || 80000,
        monthlyLoanPayment: rvbMortgage.monthlyPayment,
        propertyPrice:      rvbPropertyPrice,
        totalRentCost:      rvb.rentTotal,
        totalBuyCost:       rvb.buyTotal,
        breakEvenYear:      rvb.breakEvenYear,
        difference:         rvb.difference,
        recommendation:     rvb.recommendation,
        analysis:           rvb.analysis
      };
    }

    /* ---- assetProjection (Page 4) ---- */
    var assetProjection = null;
    if (analysis.assetProjection) {
      var ap     = analysis.assetProjection;
      var yearly = ap.yearlyProjection || [];
      var apYears = yearly.length || 30;
      var monthlyContrib = 50000;
      var totalContrib   = monthlyContrib * 12 * apYears;
      var finalFinancial = yearly.length > 0 ? (yearly[yearly.length - 1].financialAssets || 0) : 0;

      assetProjection = {
        monthlyContribution: monthlyContrib,
        years:               apYears,
        annualReturnRate:    3,
        finalAmount:         finalFinancial,
        totalContributed:    totalContrib,
        totalGain:           Math.max(0, finalFinancial - totalContrib),
        yearlyProjection:    yearly.map(function (row, i) {
          var yContrib = monthlyContrib * 12 * (i + 1);
          return {
            year:             i + 1,
            totalAssets:      row.financialAssets || row.netWorth || 0,
            totalContributed: yContrib,
            amount:           row.financialAssets || row.netWorth || 0,
            contributed:      yContrib
          };
        })
      };
    }

    /* ---- recommendations (Page 6) ---- */
    var actions = [];
    var priorityIdx = 1;

    if (analysis.incomeExpense && analysis.incomeExpense.recommendations) {
      var ieTitles = ['家計の収支改善', '固定費の見直し', '変動費の最適化'];
      analysis.incomeExpense.recommendations.slice(0, 2).forEach(function (r, i) {
        actions.push({ priority: priorityIdx++, title: ieTitles[i] || ('家計改善 #' + (i + 1)), detail: r });
      });
    }
    if (!actions.length) {
      actions.push({
        priority: priorityIdx++,
        title: '家計の収支改善',
        detail: '月次余剰を増やし、頭金積立を加速させましょう。固定費の見直しが最優先です。'
      });
    }
    actions.push({
      priority: priorityIdx++,
      title: '頭金・緊急資金の確保',
      detail: '頭金（物件価格の10〜20%目安）と半年分の生活費を貯蓄することを目標にしてください。'
    });
    actions.push({
      priority: priorityIdx++,
      title: '住宅ローン事前審査',
      detail: '銀行・フラット35で事前審査を受け、借入可能額を確認しましょう。複数行の比較がお得です。'
    });
    if (analysis.taxBenefits && analysis.taxBenefits.totalBenefit > 0) {
      actions.push({
        priority: priorityIdx++,
        title: '住宅ローン控除の活用',
        detail: '住宅ローン控除により最大約' + toManEn(analysis.taxBenefits.totalBenefit) + 'の税負担軽減が見込まれます。初年度は確定申告が必要です。'
      });
    } else {
      actions.push({
        priority: priorityIdx++,
        title: 'NISA・iDeCoの活用開始',
        detail: '住宅購入後も月3万円以上を非課税口座で積立運用し、老後資産を形成しましょう。'
      });
    }
    actions.push({
      priority: priorityIdx++,
      title: '生命保険・団信の見直し',
      detail: '住宅ローン加入時は団信が付帯します。既存の生命保険との重複を整理し、保険料を最適化しましょう。'
    });

    var summaryText = '';
    if (analysis.affordability) {
      summaryText = analysis.affordability.explanation;
    } else if (analysis.incomeExpense) {
      summaryText = analysis.incomeExpense.diagnosis;
    } else {
      summaryText = '詳細なライフプランニングをご一緒に進めましょう。';
    }

    /* ---- peerComparison (Page 7) ---- */
    var peerComparison = null;
    var familyType = (info.maritalStatus === 'married' || info.children > 0) ? 'family' : 'single';
    var expensesForPeer = info.expenses || {};
    if (!expensesForPeer.food && incomeExpenseSummary && incomeExpenseSummary.expenseBreakdown) {
      expensesForPeer = incomeExpenseSummary.expenseBreakdown;
    }
    if (info.age || info.annualIncome) {
      peerComparison = comparePeerExpenses({
        age: info.age || 35,
        annualIncome: info.annualIncome || 5000000,
        familyType: familyType,
        expenses: expensesForPeer,
        totalSavings: info.savings || 0
      });
    }

    /* ---- insurancePlan (Page 8) ---- */
    var insurancePlan = null;
    var hasInsurance = !!(info.monthlyInsurance && info.monthlyInsurance > 0);
    insurancePlan = generateInsurancePlan({
      hasInsurance: hasInsurance,
      currentInsurance: (info.monthlyInsurance || 0) * 10000,
      familyType: familyType,
      willPurchaseHome: true,
      age: info.age || 35
    });

    /* ---- postInsuranceCashFlow (Page 8) ---- */
    var postInsuranceCashFlow = null;
    var monthlySurplusVal = incomeExpenseSummary ? incomeExpenseSummary.monthlySurplus : 0;
    if (insurancePlan && monthlySurplusVal > 0) {
      postInsuranceCashFlow = calculatePostInsuranceCashFlow({
        monthlySurplus: monthlySurplusVal,
        insurancePlans: insurancePlan.totalEstimatedCost || { min: 12000, max: 18000 }
      });
    }

    /* ---- phaseActionPlan (Page 9) ---- */
    var phaseActionPlan = null;
    var loanAmtForPlan = 35000000;
    var interestRateForPlan = 0.007;
    var termYearsForPlan = 35;
    if (analysis.affordability) {
      loanAmtForPlan = analysis.affordability.recommendedLoanAmount || loanAmtForPlan;
    }
    if (info.loanRate) interestRateForPlan = info.loanRate / 100;
    if (info.loanTerm) termYearsForPlan = info.loanTerm;

    var transactionCostsEst = Math.round(loanAmtForPlan * 0.07);
    phaseActionPlan = generatePhaseActionPlan({
      totalSavings: info.savings || 0,
      transactionCosts: transactionCostsEst,
      insurancePlan: insurancePlan || {},
      loanAmount: loanAmtForPlan,
      interestRate: interestRateForPlan,
      termYears: termYearsForPlan,
      age: info.age || 35,
      monthlyNISA: (info.monthlyInvestment || 3) * 10000
    });

    /* ---- emergencyFund (Page 9) ---- */
    var emergencyFund = null;
    var monthlyExpenseVal = incomeExpenseSummary ? incomeExpenseSummary.monthlyExpense : 250000;
    emergencyFund = calculateEmergencyFundPostPurchase({
      totalSavings: info.savings || 0,
      transactionCosts: transactionCostsEst,
      monthlySurplus: monthlySurplusVal,
      monthlyExpense: monthlyExpenseVal
    });

    return {
      clientSummary:          clientSummary,
      incomeExpenseSummary:   incomeExpenseSummary,
      affordabilityResult:    affordabilityResult,
      rentVsBuyResult:        rentVsBuyResult,
      assetProjection:        assetProjection,
      recommendations:        { actions: actions, summary: summaryText },
      peerComparison:         peerComparison,
      insurancePlan:          insurancePlan,
      postInsuranceCashFlow:  postInsuranceCashFlow,
      phaseActionPlan:        phaseActionPlan,
      emergencyFund:          emergencyFund
    };
  }

  // ---------------------------------------------------------------------------
  // 12. 同世代比較（Peer Comparison）
  // ---------------------------------------------------------------------------

  function comparePeerExpenses(params) {
    var age = params.age || 35;
    var annualIncome = params.annualIncome || 5000000;
    var familyType = params.familyType || 'single';
    var expenses = params.expenses || {};
    var savings = params.totalSavings || 0;

    var peerData;
    if (familyType === 'single') {
      peerData = {
        housing:   { min: 70000, max: 110000, label: '住居費' },
        food:      { min: 40000, max: 60000, label: '食費' },
        utilities: { min: 8000, max: 15000, label: '光熱費' },
        communication: { min: 6000, max: 12000, label: '通信費' },
        transportation: { min: 8000, max: 20000, label: '交通費' },
        clothing:  { min: 10000, max: 25000, label: '被服・美容' },
        entertainment: { min: 15000, max: 30000, label: '娯楽費' },
        insurance: { min: 10000, max: 18000, label: '保険料' },
        investment: { min: 20000, max: 50000, label: '積立投資' }
      };
    } else {
      peerData = {
        housing:   { min: 80000, max: 150000, label: '住居費' },
        food:      { min: 60000, max: 100000, label: '食費' },
        utilities: { min: 15000, max: 25000, label: '光熱費' },
        communication: { min: 10000, max: 18000, label: '通信費' },
        transportation: { min: 10000, max: 25000, label: '交通費' },
        clothing:  { min: 15000, max: 35000, label: '被服・美容' },
        entertainment: { min: 20000, max: 40000, label: '娯楽費' },
        insurance: { min: 15000, max: 30000, label: '保険料' },
        education: { min: 20000, max: 60000, label: '教育費' },
        investment: { min: 15000, max: 40000, label: '積立投資' }
      };
    }

    var savingsPeer;
    if (age < 30) {
      savingsPeer = { average: 1760000, median: 200000 };
    } else if (age < 40) {
      savingsPeer = { average: 4940000, median: 750000 };
    } else if (age < 50) {
      savingsPeer = { average: 6570000, median: 1000000 };
    } else {
      savingsPeer = { average: 9240000, median: 1600000 };
    }
    if (familyType !== 'single') {
      savingsPeer.average = Math.round(savingsPeer.average * 1.2);
      savingsPeer.median = Math.round(savingsPeer.median * 1.5);
    }

    var comparisons = [];
    var keyMap = {
      food: 'food', utilities: 'utilities', communication: 'communication',
      transportation: 'transportation', insurance: 'insurance',
      entertainment: 'entertainment', other: 'other'
    };

    Object.keys(peerData).forEach(function (key) {
      var peer = peerData[key];
      var clientValue = expenses[key] || 0;
      var status, badge;
      if (clientValue === 0 && (key === 'insurance' || key === 'clothing' || key === 'investment')) {
        status = 'warning';
        badge = '要確認';
      } else if (clientValue < peer.min) {
        status = 'safe';
        badge = '節約';
      } else if (clientValue <= peer.max) {
        status = 'safe';
        badge = '適正';
      } else {
        status = 'warning';
        badge = '高め';
      }
      comparisons.push({
        category: peer.label,
        clientValue: clientValue,
        peerMin: peer.min,
        peerMax: peer.max,
        status: status,
        badge: badge
      });
    });

    var savingsPercentile;
    if (savings >= savingsPeer.average) {
      savingsPercentile = '上位25%以内';
    } else if (savings >= savingsPeer.median) {
      savingsPercentile = '中央値以上';
    } else if (savings >= savingsPeer.median * 0.5) {
      savingsPercentile = '中央値付近';
    } else {
      savingsPercentile = '中央値以下';
    }

    return {
      comparisons: comparisons,
      savingsComparison: {
        clientSavings: savings,
        peerAverage: savingsPeer.average,
        peerMedian: savingsPeer.median,
        percentile: savingsPercentile
      },
      source: '総務省家計調査 / 金融広報中央委員会 2022-2023年データ'
    };
  }

  // ---------------------------------------------------------------------------
  // 13. 保険設計プラン（Insurance Planning）
  // ---------------------------------------------------------------------------

  function generateInsurancePlan(params) {
    var hasInsurance = params.hasInsurance || false;
    var currentInsurance = params.currentInsurance || 0;
    var familyType = params.familyType || 'single';
    var willPurchaseHome = params.willPurchaseHome !== false;
    var age = params.age || 35;

    var plans = [];

    if (willPurchaseHome) {
      plans.push({
        type: '死亡・高度障害保障',
        current: hasInsurance ? '加入中' : '未加入',
        postPurchase: '団信で補完（ローン免除）',
        peerCost: '2,000〜5,000円',
        recommendation: '団信のみで十分。別途加入不要',
        priority: 0
      });
    }

    var isFemale30s = age >= 30 && age < 45;

    plans.push({
      type: '就業不能保険',
      subtitle: '長期病欠・障害備え',
      current: hasInsurance ? '加入中' : '未加入',
      postPurchase: hasInsurance ? '継続' : '新規加入が必要',
      peerCost: '3,000〜5,000円',
      recommendation: '月収の60〜70%補償',
      priority: 1,
      estimatedCost: { min: 3000, max: 5000 }
    });

    plans.push({
      type: '医療保険',
      subtitle: '入院・手術保障',
      current: hasInsurance ? '加入中' : '未加入',
      postPurchase: hasInsurance ? '継続' : '新規加入が必要',
      peerCost: '5,000〜8,000円',
      recommendation: '日額5,000〜10,000円',
      priority: 2,
      estimatedCost: { min: 5000, max: 8000 }
    });

    if (isFemale30s || age >= 40) {
      plans.push({
        type: 'がん保険',
        current: hasInsurance ? '加入中' : '未加入',
        postPurchase: hasInsurance ? '継続' : '推奨加入',
        peerCost: '2,000〜4,000円',
        recommendation: '診断一時金100万円以上',
        priority: 3,
        estimatedCost: { min: 2000, max: 4000 }
      });
    }

    var totalMin = 0, totalMax = 0;
    plans.forEach(function (p) {
      if (p.estimatedCost) {
        totalMin += p.estimatedCost.min;
        totalMax += p.estimatedCost.max;
      }
    });

    return {
      plans: plans,
      totalEstimatedCost: { min: totalMin, max: totalMax },
      hasDanShin: willPurchaseHome,
      currentlyInsured: hasInsurance,
      strategyNote: familyType === 'single'
        ? '単身者は就業不能保険を最優先。収入ゼロ＋住居費の直撃を防ぎます。'
        : '家族世帯は死亡保障（団信以外）と就業不能保険のバランスが重要です。'
    };
  }

  // ---------------------------------------------------------------------------
  // 14. 複数プラン比較（Multi-Plan Comparison）
  // ---------------------------------------------------------------------------

  function generateMultiPlanComparison(params) {
    var annualIncome = params.annualIncome || 5000000;
    var interestRate = params.interestRate || 0.007;
    var termYears = params.termYears || 35;
    var recommendedAmount = params.recommendedAmount || 35000000;
    var monthlyRate = interestRate / 12;
    var nper = termYears * 12;

    var stressRate = 0.015;
    var stressMonthly = stressRate / 12;
    var stressNper = termYears * 12;

    var plans = [
      { label: 'A 超安全', amount: Math.round(recommendedAmount * 0.85 / 1000000) * 1000000 },
      { label: 'B 推奨 ★', amount: recommendedAmount, recommended: true },
      { label: 'C 上限',   amount: Math.round(recommendedAmount * 1.06 / 1000000) * 1000000 },
      { label: 'D 危険',   amount: Math.round(recommendedAmount * 1.25 / 1000000) * 1000000 }
    ];

    var monthlyGross = annualIncome / 12;

    return plans.map(function (plan) {
      var monthly = pmt(monthlyRate, nper, plan.amount);
      var ratio = (monthly * 12) / annualIncome * 100;
      var stressMonthlyPmt = pmt(stressMonthly, stressNper, plan.amount);
      var stressRatio = (stressMonthlyPmt * 12) / annualIncome * 100;

      var judgment;
      if (stressRatio <= 25) judgment = 'safe';
      else if (stressRatio <= 28) judgment = 'ok';
      else if (stressRatio <= 32) judgment = 'warning';
      else judgment = 'danger';

      return {
        label: plan.label,
        amount: plan.amount,
        monthlyPayment: Math.round(monthly),
        ratio: Math.round(ratio * 10) / 10,
        stressRatio: Math.round(stressRatio * 10) / 10,
        judgment: judgment,
        recommended: plan.recommended || false
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 15. 保険加入後キャッシュフロー（Post-Insurance Scenarios）
  // ---------------------------------------------------------------------------

  function calculatePostInsuranceCashFlow(params) {
    var monthlySurplus = params.monthlySurplus || 0;
    var insurancePlans = params.insurancePlans || { min: 10000, max: 17000 };

    var scenarios = [
      {
        label: '最小保険プラン',
        insuranceCost: insurancePlans.min,
        surplus: monthlySurplus - insurancePlans.min,
        annualSurplus: (monthlySurplus - insurancePlans.min) * 12
      },
      {
        label: '推奨保険プラン',
        insuranceCost: Math.round((insurancePlans.min + insurancePlans.max) / 2),
        surplus: monthlySurplus - Math.round((insurancePlans.min + insurancePlans.max) / 2),
        annualSurplus: (monthlySurplus - Math.round((insurancePlans.min + insurancePlans.max) / 2)) * 12
      },
      {
        label: '充実保険プラン',
        insuranceCost: insurancePlans.max,
        surplus: monthlySurplus - insurancePlans.max,
        annualSurplus: (monthlySurplus - insurancePlans.max) * 12
      }
    ];

    scenarios.forEach(function (s) {
      s.viable = s.surplus >= 0;
      s.riskLevel = s.surplus >= 10000 ? 'safe' : s.surplus >= 0 ? 'tight' : 'deficit';
    });

    return { scenarios: scenarios };
  }

  // ---------------------------------------------------------------------------
  // 16. 3フェーズ・アクションプラン
  // ---------------------------------------------------------------------------

  function generatePhaseActionPlan(params) {
    var totalSavings = params.totalSavings || 0;
    var transactionCosts = params.transactionCosts || 0;
    var remainingFund = totalSavings - transactionCosts;
    var insurancePlan = params.insurancePlan || {};
    var loanAmount = params.loanAmount || 35000000;
    var interestRate = params.interestRate || 0.007;
    var termYears = params.termYears || 35;
    var age = params.age || 35;
    var completionAge = age + termYears;
    var monthlyNISA = params.monthlyNISA || 30000;

    var phase1 = {
      title: 'Phase 1: 購入前',
      period: new Date().getFullYear() + '年中',
      actions: []
    };

    if (insurancePlan.totalEstimatedCost) {
      phase1.actions.push('医療保険・就業不能保険への新規加入（合計月' +
        Math.round(insurancePlan.totalEstimatedCost.min / 1000) + ',000〜' +
        Math.round(insurancePlan.totalEstimatedCost.max / 1000) + ',000円）');
    }
    phase1.actions.push('物件選定: ' + toManEn(loanAmount) + '以内の条件で絞り込み');
    phase1.actions.push('住宅ローン事前審査 — 複数行比較で最有利条件を確保');
    phase1.actions.push('諸費用（約' + toManEn(transactionCosts) + '）の資金計画確認');

    var phase2 = {
      title: 'Phase 2: 購入直後',
      period: '1年以内',
      actions: [
        '初年度確定申告で住宅ローン控除申請（2年目以降は年末調整）',
        '団信の保障内容を確認・記録',
        'NISA月' + Math.round(monthlyNISA / 10000) + '万円を継続',
        '緊急予備資金' + toManEn(Math.max(0, remainingFund)) + 'を保全'
      ]
    };

    var phase3 = {
      title: 'Phase 3: 中長期',
      period: '〜10年',
      actions: [
        '高収入期間中は繰上返済を検討（NISA優先）',
        '残債減少時に固定金利への借換検討',
        '5年ごとに収支見直し',
        completionAge + '歳ローン完済後の生活費計画策定'
      ]
    };

    return { phases: [phase1, phase2, phase3] };
  }

  // ---------------------------------------------------------------------------
  // 17. 購入後緊急予備資金計算
  // ---------------------------------------------------------------------------

  function calculateEmergencyFundPostPurchase(params) {
    var totalSavings = params.totalSavings || 0;
    var transactionCosts = params.transactionCosts || 0;
    var monthlySurplus = params.monthlySurplus || 0;
    var monthlyExpense = params.monthlyExpense || 250000;

    var remaining = totalSavings - transactionCosts;
    var monthsCovered = monthlyExpense > 0 ? Math.round(remaining / monthlyExpense * 10) / 10 : 0;
    var targetFund = monthlyExpense * 6;
    var shortfall = Math.max(0, targetFund - remaining);
    var monthsToTarget = monthlySurplus > 0 ? Math.ceil(shortfall / monthlySurplus) : 999;

    var riskLevel;
    if (monthsCovered >= 6) riskLevel = 'safe';
    else if (monthsCovered >= 3) riskLevel = 'moderate';
    else riskLevel = 'risky';

    return {
      totalSavings: totalSavings,
      transactionCosts: transactionCosts,
      remainingFund: remaining,
      monthsCovered: monthsCovered,
      targetFund: targetFund,
      shortfall: shortfall,
      monthsToTarget: monthsToTarget,
      riskLevel: riskLevel
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    calculateMortgage:              calculateMortgage,
    analyzeIncomeExpense:           analyzeIncomeExpense,
    calculateAffordability:         calculateAffordability,
    compareRentVsBuy:               compareRentVsBuy,
    compareInsurance:               compareInsurance,
    calculateTaxBenefits:           calculateTaxBenefits,
    analyzeInterestRateImpact:      analyzeInterestRateImpact,
    projectAssetFormation:          projectAssetFormation,
    getHousingCostGuideline:        getHousingCostGuideline,
    compareNewVsUsed:               compareNewVsUsed,
    generateReportData:             generateReportData,
    comparePeerExpenses:            comparePeerExpenses,
    generateInsurancePlan:          generateInsurancePlan,
    generateMultiPlanComparison:    generateMultiPlanComparison,
    calculatePostInsuranceCashFlow: calculatePostInsuranceCashFlow,
    generatePhaseActionPlan:        generatePhaseActionPlan,
    calculateEmergencyFundPostPurchase: calculateEmergencyFundPostPurchase
  };

}());

// CommonJS / Node.js サポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinancialEngine;
}
