const get = require('download');
const fs = require('fs-extra');
const readline = require('linebyline');
const async = require('async');
const path = require('path');
const { filenameFromHref } = require('../utils');

const basePath = path.join(__dirname, 'map');
fs.mkdirpSync(basePath);

function downloadAsset(href, callback) {
  get(href, path.join(__dirname, 'map'))
    .then(buffer => {
      console.log('Remaining:', queue.length());
      const [ folderA, folderB, filename ] = href.split('/').slice(-3);
      const outPath = path.join(basePath, folderA, folderB);
      const outFilePath = path.join(outPath, filename);
      fs.mkdirpSync(outPath);
      fs.writeFileSync(outFilePath, buffer);
      callback();
    })
    .catch(err => {
      console.log('  + Err. Cant download', href);
      callback();
    });
}

const queue = async.queue(downloadAsset, 4);
queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll assets have been downloaded'));

for (let x=1; x<10; x++) {
  for (let y=0; y<10; y++) {
    for (let z=0; z<10; z++) {
      const cmd = `https://en.unesco.org/tiles/geodata/${x}/${y}/${z}.png`;
      queue.push(cmd);
      // fs.appendFileSync(path.join(__dirname, 'map.sh'), cmd);
    }
  }
}
