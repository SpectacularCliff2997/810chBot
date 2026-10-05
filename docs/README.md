# 810ch API Control Panel

`doc.html` に記載されたAPI仕様に基づき、ブラウザGUIから直感的に操作できるシングルページ・コントロールパネルです。
GitHub Pagesでそのまま静的ホスティングして利用可能です。

---

## 🚀 主な機能と特徴

1. **機能美重視・ミニマルなUI設計**
   - 不要な装飾やアニメーションを排し、開発者ツールのように密度と視認性を高めたデザイン。
   - ダーク / ライトモード切り替え対応。

2. **情報量の削減（シングルページを維持した折りたたみ設計）**
   - **タブナビゲーション**: 「板・書き込み」「スレッド管理」「レス操作」「認証キー管理」「コンソール」に必要な機能を集約。
   - **`[?]` ヒントボタン**: 各エンドポイントの仕様・パラメータ・curlサンプルを必要な時だけインライン展開。普段は格納されて視覚ノイズを最小化。
   - **設定ドロワー**: Base URL、Board Slug、APIキー、認証ヘッダー方式、CORSプロキシ設定をヘッダーの「⚙ 設定」内にスマートに格納。

3. **安全設計（確認ガードモーダル）**
   - 破壊的操作（スレッド削除、レスの通常削除/透明削除、スレスト、強制sage、認証キー無効化、キー全書き込み通常削除）には確認モーダルを挟み、誤操作を防止。

4. **cURL 1クリック生成 & コピー**
   - 入力されたパラメータを反映した実行可能な `curl` コマンドをワンクリックでクリップボードにコピー可能。
   - ブラウザのCORS制限を受ける環境でもターミナル等で即座に実行できます。

5. **レートリミット対策 & レスポンスインスペクター**
   - `429 Too Many Requests` 受信時に `Retry-After` を自動解析し、秒数カウントダウンを表示。
   - JSONレスポンスの自動整形、ステータスバッジ、所要時間(ms)の計測、直近の実行ログ履歴を保持。

---

## 🌐 GitHub Pages での公開手順

本リポジトリは GitHub Pages の標準フォルダ構成である `docs/` を採用しています。

1. GitHub リポジトリの **Settings** を開きます。
2. 左メニューの **Pages** を選択します。
3. **Build and deployment** の Source で **Deploy from a branch** を選択します。
4. Branch で `main`（または `master`）を選び、フォルダで **`/docs`** を選択して **Save** をクリックします。
   - （※ルート `/ (root)` を選択した場合でも、ルートの `index.html` から自動的に `docs/` へ遷移します）
5. 数分後に発行されるURL（`https://<username>.github.io/<repo>/`）にアクセスすれば利用可能です。

---

## 🛠️ API仕様の対応状況

| メソッド | パス | 機能 | コントロールパネルでの位置 |
|---|---|---|---|
| GET | `/api/v1/boards/{slug}` | 板情報の取得 | 「板・書き込み」タブ |
| GET | `/api/v1/boards/{slug}/responses` | 板への書き込み一覧 | 「板・書き込み」タブ |
| GET | `/api/v1/boards/{slug}/threads` | スレ一覧 | 「スレッド管理」タブ |
| GET | `/api/v1/boards/{slug}/threads/{thread_key}` | スレ詳細とレス一覧 | 「スレッド管理」タブ |
| POST | `/api/v1/boards/{slug}/threads/{thread_key}/force_sage` | 強制sage有効化 | 「スレッド管理」タブ |
| DELETE | `/api/v1/boards/{slug}/threads/{thread_key}/force_sage` | 強制sage解除 | 「スレッド管理」タブ |
| POST | `/api/v1/boards/{slug}/threads/{thread_key}/threadstop` | スレスト有効化 | 「スレッド管理」タブ |
| DELETE | `/api/v1/boards/{slug}/threads/{thread_key}/threadstop` | スレスト解除 | 「スレッド管理」タブ |
| DELETE | `/api/v1/boards/{slug}/threads/{thread_key}` | スレッド削除 | 「スレッド管理」タブ |
| GET | `/api/v1/boards/{slug}/threads/{thread_key}/responses/{number}` | 単一レスの取得 | 「レス操作」タブ |
| DELETE | `/api/v1/boards/{slug}/threads/{thread_key}/responses/{number}` | レスの透明削除 | 「レス操作」タブ |
| POST | `/api/v1/boards/{slug}/threads/{thread_key}/responses/{number}/aborn` | レスの通常削除 (reason) | 「レス操作」タブ |
| GET | `/api/v1/boards/{slug}/post_keys` | 認証キーの一覧 | 「認証キー管理」タブ |
| GET | `/api/v1/boards/{slug}/post_keys/{public_id}/writings` | キー別書き込み履歴 | 「認証キー管理」タブ |
| DELETE | `/api/v1/boards/{slug}/post_keys/{public_id}` | 認証キーの無効化 | 「認証キー管理」タブ |
| POST | `/api/v1/boards/{slug}/post_keys/{public_id}/aborn_all` | キーの全書き込み通常削除 | 「認証キー管理」タブ |
| ANY | 自由 | 自由実行 | 「コンソール」タブ |
