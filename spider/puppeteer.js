const puppeteer = require('puppeteer');
const fs = require('fs');

// async function getBrowser() {
//   return await puppeteer.launch({headless: false});
// }

// async function htmlFromDOM(url, browser) {
//   const page = await browser.newPage();
//   await page.setViewport({
//     width: 1280,
//     height: 900,
//     deviceScaleFactor: 1,
//   });
  
//   await page.goto(url, { waitUntil: 'networkidle0' });
//   const html = await page.content(); // serialized HTML of page DOM.
  
//   await browser.close();
//   return html;
// }

// async function main() {
//   const browser = await getBrowser();
//   const html = await htmlFromDOM('https://en.unesco.org/womeninafrica/', browser);
//   fs.writeFileSync('./index.html', html);
// }

// main();

class PuppetMaster {
  constructor() {
    this.browser = null;
    this.initialized = false;
    this.nonce = Math.random() * 1000 |0;
  }

  async init() {
    if (this.initialized) {
      console.log('already initialized')
      return;
    }
    this.browser = await puppeteer.launch({ headless: false });
    this.initialized = true;
    console.log('now initialized')
  }

  async get(url) {
    console.log('nonce:', this.nonce);
    await this.init();

    const page = await this.browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
    });

    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content(); // serialized HTML of page DOM.

    await page.close();
    console.log('returning')
    return new Promise(resolve => resolve(html));
  }

  async close() {
    this.browser.close();
  }
}

module.exports = {
  PuppetMaster,
  puppet: new PuppetMaster(),
}
