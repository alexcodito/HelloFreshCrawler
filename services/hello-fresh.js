const axios = require('axios');

const siteUrl = 'https://www.hellofresh.com';
const apiUrl = 'https://gw.hellofresh.com/api/';
const searchEndpoint = 'recipes/search?';

const apiSearchParams = {
  offset: 0,
  limit: 250,
  product: ['classic-box', 'veggie-box', 'meal-plan', 'family-box'],
  locale: 'en-US',
  country: 'us',
  ['max-prep-time']: 60,
};

const crawl = async function (settings) {

  if(settings.locale){
    apiSearchParams.locale = `en-${settings.locale.toUpperCase()}`;
    apiSearchParams.country = settings.locale.toLowerCase();
  }
    
  // Load regular site to grab an access token
  const siteResponse = await axios.get(siteUrl);

  // Extract bearer token from the raw HTML. This is dirtier than desirable, but the 
  // token is hardcoded within an attribute-less script node.
  const accessTokenStringIndex = siteResponse.data.indexOf('"accessToken":"') + 15;
  let bearerToken = siteResponse.data.substr(accessTokenStringIndex);
  bearerToken = bearerToken.substr(0, bearerToken.indexOf('"'));

  if (!bearerToken) {
      throw new Error('API bearer token could not be extracted');
  }

  console.log('API Token acquired.');

};

module.exports = { crawl };