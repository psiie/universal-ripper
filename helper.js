const url = require('url');
const sanitizeFilename = require("sanitize-filename");

function hasher(str) {
  var hash = 5381,
      i    = str.length;

  while(i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hash >>> 0;
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

function filenameFromHref(href, makeShort = false) {
  const ext = extensionFromHref(href);
  const urlObject = url.parse(href);
  let path = urlObject.pathname;
  // console.log('path:', urlObject)
  if (!href || !path) return '';

  if (makeShort) path = path.split('/').slice(-1)[0];
  if (path[0] === '/') path = path.slice(1); // if first char is /, then remove
  if (path[path.length - 1] === '/') { // if last char is /, then remove
    path = path.slice(0, -1);
    path = path + '.html';
  }
    
  // if (ext === 'html' || ext === 'htm') path = path + '.html'; // if no .html ending, add it
  path = path.replace(/\//g, '_'); // replace slashes

  // the returned path must not have special chars. replace.
  return sanitizeFilename(path);
}

module.exports = {
  hasher,
  extensionFromHref,
  filenameFromHref,
};
