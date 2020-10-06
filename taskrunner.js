const chokidar = require('chokidar');

const watcher = chokidar.watch(['./src'], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
});

watcher.on('add', (path) => {
    console.log(path);
});
