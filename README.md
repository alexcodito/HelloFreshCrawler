# HelloFreshCrawler

Recipe crawler for the popular HelloFresh meal-kit provider.

Supports crawling on US,GB and DE recipe archives that are publically available on www.hellofresh.com.

### Features

- **Multi-Language Support:** HelloFreshCrawler now supports recipes in English (GB), English (US), and German (DE).

- **Automatic Retries:** It attempts to download all recipes it finds with 3 retries, handling connection timeouts and other issues gracefully.

- **Collaboration:** HelloFreshCrawler is based on the [@alexcodito](https://github.com/alexcodito/HelloFreshCrawler) and was further built on to provide enhanced functionality.

  
### Usage

`node index.js HelloFresh -l GB -s ./downloads`

The above will download every PDF recipe card from the specified country's archive into the specified local directory.

<img src="https://github.com/alexcodito/HelloFreshCrawler/blob/master/hello-fresh-crawler.gif" width="886" alt="HelloFresh Crawler Demo"/>

### Notes

- The HelloFresh API provides extensive JSON metadata, including ingredients, nutrition, units and ratings. Storing this in a document database could enable useful applications such as:

  - Generating grocery lists from selected recipes
  - Advanced search criteria (e.g. total cooking time, calories, excluding/including ingredients etc.)
