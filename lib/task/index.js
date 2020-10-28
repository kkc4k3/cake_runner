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
const { EEXIST } = require("constants")
const browserSync = require("browser-sync").create()

// console.logに色つけたい
const log = {
    reset: "\x1b[0m",
    text: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    },
}

// node実行ディレクトリ
const rootDir = process.cwd()

// 設定ファイル
const config = require(rootDir + "/cake.config.js")

// 設定ファイルから作業フォルダと書き出しフォルダを設定
const srcDir = config.srcDir
    ? rootDir + rewritePath(config.srcDir)
    : rootDir + "/src"
const distDir = config.distDir
    ? rootDir + rewritePath(config.distDir)
    : rootDir + "/dist"

console.log(srcDir)
console.log(distDir)

// 初期化
init()

// browserSyncの初期設定
const syncOption = {
    server: "./dist",
    proxy: "127.0.0.1:8888",
}

// 設定ファイルにbrowserSyncの記述があればそっちで上書き
Object.keys(config.htdocs.options).forEach((key) => {
    syncOption[key] = config.htdocs.options[key]
    // パスを絶対パスに書き換え
    if (key === "server") {
        syncOption[key] = rootDir + rewritePath(config.htdocs.options[key])
    }
})

// htdocsのモードを設定、それに応じてBSの要らん設定項目を消す
var mode = "html"
if (config.htdocs.mode === "php") {
    delete syncOption.server
    mode = "php"
} else {
    delete syncOption.proxy
}

// browserSync起動
browserSync.init(syncOption)

// ===========================================
// 関数
// ===========================================

// 起動
async function init() {
    const reset = await distReset()
    console.log(reset)
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
        // html/php/pug
        if (getExt(pathName) === "." + mode) {
            if (mode === "pug") {
                // そのうち
            } else {
                const docsPromise = await copyHtml(pathName)
                browserSync.reload()
                console.log(docsPromise)
            }
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
        // html/php/pug
        if (getExt(pathName) === "." + mode) {
            if (mode === "pug") {
                // そのうち
            } else {
                const docsPromise = await copyHtml(pathName)
                browserSync.reload()
                console.log(docsPromise)
            }
        }
    })
}

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

    // ディレクトリ生成
    await makeDir(dist)

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
        return `${log.bg.cyan}${log.text.black} css ${log.reset} complete`
    } catch (error) {
        console.error(log.text.red + error.message)
    }
}

// jsのビルドとか
async function buildJs() {
    // jsのエントリーファイル
    const entry = (() => {
        const jsSrc = config.js.src ? rewritePath(config.js.src) : "/js"
        const jsBase = config.js.base
            ? rewritePath(config.scss.base)
            : "/index.js"
        return srcDir + jsSrc + jsBase
    })()

    // 出力ファイル
    const output = (() => {
        const jsDist = config.js.src ? rewritePath(config.js.dist) : "/js"
        const jsOutput = config.js.output
            ? rewritePath(config.js.output)
            : "/main.js"
        return distDir + jsDist + jsOutput
    })()

    try {
        await build({
            entryPoints: [entry],
            outfile: output,
            minify: true,
            bundle: true,
        })
        return `${log.bg.yellow}${log.text.black} js ${log.reset} complete`
    } catch (error) {
        console.error(log.text.red + error.message)
    }
}

// html/phpを構造維持したままdistにコピー
async function copyHtml(filePath) {
    try {
        const fileName = filePath.replace(srcDir, "")
        await fs.copyFile(filePath, distDir + fileName)
        return `${log.bg.magenta}${log.text.black} docs ${log.reset} complete`
    } catch (error) {
        console.error(log.text.red + error.message)
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

// distディレクトリを削除して生成するだけ
async function distReset() {
    try {
        await fs.rmdir(distDir, { recursive: true })
        await fs.mkdir(distDir)
        return `${log.text.green}dist dir reset${log.reset}`
    } catch (error) {
        console.error(log.text.red + error.message)
    }
}

// ディレクトリ生成
async function makeDir(dir) {
    fs.mkdir(dir)
        .then(() => {
            return "make dir"
        })
        .catch((error) => {
            if (error.code !== "EEXIST") {
                console.error(log.text.red + error.message + log.reset)
            }
        })
}
