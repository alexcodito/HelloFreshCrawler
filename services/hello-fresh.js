const axios = require("axios");
const fs = require("fs");
const { colours } = require("../utils/colours");
const { splitArrayBatch } = require("../utils/array");

const siteUrl = "https://www.hellofresh.com";
const apiUrl = "https://gw.hellofresh.com/api/";
const searchEndpoint = "recipes/search?";
let recipeCardSaveDirectory = "./recipe-card-pdfs";

const apiSearchParams = {
  offset: 0,
  limit: 500,
  product: ["classic-box", "veggie-box", "meal-plan", "family-box"],
  locale: "en-US",
  country: "us",
  ["max-prep-time"]: 60,
};

const fetchApiToken = async function () {
  try {
    // Load the regular site to grab an access token
    const siteResponse = await axios.get(siteUrl);
    const responseData = siteResponse.data;

    // Use a regular expression to extract the access token
    const regex = /"access_token":"([^"]+)"/;
    const match = responseData.match(regex);

    if (match) {
      const accessToken = match[1];
      return accessToken;
    } else {
      throw new Error("Access token not found in the site response.");
    }
  } catch (error) {
    throw new Error("Failed to fetch the API token: " + error.message);
  }
};
const constructSearchUrl = function () {
  let target = `${apiUrl}${searchEndpoint}`;

  for (let [key, value] of Object.entries(apiSearchParams)) {
    if (Array.isArray(value)) {
      target += `${key}=${value.join("|")}&`;
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
  const maxRetryAttempts = 3; // Maximum number of retry attempts

  // Function to generate a random delay between 5 to 20 seconds
  function getRandomDelay() {
    return Math.floor(Math.random() * 6 + 1) * 1000;
  }

  if (Array.isArray(items) && items.length > 0) {
    // Grep items with card links
    const itemsWithLinks = items.filter((item) => item.cardLink);
    // Split into batch for concurrent downloading
    const batches = splitArrayBatch(itemsWithLinks, parallelDownloads);

    for (let [index, batch] of batches.entries()) {
      const downloadPromises = batch.map((item) => {
        // Function to perform the download with retries
        const performDownloadWithRetry = async (retryCount) => {
          try {
            const res = await axios.get(item.cardLink, {
              responseType: "arraybuffer",
              headers: { Accept: "application/pdf" },
            });

            downloadedCards.push({
              name: item.name,
              data: res.data,
            });
          } catch (err) {
            if (retryCount < maxRetryAttempts && err.code === "ECONNRESET") {
              // Retry the download after a delay
              const retryDelay = getRandomDelay();
              console.log(
                `- Retrying download after ${
                  retryDelay / 1000
                } seconds (Attempt ${retryCount + 1})`
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
              await performDownloadWithRetry(retryCount + 1);
            } else {
              console.log(err);
            }
          }
        };

        return performDownloadWithRetry(0); // Start with the first download attempt
      });

      await Promise.all(downloadPromises);

      console.log(
        `- Batch ${index + 1} of recipe card downloads completed. Saving ${
          downloadedCards.length
        } PDF files.`
      );

      // Add a random delay before the next batch
      if (index < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    console.log(
      `- Recipe card downloads completed. Saving ${downloadedCards.length} PDF files.`
    );

    downloadedCards.forEach((item) => {
      const filePath = `${recipeCardSaveDirectory}/${item.name}.pdf`;

      // Only save if the file does not exist
      if (!fs.existsSync(filePath)) {
        fs.writeFile(filePath, item.data, (err) => {
          if (err) throw err;
        });
      }
    });

    console.log("- Save completed");
  }
};

const crawl = async function (settings) {
  if (settings.locale) {
    if (settings.locale === "DE") {
      apiSearchParams.locale = `de-${settings.locale.toUpperCase()}`;
    } else if (settings.locale === "FR") {
      apiSearchParams.locale = `fr-${settings.locale.toUpperCase()}`; // Gestion de la locale FR
    } else {
      apiSearchParams.locale = `en-${settings.locale.toUpperCase()}`;
    }

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
    throw new Error("API bearer token could not be extracted.");
  }

  console.log("API Token acquired. Searching recipes.");

  // Initiate search
  let searchResponse = await performSearch(apiToken);

  if (searchResponse.status !== 200) {
    throw new Error(
      `Search responded with status ${searchResponse.status}. Aborting.`
    );
  }

  if (searchResponse.data.length < 1) {
    throw new Error("No results have been retrieved.");
  }

  let currentPage = 1;
  let pages = Math.round(
    (searchResponse.data.total - searchResponse.data.skip) /
    apiSearchParams.limit
  );

  console.log(
    `Initiating download of ${searchResponse.data.total} recipes over ${pages} batches.`
  );

  while (currentPage <= pages) {
    console.log(
      colours.fg.green,
      `Batch [${currentPage}/${pages}] Downloading ${searchResponse.data.items.length} search results:`,
      colours.reset
    );

    await downloadRecipeCards(searchResponse.data.items);

    apiSearchParams.offset += apiSearchParams.limit;

    searchResponse = await performSearch(apiToken);

    if (searchResponse.status !== 200) {
      throw new Error(
        `- Search responded with status ${searchResponse.status}. Aborting.`
      );
    }

    if (searchResponse.data.length < 1) {
      console.log("- No results have been retrieved.");
      return;
    }

    currentPage++;
  }
};


module.exports = { crawl };
