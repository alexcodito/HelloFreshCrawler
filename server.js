const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const siteUrl = 'https://www.hellofresh.com';
const apiUrl = 'https://gw.hellofresh.com/api/';
const searchEndpoint = 'recipes/search?'; 

const apiSearchParams = {
    offset: 1,
    limit: 100,
    product: ['classic-box', 'veggie-box', 'meal-plan', 'family-box'],
    locale: 'en-US',
    country: 'us',
    ['max-prep-time']: 60
}

const constructSearchUrl = function () {
    let target = `${apiUrl}${searchEndpoint}`;
    
    for (let [key, value] of Object.entries(apiSearchParams)) {
        if(Array.isArray(value)){
            target += `${key}=${value.join('|')}&`;
        } else {
            target += `${key}=${value}&`;
        }
    }

    return target.slice(0, target.length - 1);
};

// Load regular site to gain an access token
axios.get(siteUrl)
    .then(async (siteResponse) => {

        // Extract bearer token from the raw HTML.
        // Dirtier than desirable, but it is hardcoded within an attribute-less script node.
        const accessTokenStringIndex = siteResponse.data.indexOf('"accessToken":"') + 15;
        let bearerToken = siteResponse.data.substr(accessTokenStringIndex);
        bearerToken = bearerToken.substr(0, bearerToken.indexOf('"'));

        if(!bearerToken){
            throw new Error("API bearer token could not be extracted");
        }

        // Initiate search
        const searchUrl = constructSearchUrl();
        const searchResponse = await axios.get(searchUrl, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        })
        .catch(err => { throw err });

        if(searchResponse.status !== 200){
           throw new Error(`Search responded with ${searchResponse.status}. Aborting.`) 
        }

        if(searchResponse.data.length < 1) {
            console.log('No results have been retrieved');
            return;
        }

        console.log(`Iterating ${searchResponse.data.items.length} search results:`);
        console.log('- Count:', searchResponse.data.count);
        console.log('- Skip:', searchResponse.data.skip);
        console.log('- Take:', searchResponse.data.take);
        console.log('- Total:', searchResponse.data.total);

        // Todo: Parallelize via Promise.all()
        for(const [index, item] of searchResponse.data.items.entries()){
            if(!item.cardLink){
                console.log(`[${index}] Missing recipe card.`)
                continue;
            }

            const recipeCardResponse = await axios.get(item.cardLink)
            .catch(err => { throw err });

            if(!recipeCardResponse.data){
                console.log(`[${index}] Recipe card unavailable.`)
                continue;
            }

            fs.writeFile(`./recipe-cards/${item.name}.pdf`, recipeCardResponse.data, (err) => {
                if(err) throw err;
                console.log(`[${index}] Saved recipe card '${item.name}'.`);
            });            
        }
    })
    .catch(console.error);
    
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Press any key to exit... ', (answer) => {
    rl.close();
});