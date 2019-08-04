const url = require('url');
const path = require('path');

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

module.exports = {
  ROOT,
  HOSTNAME,
  WAIT_INTERVAL,
  PATHS,
};
