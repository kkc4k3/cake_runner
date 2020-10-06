// nodeの
const path = require("path")
const fs = require("fs").promises

// 外部ライブラリ
const chokidar = require("chokidar")
const sass = require("sass")
const postcss = require("postcss")
const autoprefixer = require("autoprefixer")
const cssnano = require("cssnano")

const srcDir = "./src"
const distDir = "./dist"
// src以下の監視対象ファイルを配列で指定
const assetsDir = ["scss", "js", "img"]

const watcher = chokidar.watch(srcDir + "/**", {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
})

// ファイル追加
watcher.on("add", async (pathName) => {
    if (getExt(pathName) === ".scss") {
        const cssPromise = await compileScss()
        console.log(cssPromise)
    }
})

// ファイル変更
watcher.on("change", async (pathName) => {
    if (getExt(pathName) === ".scss") {
        const cssPromise = await compileScss()
        console.log(cssPromise)
    }
})

// ===========================================
// 関数
// ===========================================

// 拡張子を取得して返す
function getExt(pathName) {
    return path.extname(pathName)
}

// scssのコンパイル
async function compileScss(
    source = srcDir + "/scss/style.scss",
    dist = distDir + "/css",
    outputFile = "style.css",
    outputMinFile = "style.min.css"
) {
    try {
        // scssからcssにコンパイル
        const result = sass.renderSync({
            file: source,
        })
        // ↑にベンダープレフィックスつける
        const prefixCss = await postcss([
            autoprefixer({
                overrideBrowserslist: [
                    "last 2 versions",
                    "ie >= 11",
                    "Android >= 4",
                ],
                cascade: false,
            }),
        ]).process(result.css, {
            from: undefined,
        })
        // minify化
        const minCss = await postcss([cssnano]).process(prefixCss.css, {
            from: undefined,
        })

        // 出力
        await fs.writeFile(dist + "/" + outputFile, prefixCss.css)
        await fs.writeFile(dist + "/" + outputMinFile, minCss.css)

        // 文字列メッセージとしてpromise返却
        return "css compiled"
    } catch (error) {
        console.error(error.message)
    }
}
