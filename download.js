const get = require('download');
const fs = require('fs-extra');
const readline = require('linebyline');
const async = require('async');
const path = require('path');
const { PATHS, WAIT_INTERVAL } = require('./constants');
const { hasher, extensionFromHref, filenameFromHref } = require('./helper');

const lineReader = readline(PATHS.ASSETS_DB);
const queue = async.queue(downloadAsset, 4);
const queueMirror = {}; // used to dedup entries

// -------------------------------------------------------------------------- //

function downloadAsset(href, callback) {
  const filename = filenameFromHref(href, true);
  const filepath = path.join(PATHS.OUT.ASSETS, filename);
  // console.log('=== filepath', filepath)

  console.log('\nQueue Size Remaining:', queue.length());

  // abort ifs
  if (!href || filename === '') {
    console.log('- Skipping. href was null');
    callback();
    return;
  } else if (fs.existsSync(filepath)) {
    console.log('- Skipping', href, '. Already Exists');
    callback();
    return;
  }

  console.log('- Downloading:', href);
  get(href, PATHS.OUT.ASSETS)
    .then(() => {
      setTimeout(callback, WAIT_INTERVAL); // respect robots.txt
    })
    .catch(err => {
      console.log('  + Error downloading', href, err);
      callback();
    });
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