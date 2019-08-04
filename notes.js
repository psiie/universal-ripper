// const relativeUrl = _localAssetUrl('assets/', cleanUrl);
// item.attribs[selector] = relativeUrl;


function sanitizeUrl(href) {
  const urlObject = url.parse(href);
  urlObject.protocol = urlObject.protocol || 'http';
  return url.format(urlObject);
}

function _localAssetUrl(basePath, href) {
  const urlObject = url.parse(href);
  const parsedPath = parsePath(urlObject.pathname || '');
  const { base } = parsedPath || {};
  const localPath = path.join(basePath, base);
  return localPath;
}