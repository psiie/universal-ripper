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

function _get(href, filepath, outputFilename) {
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

function _wget(href, outputFilename) {
  return new Promise((resolve) => {
    log('- Trying fallback');
    const cmd = `cd out/assets/ && wget -nc -t 10 --tries 1 -O ${outputFilename} ${href}`;
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
  const outputFilename = '';
  const data = await _get(href, filepath, outputFilename)
  if (!data && argv.findAssets) await _wget(href, outputFilename);

  console.log('Waiting for cooldown');
  setTimeout(callback, WAIT_INTERVAL);
}

// -------------------------------------------------------------------------- //

function downloadAsset(document, callback) {
  const { url } = document;
  const filename = filenameFromHref(url, true);
  /* todo: assets need hashes. name collision occurs on 3/1/3.png and 1/1/3.png, ect.
  solution is to use a hash based on the file (procedural). That way we can get the
  hash no matter where in the process we are */

  // const filenameWithHash = (() => {
  //   const filenameSplit = filename.split('.');
  //   filenameSplit.splice(-1, 0, _id);
  //   return filenameSplit.join('.');
  // })();
  const ext = extensionFromHref(url);
  const basePath = ext === 'html' ? PATHS.OUT.BASE : PATHS.OUT.ASSETS;
  const filepath = path.join(basePath, filename);

  // abort ifs
  if (!url || filename === '' || fs.existsSync(filepath)) {
    log('+ Skipping' + ' ' +  filename + ' ' +  url);
    callback();
    return;
  }

  log('\nQueue Size Remaining:' + ' ' +  queue.length());
  log('- Downloading:' + ' ' +  url);
  smartDownload(url, filepath, callback);
}

// -------------------------------------------------------------------------- //

function main() {
  fs.writeFileSync(path.join(__dirname, 'assets_failed.db'), '', 'utf8');
  queue.error(err => log('queue error:', err));
  queue.drain(() => log('\nAll assets have been downloaded'));

  db.find({}, (err, docs) => {
    if (err) log('db.find() error:', err);
    // const cleanDocs = docs.map(doc => doc.url);
    queue.push(docs);
  });
}

main();
