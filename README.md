# Universal Ripper Scripts

## How to Use
* `yarn clean`
* edit constants.js
* edit .env and add the base url of the site you are ripping. Helps with link resolution
* `yarn crawl` to spider and download all html files
* `yarn find` searches for resources in the html files
* `yarn download` downloads assets
* `yarn mutate` modifies HTML files (into new folder) to reference offlined files
* `yarn process-assets` copies/minifies assets to be smaller. Moves into the final output folder (out2)

