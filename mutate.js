require('dotenv').config()
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
const Datastore = require('nedb');
const argv = require('yargs').argv;
const db = new Datastore({ filename: 'assets.db', autoload: true });

const queue = async.queue(processPage, 8);
let BASE_URL = process.env.BASE_URL || '';
BASE_URL = BASE_URL.replace(/\/$/, ''); // remove ending slash if exists

// -------------------------------------------------------------------------- //

function cleanUrl(url) {
  let newUrl = url;
  newUrl = newUrl.replace(/^\/\//, 'https://'); // leading double slashes
  newUrl = newUrl.replace(/^\//, `${BASE_URL}/`); // prepend base url

  return newUrl;
}

function addToDatabase(item) {
  const url = cleanUrl(item);
  db.update({ url }, { url }, { upsert: true }, err => {
    if (err) console.log('db error:', err);
  });
}

function findElements($) {
  console.log('-', queue.length(), 'remaining');

  const selectors = ['src', 'href'];
  selectors.forEach(selector => $(`[${selector}]`).each((idx, item) => {
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

    if (exists) {
      item.attribs[selector] = newSrc;
      return;
    }

    // if (argv.findAssets) fs.appendFileSync(PATHS.ASSETS_DB, `${src}\n`, 'utf8');
    if (argv.findAssets) addToDatabase(src);
    delete item.attribs[selector]; // not in asset list. delete reference
  }));

  // must return a promise to continue promise chain.
  // this function does not need to be a promise due to it being syncronous
  return new Promise(resolve => resolve($.html()));
}

function processPage(filename, callback) {
  const pathname = path.join(__dirname, 'out/', filename);
  const newPathname = path.join(PATHS.OUT2.BASE, filename);

  loadFile(pathname)
    .then(bufferToCheerio)
    .then(findElements)
    .then(data => save(newPathname, data, argv.findAssets)) // dryRun if findAssets flag is used
    .then(callback)
    .catch(() => callback());
}

// -------------------------------------------------------------------------- //

function main() {
  const files = fs.readdirSync(PATHS.OUT.BASE);
  const addToQueue = files.filter(file => /html?$/.test(file));
  
  if (argv.findAssets) fs.writeFileSync(PATHS.ASSETS_DB, '', 'utf8'); // erase on new findAsset run
  fs.mkdirpSync(PATHS.OUT2.BASE);
  console.log('Adding', addToQueue.length, 'files to queue for processing');

  queue.push(addToQueue);
  queue.error(err => console.log('queue error:', err));
  queue.drain(() => {
    console.log('\nAll items have been processed');
    if (argv.findAssets) {
      db.persistence.compactDatafile();
    }
  });
}

main();
