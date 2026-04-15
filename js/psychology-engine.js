/**
 * PsychologyEngine - 行動心理学・パーソナリティ分析エンジン
 * LIFE DESIGN PARTNER - 不動産ライフプランニングシステム
 *
 * 【重要】本モジュールは営業担当者の内部利用専用です。
 * クライアントへの直接開示・報告書への記載は禁止されています。
 *
 * 目的: クライアントの性格特性・意思決定スタイル・リスク許容度・
 *       価値観を分析し、最適な営業アプローチを提案します。
 */

var PsychologyEngine = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // アセスメント質問定義
  // ---------------------------------------------------------------------------

  var QUESTIONS = [
    // ---- カテゴリ1: 意思決定スタイル (5問) ----
    {
      id: 'dm1',
      category: 'decision_making',
      text: '大きな買い物をする際、あなたはどのように判断しますか？',
      options: [
        { value: 1, text: '直感を信じてすぐに決める' },
        { value: 2, text: '信頼できる人に相談してから決める' },
        { value: 3, text: 'メリット・デメリットをリスト化して比較する' },
        { value: 4, text: '十分な情報収集をして時間をかけて決める' },
        { value: 5, text: 'できるだけ先延ばしにする' }
      ]
    },
    {
      id: 'dm2',
      category: 'decision_making',
      text: '複数の情報源で意見が食い違う場合、どう対処しますか？',
      options: [
        { value: 1, text: '自分が最初に良いと思った情報を優先する' },
        { value: 2, text: '信頼できる専門家や知人の意見を重視する' },
        { value: 3, text: '複数の情報を比較検討して自分で判断する' },
        { value: 4, text: 'さらに多くの情報を集めて客観的に評価する' },
        { value: 5, text: '決めることが難しくなり迷い続ける' }
      ]
    },
    {
      id: 'dm3',
      category: 'decision_making',
      text: '「今決めないと機会を失う」と言われたとき、どう感じますか？',
      options: [
        { value: 1, text: 'すぐに決断できる。チャンスを逃したくない' },
        { value: 2, text: '焦りを感じるが、誰かに相談してから決める' },
        { value: 3, text: '重要な情報だけ確認して判断する' },
        { value: 4, text: '急かされると逆に慎重になってしまう' },
        { value: 5, text: 'プレッシャーで決断できなくなる' }
      ]
    },
    {
      id: 'dm4',
      category: 'decision_making',
      text: '過去に重要な決断をした後、後悔することはありますか？',
      options: [
        { value: 1, text: 'ほとんどない。決めたことに後悔しない性格だ' },
        { value: 2, text: 'あまりないが、他者の反応が気になることはある' },
        { value: 3, text: '時々ある。より良い選択肢があったかもと考える' },
        { value: 4, text: 'よくある。もっと調べてから決めればよかったと思う' },
        { value: 5, text: 'いつも後悔する。決断自体が苦手だ' }
      ]
    },
    {
      id: 'dm5',
      category: 'decision_making',
      text: '新しい商品やサービスを検討するとき、最初にどうしますか？',
      options: [
        { value: 1, text: '感覚で良さそうだと思ったらすぐ試す' },
        { value: 2, text: '使っている知人や口コミを確認する' },
        { value: 3, text: '主要なスペックや価格を比較する' },
        { value: 4, text: '徹底的に調べてから最善のものを選ぶ' },
        { value: 5, text: '必要性を再考して、できれば保留にする' }
      ]
    },

    // ---- カテゴリ2: リスク許容度 (5問) ----
    {
      id: 'rt1',
      category: 'risk_tolerance',
      text: '余剰資金100万円の運用方法として、あなたに最も近いのはどれですか？',
      options: [
        { value: 1, text: '元本保証の定期預金や国債で確実に守る' },
        { value: 2, text: '低リスクの投資信託でゆっくり増やす' },
        { value: 3, text: '株式と債券を組み合わせてバランス運用する' },
        { value: 4, text: '成長株や不動産投資などで積極的に増やす' },
        { value: 5, text: '高リターンを狙い、リスクを取って投資する' }
      ]
    },
    {
      id: 'rt2',
      category: 'risk_tolerance',
      text: '投資した資産が一時的に20%下落したとき、どうしますか？',
      options: [
        { value: 1, text: '不安で夜も眠れない。すぐに売却して損失を確定する' },
        { value: 2, text: 'とても心配。専門家に相談して対処法を考える' },
        { value: 3, text: '不安だが、長期的に回復すると信じて保有を続ける' },
        { value: 4, text: '買い増しの機会と捉え、追加投資を検討する' },
        { value: 5, text: '想定内。短期の変動は気にしない' }
      ]
    },
    {
      id: 'rt3',
      category: 'risk_tolerance',
      text: '住宅ローンを組む場合、月々の返済額についてどう考えますか？',
      options: [
        { value: 1, text: '万が一に備えて収入の15%以内に抑えたい' },
        { value: 2, text: 'ゆとりを持って、収入の20〜25%程度が安心' },
        { value: 3, text: '計算上返せるなら、収入の30%程度まで許容できる' },
        { value: 4, text: '将来収入が増えると見込んで、多少無理しても構わない' },
        { value: 5, text: '今の生活の質を維持できるなら、限界近くまで借りたい' }
      ]
    },
    {
      id: 'rt4',
      category: 'risk_tolerance',
      text: '保険への加入スタンスとして、最も近いものはどれですか？',
      options: [
        { value: 1, text: '万一に備えて手厚い保障を重視する' },
        { value: 2, text: '必要な保障は確保しつつ、保険料は抑えたい' },
        { value: 3, text: '保険よりも貯蓄で対応できると考えている' },
        { value: 4, text: '保険は最小限。大きなリスクのみカバーすればよい' },
        { value: 5, text: '保険はほぼ不要。自己管理で対応できる' }
      ]
    },
    {
      id: 'rt5',
      category: 'risk_tolerance',
      text: '将来の不確実性（収入変動、健康リスク等）についてどう感じますか？',
      options: [
        { value: 1, text: '非常に不安。できるだけ備えておきたい' },
        { value: 2, text: '心配だが、ある程度は仕方ないと思っている' },
        { value: 3, text: '人生にはリスクがつきもの。バランスよく対応する' },
        { value: 4, text: 'あまり気にしない。何とかなると楽観的に考える' },
        { value: 5, text: 'ほとんど不安を感じない。柔軟に対応できる自信がある' }
      ]
    },

    // ---- カテゴリ3: 価値観・優先順位 (5問) ----
    {
      id: 'vp1',
      category: 'values_priorities',
      text: '理想の生活スタイルについて、最も大切にしていることは何ですか？',
      options: [
        { value: 1, text: '安定した収入と老後の安心感' },
        { value: 2, text: '家族との時間と絆を大切にする生活' },
        { value: 3, text: '仕事でのやりがいと社会的な成功' },
        { value: 4, text: '趣味や旅行など豊かな体験と自己成長' },
        { value: 5, text: '地域とのつながりと社会貢献' }
      ]
    },
    {
      id: 'vp2',
      category: 'values_priorities',
      text: '同じ金額なら、どちらにお金を使いたいですか？',
      options: [
        { value: 1, text: '長く使える質の高いモノ（家具・車・家など）' },
        { value: 2, text: '家族との旅行や思い出になる体験' },
        { value: 3, text: 'スキルアップのための学びや資格取得' },
        { value: 4, text: '友人・知人との交流や会食' },
        { value: 5, text: '将来のための貯蓄・資産形成' }
      ]
    },
    {
      id: 'vp3',
      category: 'values_priorities',
      text: '住まいに求める最も大切な条件は何ですか？',
      options: [
        { value: 1, text: '家族全員が快適に過ごせる広さと機能性' },
        { value: 2, text: '職場や学校への利便性' },
        { value: 3, text: 'デザインやステータスとしての価値' },
        { value: 4, text: '自然環境や静かな生活環境' },
        { value: 5, text: '地域コミュニティや近隣との関係' }
      ]
    },
    {
      id: 'vp4',
      category: 'values_priorities',
      text: '今の快適な生活と将来の安心、どちらを優先しますか？',
      options: [
        { value: 1, text: '将来の安心を最優先。今は我慢できる' },
        { value: 2, text: 'どちらかといえば将来を重視するが、今も大切にする' },
        { value: 3, text: 'バランスが大切。両方を同等に考える' },
        { value: 4, text: 'どちらかといえば今の生活の質を大切にする' },
        { value: 5, text: '今を精いっぱい生きる。将来は将来で考える' }
      ]
    },
    {
      id: 'vp5',
      category: 'values_priorities',
      text: '地域や近所とのつながりについて、どう思いますか？',
      options: [
        { value: 1, text: 'とても大切。地域の行事や活動に積極的に参加したい' },
        { value: 2, text: 'ある程度はつながりたい。困ったときに助け合える関係が理想' },
        { value: 3, text: '普通。挨拶程度の関係で十分' },
        { value: 4, text: 'あまり必要ない。プライバシーを大切にしたい' },
        { value: 5, text: '不要。近隣との関係は最小限で構わない' }
      ]
    }
  ];

  // ---------------------------------------------------------------------------
  // スコア計算
  // ---------------------------------------------------------------------------

  /**
   * 6次元スコア計算 (0〜100スケール)
   * @param {Object} answers - { dm1: value, dm2: value, ... }
   * @returns {Object} scores
   */
  function calculateScores(answers) {
    var a = answers || {};

    // ---- 分析型スコア: 情報収集・論理的判断の傾向 ----
    // dm1(3,4=高), dm2(3,4=高), dm5(3,4=高)
    var analyticalRaw =
      _mapValue(a.dm1, { 1: 10, 2: 30, 3: 80, 4: 95, 5: 20 }) +
      _mapValue(a.dm2, { 1: 10, 2: 30, 3: 75, 4: 95, 5: 20 }) +
      _mapValue(a.dm5, { 1: 10, 2: 35, 3: 70, 4: 95, 5: 20 });
    var analytical = Math.round(analyticalRaw / 3);

    // ---- 感情型スコア: 直感・感情による意思決定 ----
    // dm1(1=高), dm4(後悔傾向=高感情関与), rt2(1=高), vp2(2=高)
    var emotionalRaw =
      _mapValue(a.dm1, { 1: 90, 2: 70, 3: 40, 4: 25, 5: 50 }) +
      _mapValue(a.dm4, { 1: 20, 2: 45, 3: 65, 4: 80, 5: 90 }) +
      _mapValue(a.rt2, { 1: 90, 2: 70, 3: 40, 4: 25, 5: 10 }) +
      _mapValue(a.vp2, { 1: 50, 2: 85, 3: 40, 4: 60, 5: 30 });
    var emotional = Math.round(emotionalRaw / 4);

    // ---- 社会型スコア: 他者の意見・評判への依存 ----
    // dm1(2=高), dm2(2=高), rt4(1=高), vp5(1,2=高)
    var socialRaw =
      _mapValue(a.dm1, { 1: 50, 2: 90, 3: 35, 4: 25, 5: 40 }) +
      _mapValue(a.dm2, { 1: 50, 2: 90, 3: 40, 4: 20, 5: 35 }) +
      _mapValue(a.vp5, { 1: 95, 2: 75, 3: 45, 4: 20, 5: 10 }) +
      _mapValue(a.vp3, { 1: 60, 2: 40, 3: 75, 4: 50, 5: 80 });
    var social = Math.round(socialRaw / 4);

    // ---- 実践型スコア: 行動志向・実行力 ----
    // dm1(1=高), dm3(1=高), rt5(4,5=高), vp1(3=高)
    var practicalRaw =
      _mapValue(a.dm1, { 1: 90, 2: 60, 3: 50, 4: 35, 5: 10 }) +
      _mapValue(a.dm3, { 1: 95, 2: 65, 3: 50, 4: 30, 5: 10 }) +
      _mapValue(a.rt5, { 1: 20, 2: 40, 3: 60, 4: 80, 5: 95 }) +
      _mapValue(a.vp4, { 1: 20, 2: 40, 3: 55, 4: 75, 5: 90 });
    var practical = Math.round(practicalRaw / 4);

    // ---- リスク許容度スコア ----
    // rt1〜rt5の平均
    var riskRaw =
      _mapValue(a.rt1, { 1: 10, 2: 30, 3: 55, 4: 75, 5: 95 }) +
      _mapValue(a.rt2, { 1: 10, 2: 30, 3: 55, 4: 80, 5: 95 }) +
      _mapValue(a.rt3, { 1: 15, 2: 35, 3: 55, 4: 75, 5: 90 }) +
      _mapValue(a.rt4, { 1: 10, 2: 35, 3: 60, 4: 80, 5: 95 }) +
      _mapValue(a.rt5, { 1: 10, 2: 30, 3: 55, 4: 75, 5: 95 });
    var riskTolerance = Math.round(riskRaw / 5);

    // ---- 将来志向度スコア ----
    // vp1(1,3=高), vp4(1,2=高), rt1(1,2=将来重視), dm5(4=将来重視)
    var futureRaw =
      _mapValue(a.vp1, { 1: 85, 2: 60, 3: 75, 4: 50, 5: 65 }) +
      _mapValue(a.vp4, { 1: 95, 2: 75, 3: 55, 4: 35, 5: 15 }) +
      _mapValue(a.rt1, { 1: 80, 2: 65, 3: 50, 4: 35, 5: 20 }) +
      _mapValue(a.dm5, { 1: 20, 2: 35, 3: 55, 4: 85, 5: 40 });
    var futureOrientation = Math.round(futureRaw / 4);

    return {
      analytical: _clamp(analytical),
      emotional: _clamp(emotional),
      social: _clamp(social),
      practical: _clamp(practical),
      riskTolerance: _clamp(riskTolerance),
      futureOrientation: _clamp(futureOrientation)
    };
  }

  // ---------------------------------------------------------------------------
  // パーソナリティタイプ分類
  // ---------------------------------------------------------------------------

  /**
   * 4タイプ分類
   * @param {Object} scores
   * @returns {Object}
   */
  function classifyType(scores) {
    var s = scores || {};

    // 各タイプの傾向スコアを算出
    var analystScore = (s.analytical * 1.5 + (100 - s.riskTolerance) * 0.8 + s.futureOrientation * 0.7) / 3;
    var dreamerScore = (s.emotional * 1.3 + s.futureOrientation * 1.0 + (100 - s.practical) * 0.7) / 3;
    var pragmatistScore = (s.practical * 1.5 + s.riskTolerance * 0.7 + (100 - s.analytical) * 0.5 + (100 - s.emotional) * 0.3) / 3;
    var socialScore = (s.social * 1.8 + s.emotional * 0.6 + (100 - s.analytical) * 0.6) / 3;

    var scores_map = {
      analyst: analystScore,
      dreamer: dreamerScore,
      pragmatist: pragmatistScore,
      social: socialScore
    };

    var primaryType = _maxKey(scores_map);

    var typeDetails = {
      analyst: {
        primaryTypeJa: '慎重分析型',
        description: 'データと論理を重んじる慎重派です。大きな決断の前には必ず十分な情報収集と分析を行い、リスクを最小化しようとします。感情より理性を優先し、根拠のない説明には納得しません。一度信頼すれば長期的な関係を築ける優良顧客になる可能性が高いです。',
        strengths: [
          '情報の精査能力が高く、正確な判断ができる',
          '一度決断すると迷いが少なく、後から覆すことが少ない',
          '長期的な計画を立てて着実に実行できる',
          'データや実績を重視するため、信頼できる担当者との関係を大切にする'
        ],
        watchPoints: [
          '情報収集に時間がかかりすぎて決断が遅れる傾向がある',
          '完璧主義から来る過度な慎重さが、良いタイミングを逃すことがある',
          '感情的な訴求には響きにくく、論理的根拠がないと動かない',
          '一度不信感を持つと、挽回が難しい'
        ],
        salesApproach: '数字・データ・実績を中心とした論理的な提案を行ってください。感情訴求よりも事実ベースの説明が効果的です。具体的な比較資料やシミュレーション数字を準備し、質問に対して正確な回答を心がけましょう。焦らせずに、十分な検討時間を与えることが信頼構築につながります。'
      },
      dreamer: {
        primaryTypeJa: '理想追求型',
        description: '理想の暮らしへの強いビジョンを持ち、感情と将来への期待で動く夢追い型です。良いと感じたことへの共感力と行動力は高いものの、現実的な制約に直面すると迷いが生じやすいです。感情的なつながりとビジョンの共有が、意思決定の最大の推進力になります。',
        strengths: [
          '理想のライフスタイルへの強いモチベーションがある',
          '感情的に共鳴すると、積極的に前に進む力がある',
          '将来の可能性やメリットを前向きに捉えられる',
          '家族や大切な人との暮らしへの想いが強く、購買動機が明確'
        ],
        watchPoints: [
          '現実的なコストや制約を後回しにしてしまいがち',
          '感情の波によって判断が変わりやすく、ブレが生じることがある',
          '他の選択肢を見せられると迷いが深まることがある',
          'ローンや維持費などの「現実面」の話で気持ちが萎えやすい'
        ],
        salesApproach: 'まず理想のライフスタイルや将来のビジョンについて共感的に聞き出してください。物件のスペックよりも、そこでの生活シーンを具体的にイメージさせる提案が効果的です。現実的な話題（コスト・ローン）は共感関係が十分に築けてから、希望を実現する手段として前向きに伝えましょう。'
      },
      pragmatist: {
        primaryTypeJa: '現実主義型',
        description: '現在の生活の質と実利を最重視する実用主義者です。過度な夢や理想よりも「今、何が実際に役立つか」を基準に判断します。コストパフォーマンスを重視し、無駄を嫌います。具体的なメリットと実現可能性を示せれば、比較的スムーズに意思決定できます。',
        strengths: [
          '現実的な費用対効果の判断ができる',
          '実生活での利便性・機能性を的確に評価できる',
          '感情に流されず、実質的な価値で判断できる',
          '一度「これは使える」と納得すれば、素早く決断できる'
        ],
        watchPoints: [
          '将来の可能性よりも「今必要かどうか」で判断するため、長期的メリットが響きにくい',
          '価格への感度が高く、コストに関する細かい突っ込みが多い',
          '感情的な訴求やブランドイメージでは動かない',
          '「とりあえず様子を見る」という選択を取りやすい'
        ],
        salesApproach: '生活の利便性・コスト削減・実用的なメリットを具体的な数字で提示してください。「月々の家賃より安くなる」「通勤時間が20分短縮できる」などの生活改善効果が効果的です。将来の抽象的な話よりも、今の生活がどう変わるかを中心に提案しましょう。'
      },
      social: {
        primaryTypeJa: '周囲調和型',
        description: '家族・友人・地域といった人とのつながりを最も大切にするタイプです。自分だけでなく周囲の人との関係性の中で意思決定を行います。口コミや信頼できる人の意見に強く影響され、「みんなが良いと言っている」という情報が重要な意思決定因子になります。',
        strengths: [
          '家族全員が納得する形で決断しようとする誠実さがある',
          '信頼関係を大切にするため、良い担当者との出会いで動きやすい',
          '地域への帰属意識が強く、地元での購入動機が明確',
          '周囲への配慮から、近隣関係を重視した堅実な判断ができる'
        ],
        watchPoints: [
          '家族・知人全員の合意が必要なため、意思決定に時間がかかりやすい',
          '誰か一人でも反対すると前に進みにくくなる',
          '担当者への個人的な信頼が揺らぐと、購入意欲も急低下する',
          '「周りの目」を気にしすぎて、本当の希望を後回しにしがち'
        ],
        salesApproach: '家族全員を視野に入れた提案を心がけてください。キーパーソン（決断に影響を与える人）を早期に特定し、その人も巻き込んだ商談設定が重要です。近隣住民の声、口コミ、実績を積極的に活用しましょう。担当者自身の誠実さと人柄が、このタイプには最大の決め手になります。'
      }
    };

    var detail = typeDetails[primaryType] || typeDetails.analyst;

    return {
      primaryType: primaryType,
      primaryTypeJa: detail.primaryTypeJa,
      description: detail.description,
      strengths: detail.strengths,
      watchPoints: detail.watchPoints,
      salesApproach: detail.salesApproach,
      typeScores: {
        analyst: Math.round(analystScore),
        dreamer: Math.round(dreamerScore),
        pragmatist: Math.round(pragmatistScore),
        social: Math.round(socialScore)
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 認知バイアス検出
  // ---------------------------------------------------------------------------

  /**
   * 認知バイアス検出
   * @param {Object} answers
   * @param {Object} clientInfo
   * @returns {Object}
   */
  function detectBiases(answers, clientInfo) {
    var a = answers || {};
    var ci = clientInfo || {};

    // アンカリングバイアス: 最初の情報に引きずられる傾向
    // dm2(1=高), dm1(1=高)
    var anchorScore = _avg([
      _mapValue(a.dm2, { 1: 90, 2: 40, 3: 30, 4: 20, 5: 50 }),
      _mapValue(a.dm1, { 1: 80, 2: 40, 3: 30, 4: 20, 5: 45 })
    ]);
    var anchoringLevel = _scoreToLevel(anchorScore);

    // 現状維持バイアス: 変化を避ける傾向
    // dm1(5=高), dm3(4,5=高), rt3(1,2=高)
    var statusQuoScore = _avg([
      _mapValue(a.dm1, { 1: 20, 2: 40, 3: 30, 4: 35, 5: 90 }),
      _mapValue(a.dm3, { 1: 10, 2: 35, 3: 40, 4: 75, 5: 95 }),
      _mapValue(a.rt3, { 1: 80, 2: 65, 3: 40, 4: 25, 5: 15 })
    ]);
    var statusQuoLevel = _scoreToLevel(statusQuoScore);

    // 損失回避バイアス: 損失を利益より過大評価する
    // rt2(1=高), rt4(1=高), dm4(後悔が多い=高)
    var lossScore = _avg([
      _mapValue(a.rt2, { 1: 95, 2: 70, 3: 45, 4: 20, 5: 10 }),
      _mapValue(a.rt4, { 1: 90, 2: 60, 3: 40, 4: 20, 5: 10 }),
      _mapValue(a.dm4, { 1: 15, 2: 40, 3: 60, 4: 80, 5: 90 })
    ]);
    var lossAversionLevel = _scoreToLevel(lossScore);

    // 確証バイアス: 自分の意見を支持する情報のみ集める
    // dm2(1=高), dm5(1,2=高)
    var confirmScore = _avg([
      _mapValue(a.dm2, { 1: 90, 2: 55, 3: 30, 4: 20, 5: 60 }),
      _mapValue(a.dm5, { 1: 85, 2: 60, 3: 30, 4: 20, 5: 50 })
    ]);
    var confirmationLevel = _scoreToLevel(confirmScore);

    // バンドワゴン効果: 多数派・流行に流される傾向
    // dm2(2=高), vp5(1=高), dm5(2=高)
    var bandwagonScore = _avg([
      _mapValue(a.dm2, { 1: 40, 2: 90, 3: 30, 4: 20, 5: 45 }),
      _mapValue(a.vp5, { 1: 80, 2: 65, 3: 40, 4: 20, 5: 10 }),
      _mapValue(a.dm5, { 1: 40, 2: 85, 3: 35, 4: 20, 5: 45 })
    ]);
    var bandwagonLevel = _scoreToLevel(bandwagonScore);

    return {
      anchoringBias: {
        level: anchoringLevel,
        score: Math.round(anchorScore),
        description: _getBiasDescription('anchoring', anchoringLevel),
        salesNote: anchoringLevel === 'high'
          ? '最初に提示する物件・価格が基準点になります。戦略的に「アンカー」を設定してください。'
          : anchoringLevel === 'medium'
          ? '初回提案の印象が後の判断に影響しやすいです。質の高い物件から見せることをお勧めします。'
          : '複数の選択肢を公平に検討できる方です。バランスの取れた提案が有効です。'
      },
      statusQuoBias: {
        level: statusQuoLevel,
        score: Math.round(statusQuoScore),
        description: _getBiasDescription('statusQuo', statusQuoLevel),
        salesNote: statusQuoLevel === 'high'
          ? '現状を変えることへの抵抗感が強いです。「今のまま」のリスクを具体的に伝え、変化のメリットを段階的に示してください。'
          : statusQuoLevel === 'medium'
          ? '変化への一定の抵抗があります。現状の課題を整理した上で、改善イメージを丁寧に共有しましょう。'
          : '変化に前向きなタイプです。新しい提案を積極的に提示できます。'
      },
      lossAversion: {
        level: lossAversionLevel,
        score: Math.round(lossScore),
        description: _getBiasDescription('lossAversion', lossAversionLevel),
        salesNote: lossAversionLevel === 'high'
          ? '損失・リスクへの感度が非常に高いです。「今買わないことで失うもの」を具体的に伝えると効果的です。保証・アフターサービスの充実を強調してください。'
          : lossAversionLevel === 'medium'
          ? 'リスクに関する情報を丁寧に伝えることで、安心感を提供できます。'
          : 'リスクに対して比較的おおらかなタイプです。メリットの訴求を中心に進められます。'
      },
      confirmationBias: {
        level: confirmationLevel,
        score: Math.round(confirmScore),
        description: _getBiasDescription('confirmation', confirmationLevel),
        salesNote: confirmationLevel === 'high'
          ? 'すでに持っている考えを裏付ける情報を求める傾向があります。クライアントの意見をよく聞き、それを支持する形で情報を提供してください。真っ向からの反論は逆効果になります。'
          : confirmationLevel === 'medium'
          ? 'ある程度先入観はありますが、新情報も受け入れられます。エビデンスベースで丁寧に説明しましょう。'
          : '客観的な情報を受け入れやすいタイプです。多角的な情報提供が効果的です。'
      },
      bandwagonEffect: {
        level: bandwagonLevel,
        score: Math.round(bandwagonScore),
        description: _getBiasDescription('bandwagon', bandwagonLevel),
        salesNote: bandwagonLevel === 'high'
          ? '「人気エリア」「売れ筋」「多くの方が選んでいる」という訴求が有効です。実績・販売数・口コミを積極的に活用してください。'
          : bandwagonLevel === 'medium'
          ? '周囲の動向をある程度参考にするタイプです。地域の購入トレンドや実績を適度に伝えましょう。'
          : '独自の判断を重視するタイプです。他者の意見よりも個別の価値を訴求してください。'
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 不安・懸念分析
  // ---------------------------------------------------------------------------

  /**
   * 不安・懸念分析
   * @param {Object} scores
   * @param {Object} clientInfo
   * @returns {Object}
   */
  function analyzeAnxieties(scores, clientInfo) {
    var s = scores || {};
    var ci = clientInfo || {};
    var age = parseInt(ci.age) || 35;
    var familySize = parseInt(ci.familySize) || 2;
    var income = parseInt(ci.annualIncome) || 500;

    var primaryConcerns = [];
    var hiddenConcerns = [];
    var reassurancePoints = [];
    var avoidTopics = [];

    // リスク許容度が低い場合
    if (s.riskTolerance < 40) {
      primaryConcerns.push({
        concern: 'ローン返済への不安',
        description: '長期的なローン返済への不安が強く、「払い続けられるか」という恐怖心を抱いている可能性が高いです。金利上昇・収入変動・病気などの不測事態を過度に心配している可能性があります。'
      });
      reassurancePoints.push('団信（団体信用生命保険）やローン保証の充実を具体的に説明する');
      reassurancePoints.push('繰り上げ返済の柔軟性や、支払い条件変更の制度を案内する');
    }

    // 高感情型の場合
    if (s.emotional > 65) {
      primaryConcerns.push({
        concern: '「本当にこれで良かったのか」という後悔への恐れ',
        description: '感情型の方は決断後の後悔を強く恐れる傾向があります。「他にもっと良い物件があったのでは？」という不安が、意思決定を遅らせる可能性があります。'
      });
      hiddenConcerns.push({
        concern: '家族・パートナーへの罪悪感',
        description: '「自分の判断で家族に損をさせてしまうのでは」という深層的な心配があり、表面的には「もう少し考えたい」という形で現れることがあります。'
      });
    }

    // 社会型スコアが高い場合
    if (s.social > 65) {
      primaryConcerns.push({
        concern: '周囲からの評価・近隣関係',
        description: '「この場所に住んで恥ずかしくないか」「近所付き合いはうまくいくか」という周囲からの目線や人間関係への不安が意思決定に影響します。'
      });
      hiddenConcerns.push({
        concern: '家族内の意見の不一致',
        description: '表面上は自分で考えているように見えても、実際は家族（特に親世代）の反対意見を気にしている可能性があります。'
      });
      avoidTopics.push('「お一人で決められますか？」という発言（家族の関与を否定する表現）');
    }

    // 将来志向度が低い場合
    if (s.futureOrientation < 40) {
      hiddenConcerns.push({
        concern: '将来への漠然とした不安',
        description: '将来について深く考えることを避けているため、老後・子どもの教育費・介護など長期的な課題に直面すると急に不安になる可能性があります。'
      });
      avoidTopics.push('過度に遠い将来の話（20〜30年後のシミュレーション）を冒頭から詳細に語ること');
    }

    // 年齢による不安
    if (age >= 50) {
      primaryConcerns.push({
        concern: '退職後の返済・老後の生活資金',
        description: 'ローンの完済時期と退職時期のバランスへの不安が高い年代です。「退職後も返済が続く場合の不安」を解消する具体的なプランが必要です。'
      });
      reassurancePoints.push('定年退職後の返済シミュレーションと退職金・年金との兼ね合いを試算して見せる');
    } else if (age <= 30) {
      primaryConcerns.push({
        concern: '収入の不確実性・キャリアへの影響',
        description: '転職・結婚・出産など、ライフイベントが多い時期にローンを組むことへの不安があります。「縛られてしまう感覚」を持つ方も多いです。'
      });
      reassurancePoints.push('売却の選択肢やライフイベントに合わせた住み替えの事例を紹介する');
      avoidTopics.push('「一生もの」「この先ずっと住むことになります」という固定的なフレーム');
    }

    // 家族が多い場合
    if (familySize >= 3) {
      primaryConcerns.push({
        concern: '子どもの教育環境・学区',
        description: '子育て世代にとって、学区・近隣の教育施設・子どもの友達環境は住まい選びの重大な要因です。これに関する懸念が意思決定を遅らせることがあります。'
      });
      reassurancePoints.push('周辺の学校・保育園・公園・医療施設など、子育て関連施設の情報を詳しく提供する');
    }

    // デフォルトの安心ポイント追加
    if (reassurancePoints.length < 3) {
      reassurancePoints.push('担当者として長期的なアフターフォローを約束し、購入後も相談できる関係を示す');
      reassurancePoints.push('過去の成功事例・お客様の声を具体的に共有する');
    }

    if (avoidTopics.length < 2) {
      avoidTopics.push('決断を急かす「今月中が最後のチャンス」「他にも希望者がいる」という表現（信頼を損なうリスク）');
    }

    return {
      primaryConcerns: primaryConcerns.slice(0, 3),
      hiddenConcerns: hiddenConcerns.slice(0, 3),
      reassurancePoints: reassurancePoints.slice(0, 4),
      avoidTopics: avoidTopics.slice(0, 4)
    };
  }

  // ---------------------------------------------------------------------------
  // 営業戦略提案
  // ---------------------------------------------------------------------------

  /**
   * 営業アプローチ提案
   * @param {Object} analysis - { scores, type, biases, anxieties }
   * @returns {Object}
   */
  function getSalesStrategy(analysis) {
    var type = (analysis.type || {}).primaryType || 'analyst';
    var scores = analysis.scores || {};
    var biases = analysis.biases || {};
    var anxieties = analysis.anxieties || {};

    var strategies = {
      analyst: {
        communicationStyle: '論理的・データ重視型コミュニケーション。感情的な表現を避け、具体的な数字・実績・比較データを中心に話を進めてください。質問には正確・誠実に答え、わからないことはその場で調べる誠実さを見せることが重要です。',
        presentationOrder: [
          '①エリアの市場データ・価格推移の説明',
          '②物件の客観的スペック比較（同価格帯との比較）',
          '③ローンシミュレーション・コスト分析',
          '④将来の資産価値・売却事例',
          '⑤生活面のメリット（最後に感情的要素）'
        ],
        keyMessages: [
          '「このエリアの過去5年の地価推移データをご覧ください」',
          '「同価格帯の物件3件と主要スペックを比較した資料をご用意しました」',
          '「10年・20年・30年のローン返済シミュレーションです」',
          '「売却時の参考価格として、近隣の直近取引価格がこちらです」'
        ],
        objectionHandling: [
          '「もっと調べてから」→ 必要な情報を特定して、次回までに用意することを約束する',
          '「他の物件も見たい」→ 比較検討を歓迎し、客観的な比較資料を作成して提供する',
          '「価格が高い」→ 類似物件との価格比較と、この物件ならではの数字的メリットを提示する'
        ],
        closingApproach: 'クロージングは急がず、「情報が揃って判断できる状態」に持っていくことを目標にしてください。判断軸を明確にした上で「この条件が揃えば決めていただけますか？」と確認し、最後の懸念点を潰す形でクロージングします。',
        followUpStrategy: '検討中は週1回程度、新しいデータや情報（類似物件の成約事例、金利動向など）を添えて連絡。「有益な情報提供者」としてのポジションを維持してください。',
        ngActions: [
          '根拠のない断言・楽観的すぎる見通しを述べること',
          '「直感的にいい物件です」「絶対後悔しません」などの感情的な決め文句',
          '競合他社や他物件を根拠なく批判すること',
          '準備不足のまま商談に臨むこと'
        ]
      },
      dreamer: {
        communicationStyle: '共感・ビジョン共有型コミュニケーション。まずクライアントの「理想の暮らし」「夢」を丁寧に聞き出し、その夢を一緒に実現しようとする姿勢を示してください。感情的なつながりを先に築き、その後で現実的な話を進めるのが効果的です。',
        presentationOrder: [
          '①「理想の暮らし」「住まいへの想い」のヒアリング',
          '②物件での生活シーンを具体的にイメージさせる提案',
          '③家族への影響・生活の変化（感情的メリット）',
          '④実現のための具体的プラン（ローン等）',
          '⑤長期的な資産価値・将来の選択肢'
        ],
        keyMessages: [
          '「どんな暮らしをイメージされていますか？休日はどう過ごしたいですか？」',
          '「この部屋での家族の朝食シーンを想像してみてください」',
          '「お子さんがここで育っていく姿が目に浮かびます」',
          '「ご家族のために、最高の選択をしたいというお気持ち、よく伝わります」'
        ],
        objectionHandling: [
          '「もう少し考えたい」→ 何が引っかかっているか感情面から丁寧に聞き出し、共感しながら解決策を探る',
          '「価格が心配」→ 「夢を実現するための投資」として月々のコストに置き換え、生活の豊かさと比較する',
          '「家族と相談したい」→ 家族全員を交えた商談機会を設定し、全員の夢を共有する場を作る'
        ],
        closingApproach: '「これを選んだ自分・家族を想像してください」という感情的なクロージングが有効です。サインの瞬間を「夢への第一歩」として意義付け、迷いを「後悔への恐れ」から「可能性への期待」に転換してください。',
        followUpStrategy: '感情的なつながりを維持することが重要。物件情報だけでなく、「あなたの夢を覚えています」というメッセージを込めた連絡を。写真や生活シーンを想起させるコンテンツが効果的です。',
        ngActions: [
          '冒頭からコスト・ローンの話をすること（夢を萎縮させる）',
          '理想を否定したり現実的すぎる発言をすること',
          '選択肢を多く見せすぎて迷わせること',
          '感情的な反応に対して論理で返すこと'
        ]
      },
      pragmatist: {
        communicationStyle: '実用・効率重視型コミュニケーション。無駄な雑談は省き、実質的なメリットを端的に伝えてください。時間を大切にする方が多いため、要点を絞ったコンパクトな提案が評価されます。「実際に生活がどう変わるか」を中心に話を展開してください。',
        presentationOrder: [
          '①現在の生活における課題・不満のヒアリング',
          '②購入による生活改善の具体的効果（時間・コスト・利便性）',
          '③月々のコスト比較（賃料vs購入コスト）',
          '④物件スペックと実用性の評価',
          '⑤維持費・税金・管理費などの実コスト全体像'
        ],
        keyMessages: [
          '「現在の家賃と比較すると、月々〇万円のコストで所有できます」',
          '「通勤時間が〇分短縮されます。年間で換算すると〇時間です」',
          '「この物件は管理費・修繕積立金込みで月々〇万円の維持コストです」',
          '「実際に住んでいる方の使い勝手を聞いた上でご案内します」'
        ],
        objectionHandling: [
          '「本当に必要か考えたい」→ 現在の生活での具体的な不満・コストを数字で整理し、改善効果を対比する',
          '「もっと安い物件を探したい」→ 価格帯別の実質コスト比較（修繕費・設備維持費込み）を提示する',
          '「今すぐ決める必要はない」→ 市場動向・金利変化など、先延ばしのコストを数字で示す'
        ],
        closingApproach: '「この条件ならコスト的にも理にかなっている」という合理的な判断を引き出すクロージング。「決断しないこともコストである」という視点を、感情なく数字で伝えると効果的です。',
        followUpStrategy: '定期的に簡潔な情報提供（市場動向・金利情報・候補物件の状況）を短いメールやメッセージで送付。長文や感情的な内容は避け、「役に立つ情報提供者」として存在感を示してください。',
        ngActions: [
          '感情的な訴求や「夢の家」「一生もの」という大げさな表現',
          '無駄に長い商談や雑談（時間を無駄にされた感覚を持たせる）',
          '維持費・管理費・固定資産税などの現実コストを隠すこと',
          '「多くの方が選んでいる」という同調圧力的な表現'
        ]
      },
      social: {
        communicationStyle: '信頼関係・共感重視型コミュニケーション。担当者自身の人柄・誠実さ・地域への深い知識が、最大の差別化要因になります。クライアントだけでなく、その家族や周囲の人への配慮も忘れずに。口コミや地域の評判を上手に活用してください。',
        presentationOrder: [
          '①担当者・会社・地域への信頼醸成（自己紹介・実績紹介）',
          '②家族全員の希望・優先事項のヒアリング',
          '③地域コミュニティ・近隣環境の情報提供',
          '④類似顧客の購入事例・成功談の共有',
          '⑤物件スペック・価格の説明'
        ],
        keyMessages: [
          '「この地域に〇年関わってきた私が、本当にお勧めできる物件です」',
          '「ご家族みなさんに喜んでいただける住まいを一緒に探しましょう」',
          '「先月、似たような条件のご家族がここに決められて、とても喜ばれています」',
          '「このエリアの住民会はとても活発で、住み心地がとても良いと評判です」'
        ],
        objectionHandling: [
          '「家族と相談したい」→ 家族全員参加の機会を積極的に設定し、全員の懸念を直接解消する',
          '「知人にも意見を聞きたい」→ 歓迎の姿勢を示し、その知人も安心させられる情報を準備する',
          '「担当者を変えてほしい」（もし発生した場合）→ 最優先で対処し、信頼回復の機会を設ける'
        ],
        closingApproach: 'このタイプは「この人から買いたい」という気持ちが決め手になることが多いです。担当者の誠実な姿勢と地域への愛情を示しながら、「ご家族全員の笑顔が見たい」という気持ちを真摯に伝えてクロージングしてください。',
        followUpStrategy: '定期的な「人間的なつながり」を維持することが重要。地域のイベント情報、近隣の良い変化、季節の挨拶なども交えながら、「地域の頼れるパートナー」としての関係を育ててください。',
        ngActions: [
          '家族を無視した、クライアント個人だけへの過度なアプローチ',
          '担当者が頻繁に変わること（信頼関係が断絶される）',
          '地域コミュニティや近隣住民への否定的なコメント',
          '「他の方には言わないでほしいのですが」という秘密めいた表現（不信感を生む）'
        ]
      }
    };

    return strategies[type] || strategies.analyst;
  }

  // ---------------------------------------------------------------------------
  // ライフステージ分析
  // ---------------------------------------------------------------------------

  /**
   * ライフステージ分析
   * @param {Object} clientInfo
   * @returns {Object}
   */
  function analyzeLifeStage(clientInfo) {
    var ci = clientInfo || {};
    var age = parseInt(ci.age) || 35;
    var maritalStatus = ci.maritalStatus || 'unknown';
    var hasChildren = ci.hasChildren || false;
    var youngestChildAge = parseInt(ci.youngestChildAge) || 0;
    var oldestChildAge = parseInt(ci.oldestChildAge) || 0;

    var stage, stageDescription, housingNeeds, financialPriorities, futureConsiderations;

    if (maritalStatus === 'single' || (maritalStatus === 'unknown' && age < 30)) {
      stage = '独身期';
      stageDescription = '自由度が高く、自己投資やライフスタイル重視の購買傾向があります。将来の変化（結婚・転勤など）を見越した柔軟性がある住まいを求めることが多いです。';
      housingNeeds = [
        '立地・利便性（通勤・娯楽施設へのアクセス）の優先度が高い',
        '一人暮らしに適したコンパクトな間取り',
        '将来の売却・貸し出しを考慮した資産性の高い物件',
        'セキュリティ・防犯設備の充実'
      ];
      financialPriorities = [
        'ローン負担を抑え、自己資金の確保を優先',
        '将来のライフイベントに備えた流動性の維持',
        '投資的視点での資産形成'
      ];
      futureConsiderations = [
        '結婚・パートナーとの同居に伴う住み替えの可能性',
        '転職・転勤リスクへの対応',
        '親の介護が必要になった場合の対応'
      ];
    } else if (!hasChildren && age < 40) {
      stage = '新婚期';
      stageDescription = '新しい家族単位での生活設計を始める重要な時期です。二人の価値観のすり合わせと、将来の子育てを見据えた住まい選びが求められます。';
      housingNeeds = [
        '将来の子育てを考慮した間取りの拡張性',
        '夫婦双方の通勤利便性のバランス',
        '生活動線のゆとりと収納スペース',
        '二人の趣味・生活スタイルが反映できる空間'
      ];
      financialPriorities = [
        '共働き収入を活かしたローン返済計画',
        '出産・育休による収入減を想定した余裕ある返済設計',
        '教育資金の積立開始'
      ];
      futureConsiderations = [
        '子どもが生まれた場合の部屋数・収納の充足性',
        '子育て環境（保育園・学区）の将来的な評価',
        '一方の収入が減少した場合のローン対応策'
      ];
    } else if (hasChildren && youngestChildAge < 6) {
      stage = '子育て初期';
      stageDescription = '子どもの成長に伴い、住まいへの要求が急速に変化する時期です。安全性・教育環境・生活の利便性が最重要視される傾向があります。意思決定に時間的プレッシャーを感じていることも多いです。';
      housingNeeds = [
        '子どもの安全性（事故防止・防犯）への配慮',
        '保育園・幼稚園・小学校への近さ',
        '公園・遊び場など子どもの遊び環境',
        '子ども部屋確保できる十分な居室数',
        '医療機関へのアクセス'
      ];
      financialPriorities = [
        '教育費の急増に備えた家計管理',
        '育児・保育費用とローン返済の両立',
        '将来の教育資金積立の開始または強化'
      ];
      futureConsiderations = [
        '子どもの成長に伴う部屋数・収納の充足性',
        '学区変更リスクと評判の維持',
        '第二子・第三子の可能性を考慮した広さ'
      ];
    } else if (hasChildren && oldestChildAge >= 6 && youngestChildAge < 18) {
      stage = '子育て成長期';
      stageDescription = '子どもの学校・習い事・友人関係が安定し、住まいの安定性が最優先される時期です。住み替えへの抵抗が最も強く、「この家での生活を大切にしたい」という気持ちが強いです。';
      housingNeeds = [
        '子どもの学区・学校環境の継続性',
        '子ども部屋の独立性（プライバシー確保）',
        '家族全員の趣味・活動スペースの充実',
        '近隣の子育て環境・コミュニティの充実'
      ];
      financialPriorities = [
        '教育費のピーク期（塾・習い事・進学）への対応',
        '住宅ローンと教育費の同時負担の管理',
        '大学進学に備えた資金計画'
      ];
      futureConsiderations = [
        '子どもの独立後の生活設計（部屋の使い方の変化）',
        '夫婦二人の老後に向けた資産計画',
        '親の介護問題が顕在化し始める可能性'
      ];
    } else if (hasChildren && oldestChildAge >= 18 && age < 55) {
      stage = '子育て完了期';
      stageDescription = '子どもの巣立ちとともに、住まいの目的が変化する転換期です。老後を見据えたダウンサイジングや住み替えを検討し始める方も多く、新しいライフスタイルへの期待と不安が共存します。';
      housingNeeds = [
        'バリアフリー・将来の介護対応を見越した設計',
        'コンパクト化（部屋数より快適性・利便性）',
        '趣味・セカンドライフのための空間',
        '子ども・孫が帰省できるゲストルームの確保'
      ];
      financialPriorities = [
        '退職後の生活資金と住宅ローン残債の整理',
        '老後の医療・介護費用への備え',
        '相続・資産承継を意識した不動産管理'
      ];
      futureConsiderations = [
        'リタイア後の生活スタイルの変化（旅行・趣味など）',
        '配偶者の健康・要介護リスク',
        '不動産の相続・売却タイミングの検討'
      ];
    } else if (age >= 55 && age < 70) {
      stage = '定年準備期';
      stageDescription = '定年退職を見据えた、人生後半の準備期間です。老後の生活資金・医療費・介護への備えと、「安心して老いられる住まい」への関心が高まります。資産の整理・活用を真剣に検討し始める時期です。';
      housingNeeds = [
        '医療機関・生活施設へのアクセスの良さ',
        'バリアフリー・ユニバーサルデザインの充実',
        '将来の介護・同居を想定した間取り',
        '管理の手間が少ないマンションへの関心増大'
      ];
      financialPriorities = [
        '退職金・年金を活用したローン完済・資産整理',
        '医療・介護費用の長期積立',
        '相続対策と不動産の整理・活用'
      ];
      futureConsiderations = [
        '配偶者との「二人のセカンドライフ」の設計',
        '子ども・孫との程よい距離感の住まい',
        '独り身になった場合の生活継続性'
      ];
    } else {
      stage = 'セカンドライフ期';
      stageDescription = '人生の第二章として、自分らしい豊かな生活を追求する時期です。利便性・安全性・コミュニティとのつながりを重視し、「残された時間を豊かに過ごせる住まい」を求めます。';
      housingNeeds = [
        '身体的な負担が少ないバリアフリー設計',
        '緊急時対応・見守りサービスの充実',
        '近隣・コミュニティとのつながりやすさ',
        '医療・介護施設への近さ'
      ];
      financialPriorities = [
        '資産の整理・有効活用（リバースモーゲージ等）',
        '固定費の削減と生活の安定化',
        '相続・贈与の最終的な整理'
      ];
      futureConsiderations = [
        'サービス付き高齢者向け住宅・シニア向け施設への将来的な移行',
        '身体機能の変化に対応できる住まいの継続性',
        '家族・子どもとの関係性の維持'
      ];
    }

    return {
      stage: stage,
      stageDescription: stageDescription,
      housingNeeds: housingNeeds,
      financialPriorities: financialPriorities,
      futureConsiderations: futureConsiderations
    };
  }

  // ---------------------------------------------------------------------------
  // メイン分析関数
  // ---------------------------------------------------------------------------

  /**
   * 総合分析実行
   * @param {Object} answers - アセスメント回答
   * @param {Object} clientInfo - クライアント基本情報
   * @returns {Object} 総合分析結果
   */
  function runFullAnalysis(answers, clientInfo) {
    var scores = calculateScores(answers);
    var personalityType = classifyType(scores);
    var biases = detectBiases(answers, clientInfo);
    var anxieties = analyzeAnxieties(scores, clientInfo);
    var salesStrategy = getSalesStrategy({
      scores: scores,
      type: personalityType,
      biases: biases,
      anxieties: anxieties
    });
    var lifeStage = analyzeLifeStage(clientInfo);

    return {
      scores: scores,
      personalityType: personalityType,
      biases: biases,
      anxieties: anxieties,
      salesStrategy: salesStrategy,
      lifeStage: lifeStage,
      timestamp: new Date().toISOString(),
      disclaimer: '【注意】本分析は営業担当者の内部参考情報です。クライアントへの直接開示・報告書への記載は行わないでください。'
    };
  }

  // ---------------------------------------------------------------------------
  // ユーティリティ関数
  // ---------------------------------------------------------------------------

  function _mapValue(val, map) {
    var v = parseInt(val);
    if (isNaN(v) || !map[v]) return 50; // デフォルト中間値
    return map[v];
  }

  function _avg(arr) {
    if (!arr || arr.length === 0) return 50;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  function _clamp(val) {
    return Math.max(0, Math.min(100, Math.round(val)));
  }

  function _scoreToLevel(score) {
    if (score >= 65) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  function _maxKey(obj) {
    var maxKey = null;
    var maxVal = -Infinity;
    for (var key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] > maxVal) {
        maxVal = obj[key];
        maxKey = key;
      }
    }
    return maxKey;
  }

  function _getBiasDescription(biasType, level) {
    var descriptions = {
      anchoring: {
        high: 'アンカリングバイアスが強く見られます。最初に提示された価格・情報を基準点として、その後の判断が大きく左右される傾向があります。',
        medium: 'アンカリングバイアスが中程度見られます。初回情報の影響を受けやすいですが、追加情報で柔軟に修正できます。',
        low: 'アンカリングバイアスは低い傾向です。複数の情報を独立して評価できる判断力があります。'
      },
      statusQuo: {
        high: '現状維持バイアスが強く見られます。現在の状況を変えることへの強い抵抗感があり、変化を選択するためには相応の動機付けが必要です。',
        medium: '現状維持バイアスが中程度見られます。変化には一定の動機が必要ですが、メリットが明確であれば動けます。',
        low: '現状維持バイアスは低い傾向です。新しい変化を積極的に受け入れられる柔軟性があります。'
      },
      lossAversion: {
        high: '損失回避バイアスが強く見られます。利益よりも損失への感度が著しく高く、リスクのある提案には強い抵抗を示します。',
        medium: '損失回避バイアスが中程度見られます。リスクを適度に気にしますが、十分な説明で対処できます。',
        low: '損失回避バイアスは低い傾向です。損得に比較的冷静で、リスクと利益を客観的に評価できます。'
      },
      confirmation: {
        high: '確証バイアスが強く見られます。自分の既存の考えを支持する情報を積極的に探し、反対意見を無意識に退ける傾向があります。',
        medium: '確証バイアスが中程度見られます。先入観はありますが、証拠があれば考えを変えられます。',
        low: '確証バイアスは低い傾向です。客観的な情報を公平に評価し、先入観にとらわれにくい柔軟性があります。'
      },
      bandwagon: {
        high: 'バンドワゴン効果が強く見られます。多数の人が選んでいる、人気がある、という情報が意思決定に大きく影響します。',
        medium: 'バンドワゴン効果が中程度見られます。周囲の動向をある程度参考にしますが、独自の判断も持ちます。',
        low: 'バンドワゴン効果は低い傾向です。他者の選択に影響されにくく、独自の価値観で判断します。'
      }
    };
    return (descriptions[biasType] && descriptions[biasType][level]) || '';
  }

  // ---------------------------------------------------------------------------
  // 公開API
  // ---------------------------------------------------------------------------

  return {
    questions: QUESTIONS,
    calculateScores: calculateScores,
    classifyType: classifyType,
    detectBiases: detectBiases,
    analyzeAnxieties: analyzeAnxieties,
    getSalesStrategy: getSalesStrategy,
    analyzeLifeStage: analyzeLifeStage,
    runFullAnalysis: runFullAnalysis
  };

}());
