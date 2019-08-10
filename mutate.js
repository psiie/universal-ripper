const fs = require('fs-extra');
const async = require('async');
const path = require('path');
const { PATHS } = require('./constants');
const {
  extensionFromHref,
  filenameFromHref,
  loadFile,
  save,
  bufferToCheerio,
} = require('./helper');

// -------------------------------------------------------------------------- //

let success = 0;
let fail = 0;
fs.mkdirpSync(PATHS.OUT2.BASE);

// -------------------------------------------------------------------------- //

function findElements($) {
  return new Promise((resolve, reject) => {
    console.log('-', queue.length(), 'remaining');
    ;['src', 'href'].forEach(selector => {
      $(`[${selector}]`).each((idx, item) => {
        const { attribs } = item || {};
        const src = attribs[selector]; // could be href or src
        if (!src) return;
        const attribFilename = filenameFromHref(src, true);
        const attribFilenameExt = extensionFromHref(attribFilename);
        const isHTML = /html?/.test(attribFilenameExt);
        const checkBasePath = isHTML ? PATHS.OUT.BASE : PATHS.OUT.ASSETS; // if .html file, then check in the base folder instead
        const checkFullPath = path.join(checkBasePath, attribFilename);
        const exists = fs.existsSync(checkFullPath);
        const newSrc = path.join(isHTML ? '' : 'assets', attribFilename);

        exists ? success++ : fail++;

        if (exists) {
          item.attribs[selector] = newSrc;
        } else {
          delete item.attribs[selector]; // not in asset list. delete reference
          fs.appendFileSync(PATHS.ASSETS_DB, `${src}\n`, 'utf8');
        }
      });
    });

    resolve($.html());
  });
}

function mutatePage(filename, callback) {
  const pathname = path.join(__dirname, 'out/', filename);
  const newPathname = path.join(PATHS.OUT2.BASE, filename);

  loadFile(pathname)
    .then(bufferToCheerio)
    .then(findElements)
    .then(data => save(newPathname, data))
    .then(callback)
    .catch(() => callback());
}

// -------------------------------------------------------------------------- //

const queue = async.queue(mutatePage, 8);
queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll items have been processed'));
fs.readdir(PATHS.OUT.BASE, (err, files) => {
  if (err) {
    console.log('Could not read directory', err);
    return;
  }

  const addToQueue = files.filter(file => /html?$/.test(file));
  console.log('Adding', addToQueue.length, 'files to queue for processing');
  queue.push(addToQueue);
});
