# CLAUDE.md — LIFE DESIGN PARTNER

> AFP向け住宅購入ライフプランニング支援SaaS。商用利用を前提とした設計・開発ルールを定義する。

---

## プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロダクト | LIFE DESIGN PARTNER（ライフデザイン・パートナー） |
| 対象ユーザー | AFP/FP有資格者・不動産エージェント（TERASS系列） |
| 収益モデル | SaaS月額 or 提案書生成従量課金 |
| 技術スタック | HTML/CSS/JS（フロント）→ Cloudflare Workers + D1（バックエンド予定） |
| ホスティング | Cloudflare Pages（予定） |
| 現状 | ローカル動作するMVP。商用展開フェーズへ移行中 |

---

## Claude Development Rules

### 基本原則
- コミットメッセージは英語（Conventional Commits形式: feat/fix/chore/docs/refactor）
- 破壊的変更の前に必ず確認を取る
- 本番環境への変更は明示的な指示があるまで行わない
- 商用利用を前提とするため、クライアントの個人情報をコードにハードコードしない

### ファイル規則
- 環境変数は `.env.local`（コミット禁止・.gitignoreで管理済み）
- APIキーは Cloudflare Workers Secrets または環境変数で管理
- `proposal-yufu.html` は特定クライアント向けサンプル（本番では動的生成に移行予定）
- 機密情報を絶対にコミットしない

### 計算ルール（財務エンジン）
- 月返済額: PMT = P × r × (1+r)^n / ((1+r)^n - 1)
- 仲介手数料: (物件価格 × 3% + 6万円) × 1.1（消費税込）
- 返済比率: 月返済額 / (年収 / 12)
- NISA将来価値: PMT × ((1.0025)^n - 1) / 0.0025（月利0.25%=年3%）
- 年収設計ベース: 最低ライン（保守的）を常に基準にする

### 開発フロー
1. 変更前に現状を確認・報告
2. 小さな単位でコミット（1コミット1変更）
3. エラーは原因を3段階で分析してから修正
4. 完了後に変更サマリーを日本語で報告

### 商用展開向けルール
- 個人情報（名前・年収・貯蓄額）はテンプレート変数化する（ハードコード禁止）
- 金融計算は `js/financial-engine.js` に集約、UIから分離を維持
- 新機能はフィーチャーブランチ（`feature/xxx`）で開発
- 本番デプロイ前に `wrangler dev` でローカル確認必須（Workers移行後）

---

## アーキテクチャロードマップ（商用化フェーズ）

### Phase 1（現在）: ローカルMVP
- HTML/CSS/JS のみ
- クライアントデータはローカルストレージ
- 提案書は静的HTML

### Phase 2（近期）: Cloudflare Pages デプロイ
- `wrangler pages deploy` でホスティング
- URLを顧客・パートナーと共有可能に
- Google Fontsをセルフホストに切り替え（オフライン対応）

### Phase 3（中期）: Workers + D1 バックエンド
- 複数FPが使える認証付きSaaS
- D1でクライアントデータを永続化
- 提案書を動的生成（テンプレートエンジン）
- PDF生成API（Puppeteer/WeasyPrint）

### Phase 4（長期）: SaaS商品化
- 月額プラン / 提案書従量課金
- 管理ダッシュボード（複数クライアント管理）
- API連携（金利データの自動取得）

---

## 現在のファイル構成

```
LIFE-DESIGN/
├── index.html              # メインアプリ（AFPツール）
├── proposal-yufu.html      # 油布様 提案書（サンプル）
├── css/style.css           # スタイル
├── js/
│   ├── app.js              # UIロジック
│   ├── financial-engine.js # 財務計算エンジン
│   ├── psychology-engine.js# 心理分析エンジン
│   └── report-generator.js # レポート生成
├── assets/                 # 画像・アイコン
├── CLAUDE.md               # このファイル
├── .gitignore
└── .claude/
    └── launch.json         # 開発サーバー設定
```

---

## ブランチ戦略

| ブランチ | 用途 |
|---|---|
| `main` | 安定版・本番相当 |
| `develop` | 統合ブランチ |
| `feature/xxx` | 新機能開発 |
| `claude/xxx` | AI支援作業ブランチ |

---

*Last updated: 2026-04-17 | AFP Koki Takahashi / TERASS*
