const get = require('download');
const fs = require('fs-extra');
const readline = require('linebyline');
const async = require('async');
const path = require('path');
let childProcess = require('child_process');
const { PATHS, WAIT_INTERVAL } = require('./constants');
const { hasher, extensionFromHref, filenameFromHref } = require('./helper');

const lineReader = readline(PATHS.ASSETS_DB);
const queue = async.queue(downloadAsset, 4);
const queueMirror = {}; // used to dedup entries

// -------------------------------------------------------------------------- //

function downloadAsset(href, callback) {
  const filename = filenameFromHref(href, true);
  const ext = extensionFromHref(href);
  const basePath = ext === 'html' ? PATHS.OUT.BASE : PATHS.OUT.ASSETS;
  const filepath = path.join(basePath, filename);

  // abort ifs
  if (!href || filename === '' || fs.existsSync(filepath)) {
    callback();
    return;
  }

  console.log('\nQueue Size Remaining:', queue.length());
  console.log('- Downloading:', href);

  const cmd = `cd out/assets/ && wget -nc -t 10 ${href}`;
  childProcess.exec(cmd, (err, stdout, stderr) => {
    if (err) console.log(cmd, err, stdout, stderr);

    callback();
  });
  // get(href)
  //   .then(buffer => {
  //     const outpath = path.join(basePath, filename);
  //     fs.writeFileSync(outpath, buffer)
  //     console.log('- Success');
  //     setTimeout(callback, WAIT_INTERVAL); // respect robots.txt
  //   })
  //   .catch(err => {
  //     console.log('  + Error downloading', href, err);
  //     callback();
  //   });
}

function onLineRead(line, lineCount, byteCount) {
  const lineStr = line.toString();
  let hash = '';

  try {
    hash = hasher(lineStr);
  } catch (e) {
    hash = '';
  }

  if (!hash || queueMirror[hash]) return;
  queue.push(line);
}

// -------------------------------------------------------------------------- //

queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll assets have been downloaded'));
lineReader.on('error', err => console.log('error reading line', err));
lineReader.on('line', onLineRead);