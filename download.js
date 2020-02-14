const download = require('download');
const fs = require('fs-extra');
const async = require('async');
const path = require('path');
const Datastore = require('nedb');
const argv = require('yargs').argv;
let childProcess = require('child_process');
const { PATHS, WAIT_INTERVAL } = require('./constants');
const { extensionFromHref, filenameFromHref } = require('./utils');

const db = new Datastore({ filename: 'assets.db', autoload: true });
const queue = async.queue(downloadAsset, 8);

function log(str) {
  console.log(str.slice(0,128));
}

// -------------------------------------------------------------------------- //

function _get(href, filepath) {
  return new Promise((resolve) => {
    download(href)
      .then(buffer => {
        log('- Success');
        fs.writeFileSync(filepath, buffer)
        resolve();
      })
      .catch(() => {
        fs.appendFileSync(path.join(__dirname, 'assets_failed.db'), `${href}\n`, 'utf8');
        resolve();
      });
  });
}

function _wget(href) {
  return new Promise((resolve) => {
    log('- Trying fallback');
    const cmd = `cd out/assets/ && wget -nc -t 10 --tries 1 ${href}`;
    childProcess.exec(cmd, (err /* , stdout, stderr */) => {
      if (err) {
        log('  + Failed [fallback]');
        resolve();
        return;
      } 
      
      log('  - Success [fallback]');
      resolve();
    });
  });
}

async function smartDownload(href, filepath, callback) {
  // _get and _wget are side-effects.
  const data = await _get(href, filepath)
  if (!data && argv.findAssets) await _wget(href);

  console.log('Waiting for cooldown');
  setTimeout(callback, WAIT_INTERVAL);
}

// -------------------------------------------------------------------------- //

function downloadAsset(href, callback) {
  const filename = filenameFromHref(href, true);
  const ext = extensionFromHref(href);
  const basePath = ext === 'html' ? PATHS.OUT.BASE : PATHS.OUT.ASSETS;
  const filepath = path.join(basePath, filename);

  // abort ifs
  if (!href || filename === '' || fs.existsSync(filepath)) {
    log('+ Skipping' + ' ' +  filename + ' ' +  href);
    callback();
    return;
  }

  log('\nQueue Size Remaining:' + ' ' +  queue.length());
  log('- Downloading:' + ' ' +  href);
  smartDownload(href, filepath, callback);
}

// -------------------------------------------------------------------------- //

function main() {
  fs.writeFileSync(path.join(__dirname, 'assets_failed.db'), '', 'utf8');
  queue.error(err => log('queue error:', err));
  queue.drain(() => log('\nAll assets have been downloaded'));

  db.find({}, (err, docs) => {
    if (err) log('db.find() error:', err);
    const cleanDocs = docs.map(doc => doc.url);
    queue.push(cleanDocs);
  });
}

main();
