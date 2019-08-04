const download = require('download');
const async = require('async');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const parsePath = require('parse-filepath');
const sanitizeFilename = require("sanitize-filename");
const { hasher } = require('./helper');

const ROOT = 'https://en.unesco.org/womeninafrica/';
const HOSTNAME = url.parse(ROOT).hostname;
const WAIT_INTERVAL = 250; // to respect robots.txt
const PATHS = {
  OUT: {
    BASE: path.join(__dirname, 'out'),
    ASSETS: path.join(__dirname, 'out/', 'assets/'),
  },
  ASSETS_DB: path.join(__dirname, 'assets.db'),
  PAGE_DB: path.join(__dirname, 'pages.db'),
};

fs.mkdirpSync(PATHS.OUT.BASE);
fs.mkdirpSync(PATHS.OUT.ASSETS);
fs.writeFileSync(PATHS.ASSETS_DB, '', 'utf8');

// -------------------------------------------------------------------------- //

const queueMirror = {}; // used to dedup entries

function addToQueue(item) {
  const itemStr = item.toString();
  let hash = '';

  try {
    hash = hasher(itemStr);
  } catch (e) {
    hash = '';
  }

  const { hostname } = url.parse(itemStr);


  if (!hash) return;
  if (!hash || queueMirror[hash]) return;
  if (!(hostname === HOSTNAME || hostname === null)) return; // if not part of this site, abort.

  queueMirror[hash] = true;
  queue.push(item);
  fs.appendFileSync(PATHS.PAGE_DB, `${item}\n`, 'utf8');
  console.log('adding to queue');
}

function extensionFromHref(href) {
  const urlObject = url.parse(href);
  let path = urlObject.path;
  if (!href || !path) return '';

  const finalSegment = path.split('.').slice(-1)[0];
  if (/\./.test(href) === false || finalSegment.length > 4) {
    return 'html'; // edgecase. means no detectable extension.
  }

  return finalSegment;
}

function filenameFromHref(href) {
  const ext = extensionFromHref(href);
  const urlObject = url.parse(href);
  let path = urlObject.path;
  // console.log('path:', urlObject)
  if (!href || !path) return '';

  if (path[path.length - 1] === '/') path = path.slice(0, -1); // if last char is /, then remove
  if (path[0] === '/') { // if first char is /, then remove
    path = path.slice(1);
    path = path + '.html';
  }
  // if (ext === 'html' || ext === 'htm') path = path + '.html'; // if no .html ending, add it
  path = path.replace(/\//g, '_'); // replace slashes

  // the returned path must not have special chars. replace.
  return sanitizeFilename(path);
}

// -------------------------------------------------------------------------- //

function processPage(pageHref, callback) {
  const filename = filenameFromHref(pageHref);
  const filepath = path.join(PATHS.OUT.BASE, filename);
  const ext = extensionFromHref(pageHref);

  console.log('\nQueue Size Remaining:', queue.length())

  // abort ifs
  if (!pageHref || filename === '') {
    console.log('- Skipping. pageHref was null');
    callback();
    return;
  } else if (ext !== 'html' && ext !== 'htm') {
    console.log('- Skipping. Extension is', ext, pageHref);
    console.log('debug', ext !== 'html' , ext !== 'htm');
    callback();
    return;
  } else if (fs.existsSync(filepath)) {
    console.log('- Skipping', pageHref, '. Already Exists');
    callback();
    return;
  }

  console.log('- Downloading:', pageHref);
  download(pageHref).then(buffer => {
    if (!buffer) return;
    const $ = cheerio.load(buffer.toString());
    console.log('  + searching for hrefs');
    
    // find hrefs to further crawl. Save asset links while we are at it.
    ;['src', 'href'].forEach(selector => {
      $(`[${selector}]`).each((idx, item) => {
        const { attribs, name } = item || {};
        const src = attribs[selector]; // could be href or src
        if (!src) return;

        if (src[0] === '#') return;
        if (name === 'a') {
          addToQueue(src);
        } else {
          fs.appendFileSync(PATHS.ASSETS_DB, `${src}\n`, 'utf8');
        }
      });
    });

    // write out html file
    fs.writeFile(filepath, $.html(), 'utf8', err => {
      if (err) console.log('  + error writing file', htmlOutPath, err);
      else console.log('  + saved');

      setTimeout(callback, WAIT_INTERVAL); // respect robots.txt
    });
  }).catch(callback);
}

// -------------------------------------------------------------------------- //

const queue = async.queue(processPage, 4);
queue.push(ROOT);
queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll items have been processed'));
