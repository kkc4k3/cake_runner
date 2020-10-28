# Cake Runner

自分用タスクランナー（制作中）  
`yarn run cakerun`で動く

## ⚠ 注意

-   `node >= 12.10` を推奨！
-   多分やることないとは思いますが**現状サーバーサイドに node.js が使えない（フロントの js と処理が被る）です**

## 設定ファイル `cake.config.js` の書き方

```javascript cake.config.js
// 値はすべて初期値（のはず）
module.exports = {
    srcDir: "./src", // 作業フォルダ
    distDir: "./dist", // 出力フォルダ
    // css（基本scss前提で書いています）
    scss: {
        src: "./scss", // ベースになるscssファイルのあるフォルダ（src直下の場合は空文字）
        dist: "./css", // 出力ファイルを入れるフォルダ（dist直下の場合は空文字）
        base: "style.scss", // scssのベースファイル
        output: "style.css", // 出力css名
    },
    // js
    // 設定はcssと概ね同じなので割愛
    js: {
        src: "./js",
        dist: "./js",
        base: "index.js",
        output: "main.js",
    },
    // マークアップ関連
    // htmlおよびローカルサーバーが建てられるサーバー言語に対応（現状php以外では未確認ですが……）
    htdocs: {
        // disabled: false, // 無効化することもできるようにするつもりですが未設定です
        mode: "php", // 使用するファイルの拡張子を記入（HTMLならhtml、PHPならphp そのままやね）
        options: {
            proxy: "127.0.0.1:8888", // phpの場合別途サーバーを建てる必要あり、それのアドレスを記入
            server: "./dist", // htmlの場合indexファイルのあるフォルダを指定
        },
    },
}
```

### PHP を Sync させる場合

#### 1. 別でサーバーを建てる

`php -S 127.0.0.1:8888` とか……  
 MAMP とか XAMPP もいける  
 試してない（というか僕が知識ない）けどローカル立つなら多分 rb とかもいける  
 上の注意点にも書いてますが現状 node.js はダメです、多分フロント処理とかぶってひどいことになります（issue）

#### 2. `cake.config.js` ファイルに以下を記述

```javascript cake.config.js
    htdocs: {
        // 中略
        options: {
            proxy: "建てたサーバーのアドレス", // 上記の場合は 127.0.0.1:8888
        }
    }
```

#### 3. ランナーを起動する

↑ のアドレスを読んで引っ張ってきてくれるようになる

ちなみにデフォルトは`127.0.0.1:8888`

## 要望・改善等

[https://github.com/kkc4k3/cake_runner](https://github.com/kkc4k3/cake_runner)
