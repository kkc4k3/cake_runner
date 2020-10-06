const chokidar = require("chokidar")
const path = require("path")
const sass = require("sass")
const fs = require("fs").promises

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
        await compileScss()
        console.log("done")
    }
})

// ファイル変更
watcher.on("change", async (pathName) => {
    if (getExt(pathName) === ".scss") {
        await compileScss()
        console.log("done")
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
        const result = sass.renderSync({
            file: source,
        })
        await fs.writeFile(dist + "/" + outputFile, result.css)
        return "css compiled"
    } catch (error) {
        console.error(error.message)
    }
}
