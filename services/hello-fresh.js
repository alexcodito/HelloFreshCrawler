const axios = require('axios');
const fs = require('fs');

const { splitArrayBatch } = require('../utils/array');

const siteUrl = 'https://www.hellofresh.com';
const apiUrl = 'https://gw.hellofresh.com/api/';
const searchEndpoint = 'recipes/search?';
let recipeCardSaveDirectory = './recipe-card-pdfs';

const apiSearchParams = {
  offset: 0,
  limit: 250,
  product: ['classic-box', 'veggie-box', 'meal-plan', 'family-box'],
  locale: 'en-US',
  country: 'us',
  ['max-prep-time']: 60,
};

const fetchApiToken = async function () {
  // Load regular site to grab an access token
  const siteResponse = await axios.get(siteUrl);

  // Extract bearer token from the raw HTML. This is dirtier than desirable, but the
  // token is hardcoded within an attribute-less script node.
  const accessTokenStringIndex = siteResponse.data.indexOf('"accessToken":"') + 15;
  let bearerToken = siteResponse.data.substr(accessTokenStringIndex);
  bearerToken = bearerToken.substr(0, bearerToken.indexOf('"'));

  return bearerToken;
};

const constructSearchUrl = function () {
  let target = `${apiUrl}${searchEndpoint}`;

  for (let [key, value] of Object.entries(apiSearchParams)) {
    if (Array.isArray(value)) {
      target += `${key}=${value.join('|')}&`;
    } else {
      target += `${key}=${value}&`;
    }
  }

  return target.slice(0, target.length - 1);
};

const performSearch = async function (bearerToken) {
  const searchUrl = constructSearchUrl();
  return axios.get(searchUrl, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });
};

const downloadRecipeCards = async function (items) {
  const downloadedCards = [];
  const parallelDownloads = 10;

  if (Array.isArray(items) && items.length > 0) {
    // Grep items with card links
    const itemsWithLinks = items.filter((item) => item.cardLink);
    // Split into batch for concurrent downloading
    const batches = splitArrayBatch(itemsWithLinks, parallelDownloads);

    for (let [index, batch] of batches.entries()) {
      const downloadPromises = batch.map((item) => {
        return axios
          .get(item.cardLink, { responseType: 'arraybuffer', headers: { Accept: 'application/pdf' } })
          .then((res) => {
            downloadedCards.push({
              name: item.name,
              data: res.data,
            });
          })
          .catch((err) => {
            console.log(err);
          });
      });

      await Promise.all(downloadPromises).catch((err) => {
        console.log(err);
      });
    }

    console.log(`- Recipe card downloads completed. Saving ${downloadedCards.length} PDF files.`);

    // Save without overwriting existing files.
    downloadedCards.forEach((item) => {
      fs.writeFile(
        `${recipeCardSaveDirectory}/${item.name}.pdf`,
        item.data,
        {
          flag: 'wx',
        },
        (err) => {
          if (err && err.code !== 'EEXIST') throw err;
        }
      );
    });

    console.log('- Save completed');
  }
};

const crawl = async function (settings) {
  if (settings.locale) {
    apiSearchParams.locale = `en-${settings.locale.toUpperCase()}`;
    apiSearchParams.country = settings.locale.toLowerCase();
  }

  if (settings.recipeCardSaveDirectory) {
    recipeCardSaveDirectory = settings.recipeCardSaveDirectory;
  }

  fs.mkdir(recipeCardSaveDirectory, { recursive: true }, (err) => {
    if (err) throw err;
  });

  const apiToken = await fetchApiToken();

  if (!apiToken) {
    throw new Error('API bearer token could not be extracted.');
  }

  console.log('API Token acquired. Searching recipes.');

  // Initiate search
  let searchResponse = await performSearch(apiToken);

  if (searchResponse.status !== 200) {
    throw new Error(`Search responded with status ${searchResponse.status}. Aborting.`);
  }

  if (searchResponse.data.length < 1) {
    throw new Error('No results have been retrieved.');
  }

  let currentPage = 1;
  let pages = Math.round((searchResponse.data.total - searchResponse.data.skip) / apiSearchParams.limit);

  console.log(`Initiating download of ${searchResponse.data.total} recipes over ${pages} batches.`);

  while (currentPage <= pages) {
    console.log(`[Batch ${currentPage}/${pages}] Downloading ${searchResponse.data.items.length} search results:`);

    await downloadRecipeCards(searchResponse.data.items);

    apiSearchParams.offset += apiSearchParams.limit;

    searchResponse = await performSearch(apiToken);

    if (searchResponse.status !== 200) {
      throw new Error(`- Search responded with status ${searchResponse.status}. Aborting.`);
    }

    if (searchResponse.data.length < 1) {
      console.log('- No results have been retrieved.');
      return;
    }

    currentPage++;
  }
};

module.exports = { crawl };
