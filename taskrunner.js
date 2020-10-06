const chokidar = require("chokidar")
const path = require("path")
const sass = require("sass")
const fs = require("fs").promises
const postcss = require("postcss")
const autoprefixer = require("autoprefixer")

const srcDir = "./src"
const distDir = "./dist"
// src以下の監視対象ファイルを配列で指定
const assetsDir = ["scss", "js", "img"]

// 以下で生成するglobがこの中に入る
var globList = []

// globを生成 多分10個下のファイルまで見る（流石にそんな深い階層にはせんやろ……）
// TODO: ディレクトリが追加されたら監視対象に追加みたいな処理に出来る？
for (i = 0; i < 10; i++) {
    const globStr = "/**"
    assetsDir.forEach((dir) => {
        const dirGlobStr = srcDir + "/" + dir + globStr.repeat(i)
        globList.push(dirGlobStr)
    })
}

const watcher = chokidar.watch(globList, {
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
    outputFile = "style.css"
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
        // 出力
        await fs.writeFile(dist + "/" + outputFile, prefixCss.css)
        // 文字列メッセージとしてpromise返却
        return "css compiled"
    } catch (error) {
        console.error(error.message)
    }
}
