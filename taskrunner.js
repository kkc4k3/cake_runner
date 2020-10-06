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
watcher.on("add", (pathName) => {
    if (getExt(pathName) === ".scss") {
        compileScss(pathName)
    }
})

// ファイル変更
watcher.on("change", (pathName) => {
    if (getExt(pathName) === ".scss") {
        compileScss(pathName)
    }
})

// 拡張子を取得して返す
function getExt(pathName) {
    return path.extname(pathName)
}

// scssのコンパイル
function compileScss(
    source,
    dist = distDir + "/css",
    outputFile = "style.css"
) {
    sass.render(
        {
            file: source,
        },
        (error, result) => {
            if (error) {
                console.log(error.message)
            } else {
                fs.writeFile(dist + "/" + outputFile, result.css)
                    .then((res) => {
                        //
                    })
                    .catch((err) => {
                        console.error(err.message)
                    })
            }
        }
    )
}
