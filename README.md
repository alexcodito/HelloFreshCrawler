# HelloFreshCrawler

Recipe crawler for the popular HelloFresh meal-kit provider

Supports crawling on both the GB and US archives of the www.hellofresh.com website.

### Usage

`node crawler-main.js HelloFresh -l GB -s ./downloads`

The above will download every PDF recipe card from the specified country's archive into the specified directory.

<img src="https://github.com/alexcodito/HelloFreshCrawler/blob/master/hello-fresh-crawler.gif" width="886" alt="HelloFresh Crawler Demo"/>

### Notes

- The .co.uk domain requires a CORS proxy to be set-up (e.g. lightweight local solution https://github.com/shalvah/cors-escape)
  - This is due to the fact that the PDF recipe cards are stored on the .com (US) domain.
  - **With that said**, There should be no need to perform crawling on the .co.uk domain, as .com has both the US and GB recipes.
