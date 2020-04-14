# HelloFreshCrawler
Recipe crawler for HelloFresh meal-kit provider 

### Note
- The .co.uk domain requires a CORS proxy to be set-up (e.g. lightweight local solution https://github.com/shalvah/cors-escape)
  - This is due to the fact that the PDF recipe cards are stored on the .com (US) domain.
  - There should be no need to perform crawling on the .co.uk domain, as .com has both the US and GB recipes.