// nodeの
const path = require("path")
const fs = require("fs").promises

// 外部ライブラリ
const merge = require("lodash.merge")
const chokidar = require("chokidar")
const sass = require("sass")
const postcss = require("postcss")
const autoprefixer = require("autoprefixer")
const cssnano = require("cssnano")
const { build } = require("esbuild")
const imagemin = require("imagemin")
const jpegtran = require("imagemin-jpegtran")
const pngquant = require("imagemin-pngquant")
const gifsicle = require("imagemin-gifsicle")
const svgo = require("imagemin-svgo")
// const babel = require("@babel/core") // そのうち
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

// 初期設定
const configDefault = {
    srcDir: "./src",
    distDir: "./dist",
    scss: {
        src: "./scss",
        dist: "./css",
        base: "style.scss",
        output: "style.css",
    },
    js: {
        src: "./js",
        dist: "./js",
        base: "index.js",
        output: "main.js",
    },
    htdocs: {
        mode: "html",
        options: {
            proxy: "127.0.0.1:8888",
            server: "./dist",
        },
    },
    img: {
        src: "./img",
        dist: "./img",
    },
}

// configファイル
const configFile = (() => {
    try {
        return require(rootDir + "/cake.config.js")
    } catch (error) {
        // 存在しなければ空objを返す
        if (error.code === "MODULE_NOT_FOUND") {
            return {}
        }
        console.error(log.text.red + error.message)
        return {}
    }
})()
// configファイルで設定された部分だけ上書き
const config = merge(configDefault, configFile)

// 設定ファイルから作業フォルダと書き出しフォルダを設定
const srcDir = rootDir + rewritePath(config.srcDir)
const distDir = rootDir + rewritePath(config.distDir)

// 初期化
init()

// browserSyncの初期設定
const syncOption = config.htdocs.options

// htdocsのモードを設定、それに応じてBSの要らん設定項目を消す
const mode = config.htdocs.mode

if (mode === "html" || mode === "pug") {
    // 静的ファイル（htmlおよびhtmlを最終的に出力するテンプレートエンジン）の場合はproxyを削除
    delete syncOption.proxy
} else {
    // それ以外（＝サーバー言語）の場合はserverを削除
    delete syncOption.server
}

// browserSync起動
browserSync.init(syncOption)

// ===========================================
// 関数
// ===========================================

// 起動
async function init() {
    // srcディレクトリがない場合作る
    await makeDir("./src")
    const reset = await distReset()
    console.log(reset)
    const watcher = chokidar.watch(srcDir + "/**", {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    })

    // 画像処理キュー↓
    var imgQueue = []
    var timer

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
        // 画像
        // if (
        //     [
        //         ".jpg",
        //         ".JPG",
        //         ".jpeg",
        //         ".JPEG",
        //         ".gif",
        //         ".GIF",
        //         ".png",
        //         ".PNG",
        //         ".svg",
        //     ].indexOf(getExt(pathName)) !== -1
        // ) {
        //     // キューに画像追加↓
        //     imgQueue.push(pathName)

        //     if (typeof timer !== undefined) {
        //         clearTimeout(timer)
        //     }
        //     timer = imgScript(imgQueue)
        // }
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
        const scssSrc = rewritePath(config.scss.src)
        const scssBase = rewritePath(config.scss.base)
        return srcDir + scssSrc + scssBase
    })()
    // 書き出し先
    const dist = (() => {
        return distDir + rewritePath(config.scss.dist)
    })()

    // ディレクトリ生成
    await makeDir(dist)

    // 書き出すファイル
    const outputFile = (() => {
        return rewritePath(config.scss.output)
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
        const jsSrc = rewritePath(config.js.src)
        const jsBase = rewritePath(config.js.base)
        return srcDir + jsSrc + jsBase
    })()

    // 出力ファイル
    const output = (() => {
        const jsDist = rewritePath(config.js.dist)
        const jsOutput = rewritePath(config.js.output)
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

// 画像処理
// async function imgScript(queue) {
//     return setTimeout(async () => {
//         try {
//             const files = await imagemin(queue, {
//                 plugins: [jpegtran(), pngquant(), gifsicle(), svgo()],
//             })
//             files.forEach(async (img) => {
//                 // 画像のバイナリデータ
//                 const imgData = img.data
//                 // ファイル名単体
//                 const fileName = img.sourcePath.replace(
//                     srcDir + rewritePath(config.img.src),
//                     ""
//                 )
//                 // 書き出し先
//                 const distPath = img.sourcePath.replace(
//                     srcDir + rewritePath(config.img.src),
//                     distDir + rewritePath(config.img.dist)
//                 )
//                 fs.mkdir(distPath.replace(fileName, ""), { recursive: true })
//                 await fs.writeFile(distPath, imgData)
//             })
//             console.log(
//                 `${log.bg.green}${log.text.black} img ${log.reset} ${queue.length} images scaled`
//             )
//             queue = []
//         } catch (error) {
//             console.error(log.text.red + error.message)
//         }
//     }, 500)
// }

// （相対）パス名を書き換える
function rewritePath(pathStr) {
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
