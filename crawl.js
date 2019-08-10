const get = require('download');
const async = require('async');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const {
  hasher,
  extensionFromHref,
  filenameFromHref,
  save,
  bufferToCheerio,
} = require('./helper');
const {
  ROOT,
  HOSTNAME,
  PATHS,
} = require('./constants');

// -------------------------------------------------------------------------- //

const queueMirror = {}; // used to dedup entries
fs.mkdirpSync(PATHS.OUT.BASE);
fs.mkdirpSync(PATHS.OUT.ASSETS);
fs.writeFileSync(PATHS.ASSETS_DB, '', 'utf8');

// -------------------------------------------------------------------------- //


function addToQueue(item) {
  const itemStr = item.toString();
  let hash = '';

  try {
    hash = hasher(itemStr);
  } catch (e) {
    hash = '';
  }

  const { hostname } = url.parse(itemStr);

  // abort ifs
  if (!hash) return;
  else if (!hash || queueMirror[hash]) return;
  else if (!(hostname === HOSTNAME || hostname === null)) return; // if not part of this site, abort.

  // add to queue
  queueMirror[hash] = true;
  queue.push(item);
  fs.appendFileSync(PATHS.PAGE_DB, `${item}\n`, 'utf8');
  console.log('adding to queue');
}

function findElements($) {
  return new Promise((resolve, reject) => {
    console.log('  + searching for hrefs');

    // find hrefs to further crawl. Save asset links while we are at it.
    ;['src', 'href'].forEach(selector => {
      $(`[${selector}]`).each((idx, item) => {
        const { attribs, name } = item || {};
        const src = attribs[selector]; // could be href or src
        if (!src) return;

        if (src[0] === '#') return;
        if (name === 'a') addToQueue(src);
      });
    });

    resolve($.html());
  });
}

// -------------------------------------------------------------------------- //

function processPage(pageHref, callback) {
  const filename = filenameFromHref(pageHref);
  const filepath = path.join(PATHS.OUT.BASE, filename);
  const ext = extensionFromHref(pageHref);
  const delayCallback = () => setTimeout(callback, WAIT_INTERVAL);
  const error1 = !pageHref || filename === '';
  const error2 = ext !== 'html' && ext !== 'htm';
  const error3 = fs.existsSync(filepath);

  // abort ifs
  if (error1 || error2 || error3) {
    if (error1) console.log('- Skipping. pageHref was null');
    else if (error2) console.log('- Skipping. Extension is', ext, pageHref);
    else if (error3) console.log('- Skipping', pageHref, '. Already Exists');
    callback();
    return;
  }

  console.log('\nQueue Size Remaining:', queue.length())
  console.log('- Downloading:', pageHref);

  get(pageHref)
    .then(bufferToCheerio)
    .then(findElements)
    .then(data => save(filepath, data))
    .then(delayCallback)
    .catch(delayCallback);
}

// -------------------------------------------------------------------------- //

const queue = async.queue(processPage, 4);
queue.push(ROOT);
queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll items have been processed'));
