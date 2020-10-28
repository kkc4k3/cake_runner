# Cake Runner

自分用タスクランナー（制作中）  
`yarn run cakerun`で動く

## ⚠ 注意

`node >= 12.10` を推奨！

## 設定ファイル `cake.config.js` の書き方

```javascript
// 値はすべて初期値（のはず）
module.exports = {
    srcDir: "./src", // 作業フォルダ
    distDir: "/dist", // 出力フォルダ

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
    // 現状htmlまたはphpに対応
    htdocs: {
        // disabled: false, // 無効化することもできるようにするつもりですが未設定です
        mode: "php", // php または html で記述
        options: {
            proxy: "127.0.0.1:8888", // phpの場合別途サーバーを建てる必要あり、それのアドレスを記入
            server: "./dist", // htmlの場合indexファイルのあるフォルダを指定
        },
    },
}
```

### PHP を Sync させる場合

1. 別でサーバーを建てる  
   `php -S 127.0.0.1:8080` とか……
2. config ファイルに以下を記述

    ```javascript
    syncOption: {
        proxy: "建てたサーバーのアドレス", // 上記の場合は 127.0.0.1:8080
    }
    ```

3. ランナーを起動すると ↑ のアドレスを読んで引っ張ってきてくれるようになる

ちなみにデフォルトは`127.0.0.1:8888`

## 要望・改善等

[https://github.com/kkc4k3/cake_runner](https://github.com/kkc4k3/cake_runner)
