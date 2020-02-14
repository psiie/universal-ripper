const get = require('download');
const async = require('async');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const chalk = require('chalk');
const { puppet } = require('./puppeteer');
const {
  hasher,
  extensionFromHref,
  filenameFromHref,
  save,
  bufferToCheerio,
} = require('../utils');
const {
  ROOT,
  HOSTNAME,
  PATHS,
  WAIT_INTERVAL,
} = require('../constants');

// -- Setup -- //
const queueMirror = {}; // used to dedup entries
fs.mkdirpSync(PATHS.OUT.BASE);
fs.mkdirpSync(PATHS.OUT.ASSETS);
fs.writeFileSync(PATHS.ASSETS_DB, '', 'utf8');

// -------------------------------------------------------------------------- //


function addToQueue(item) {
  const itemStr = item.toString();
  const { hostname } = url.parse(itemStr);
  const isSameHost = hostname === HOSTNAME;
  const isUrlEscapingScope = itemStr.split(ROOT).length < 2;

  let hash = '';

  try {
    hash = hasher(itemStr);
  } catch (e) {
    hash = '';
  }

  // abort ifs
  if (!hash || queueMirror[hash]) return;
  else if (!isSameHost || hostname === null) return; // if not part of this site, abort.
  else if (isUrlEscapingScope) return;
  
  // add to queue
  queueMirror[hash] = true;
  queue.push(item);
  fs.appendFileSync(PATHS.PAGE_DB, `${item}\n`, 'utf8');
  console.log('adding to queue');
}

function findElements($) {
  return new Promise((resolve /* , reject */) => {
    console.log(chalk.grey('  + searching for links'));

    // find hrefs to further crawl. Save asset links while we are at it.
    ;['src', 'href'].forEach(selector => { // eslint-disable-line no-extra-semi
      $(`[${selector}]`).each((idx, item) => {
        const { attribs, name } = item || {};
        const src = attribs[selector]; // could be href or src
        if (!src) return;

        if (src[0] === '#') return;
        if (name === 'a') addToQueue(src);
      });
    });

    console.log(chalk.grey('  + finished searching for links'));
    resolve($.html());
  });
}

// -------------------------------------------------------------------------- //

function processPage(pageHref, callback) {
  const filename = filenameFromHref(pageHref);
  const filepath = path.join(PATHS.OUT.BASE, filename);
  const ext = extensionFromHref(pageHref);
  const delayCallback = (err) => {
    if (err) console.log(chalk.red('+ Caught Error:', err))
    console.log(chalk.green('- Delaying Callback'))
    setTimeout(callback, WAIT_INTERVAL)
  };
  const error1 = !pageHref || filename === '';
  const error2 = ext !== 'html' && ext !== 'htm';
  const error3 = fs.existsSync(filepath);

  // -- Abort ifs -- //
  if (error3 || error2 || error1) {
    // console.log('error', error3, error2, error1)
    if (error1) console.log(chalk.yellow(`- Skipping. pageHref was null. '${pageHref}' '${filename}'`));
    else if (error2) console.log(chalk.yellow('- Skipping. Extension is', ext, pageHref));
    else if (error3) console.log(chalk.yellow('- Skipping', pageHref, '. Already Exists'));
    callback();
    return;
  }

  console.log('\nQueue Size Remaining:', queue.length())
  console.log(chalk.blue('- Downloading:', pageHref));

  puppet.get(pageHref)
    .then(bufferToCheerio)
    .then(findElements)
    .then(data => save(filepath, data))
    .then(delayCallback)
    .catch(delayCallback);
}

// -------------------------------------------------------------------------- //

// -- Start -- //
const queue = async.queue(processPage, 1);
queue.push(ROOT);
queue.error(err => console.log('queue error:', err));
queue.drain(() => {
  console.log('\nAll items have been processed');
  puppet.close();
});
