const path = require('path');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const { extensionFromHref } = require('./utils');

// const p = '/Users/darkenvy/sandbox/universal_ripper/out/open-educational-resources.html';
// const file = fs.readFileSync(path.resolve(p), 'utf8');

// const $ = cheerio.load(file);
// // const selectors = ['link', '[src]', '[href]'];
// const selectors = ['[src]', '[href]'];
// selectors.forEach(selector => {
//   $(selector).each((idx, item) => {
//     const { attribs, name } = item || {};
//     const src = attribs.src || attribs.href; // could be href or src
//     const type = attribs.src ? 'src' : 'href';
//     console.log(name, type, src);
//   });
// });

console.log(extensionFromHref('https://en.unesco.org/womeninafrica/sites/default/files/pdf/Gis%C3%A8le%20Rabesahala_Women%20in%20African%20History_Comic%20strip.pdf'));