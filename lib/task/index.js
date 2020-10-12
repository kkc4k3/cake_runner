// nodeの
const path = require("path")
const fs = require("fs").promises

// 外部ライブラリ
const chokidar = require("chokidar")
const sass = require("sass")
const postcss = require("postcss")
const autoprefixer = require("autoprefixer")
const cssnano = require("cssnano")
const { build } = require("esbuild")
const babel = require("@babel/core")
const browserSync = require("browser-sync").create()

// node実行ディレクトリ
const rootDir = process.cwd()

// 設定ファイル
const config = require(rootDir + "/cake.config.js")

// 設定ファイルから作業フォルダと書き出しフォルダを生成
const srcDir = config.srcDir
    ? rootDir + rewritePath(config.srcDir)
    : rootDir + "/src"
const distDir = config.distDir
    ? rootDir + rewritePath(config.distDir)
    : rootDir + "/dist"

console.log(srcDir)
console.log(distDir)

// browserSync起動
browserSync.init(config.syncOption)

const watcher = chokidar.watch(srcDir + "/**", {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
})

// ファイル追加
watcher.on("add", async (pathName) => {
    // css
    if (getExt(pathName) === ".scss") {
        const cssPromise = await compileScss()
        browserSync.reload()
        console.log(cssPromise)
    }
    // js
    if (getExt(pathName) === ".js") {
        const jsPromise = await buildJs()
        browserSync.reload()
        console.log(jsPromise)
    }
})

// ファイル変更
watcher.on("change", async (pathName) => {
    if (getExt(pathName) === ".scss") {
        const cssPromise = await compileScss()
        browserSync.reload()
        console.log(cssPromise)
    }
    // js
    if (getExt(pathName) === ".js") {
        const jsPromise = await buildJs()
        browserSync.reload()
        console.log(jsPromise)
    }
    // htmlとかphpの場合ブラウザをリロードする
    if (getExt(pathName) === ".html" || getExt(pathName) === ".php") {
        browserSync.reload()
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
async function compileScss() {
    // scssのベースになるファイル
    const source = (() => {
        const scssSrc = config.scss.src ? rewritePath(config.scss.src) : "/scss"
        const scssBase = config.scss.base
            ? rewritePath(config.scss.base)
            : "/style.scss"
        return srcDir + scssSrc + scssBase
    })()
    // 書き出し先
    const dist = (() => {
        // configファイルで書き出しディレクトリの指定があるか見る
        if (config.scss.dist) {
            return distDir + rewritePath(config.scss.dist)
        }
        return distDir + "/css"
    })()
    // 書き出すファイル
    const outputFile = (() => {
        // 処理はdistと同じなので割愛
        if (config.scss.output) {
            return rewritePath(config.scss.output)
        }
        return "/style.css"
    })()
    // ↑にminつけたやつを縮小版として書き出す
    const outputMinFile = outputFile.replace(".css", ".min.css")
    // ここからコンパイル処理
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
        await fs.writeFile(dist + outputFile, prefixCss.css)
        await fs.writeFile(dist + outputMinFile, minCss.css)

        // 文字列メッセージとしてpromise返却
        return "css compiled"
    } catch (error) {
        console.error(error.message)
    }
}

// jsのビルドとか
async function buildJs(
    entry = srcDir + "/js/index.js",
    output = distDir + "/js/main.js"
) {
    try {
        await build({
            entryPoints: [entry],
            outfile: output,
            minify: true,
            bundle: true,
        })
        return "js builded"
    } catch (error) {
        console.error(error.message)
    }
}

// （相対）パス名を書き換える
function rewritePath(pathStr) {
    console.log(pathStr)
    let result = pathStr.replace("./", "/")
    if (pathStr.indexOf("/") === -1) {
        result = "/" + result
    }
    return result
}
