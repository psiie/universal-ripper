const cheerio = require('cheerio');
const url = require('url');
const fs = require('fs-extra');
const readline = require('linebyline');
const async = require('async');
const path = require('path');
const parsePath = require('parse-filepath');
const {
  hasher,
  extensionFromHref,
  filenameFromHref,
  loadFile,
} = require('./helper');
const {
  ROOT,
  HOSTNAME,
  WAIT_INTERVAL,
  PATHS,
} = require('./constants');

fs.mkdirpSync(PATHS.OUT2.BASE);

// -------------------------------------------------------------------------- //

let success = 0;
let fail = 0;

// -------------------------------------------------------------------------- //

function mutatePage(filename, callback) {
  const pathname = path.join(__dirname, 'out/', filename);
  loadFile(pathname).then(buffer => {
    const $ = cheerio.load(buffer.toString());

    // find hrefs to replace
    ;['src', 'href'].forEach(selector => {
      $(`[${selector}]`).each((idx, item) => {
        const { attribs } = item || {};
        const src = attribs[selector]; // could be href or src
        if (!src) return;

        const attribFilename = filenameFromHref(src, true);
        const attribFilenameExt = extensionFromHref(attribFilename);
        const isHTML = /html?/.test(attribFilenameExt);
        let checkBasePath = PATHS.OUT.ASSETS;

        // if .html file, then check in the base folder instead
        if (isHTML) {
          checkBasePath = PATHS.OUT.BASE;
        }

        const checkFullPath = path.join(checkBasePath, attribFilename);
        const exists = fs.existsSync(checkFullPath);

        exists ? success++ : fail++;

        // if (!exists) {
        //   console.log(attribFilename)
        //   console.log('  ', attribFilenameExt)
        //   console.log('  ', checkFullPath);
        //   console.log('  ', src, '\n');
        // }

        if (exists) {
          const newSrc = path.join(isHTML ? '' : 'assets', attribFilename);
          item.attribs[selector] = newSrc;
        } else {
          delete item.attribs[selector];
          fs.appendFileSync(PATHS.ASSETS_DB, `${src}\n`, 'utf8');
        }
      });

    });
    
    console.log('success', success, '\nfail', fail);

    // write out new html file
    const newPathname = path.join(PATHS.OUT2.BASE, filename)
    fs.writeFile(newPathname, $.html(), 'utf8', err => {
      if (err) console.log('  + error writing file', htmlOutPath, err);
      else console.log('  + saved');

      callback();
    });

  }).catch(err => console.log('could not load file:', pathname, err));
}

// -------------------------------------------------------------------------- //

const queue = async.queue(mutatePage, 1);
queue.error(err => console.log('queue error:', err));
queue.drain(() => console.log('\nAll items have been processed'));

// queue.push('womeninafrica.html');

fs.readdir(PATHS.OUT.BASE, (err, files) => {
  if (err) {
    console.log('Could not read directory', err);
    return;
  }

  const addToQueue = files.filter(file => /html?$/.test(file));
  console.log('Adding', addToQueue.length, 'files to queue for processing');
  queue.push(addToQueue);
})