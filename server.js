const yargs = require('yargs');

const siteUrl = 'https://www.hellofresh.com';
const apiUrl = 'https://gw.hellofresh.com/api/';
const searchEndpoint = 'recipes/search?'; 

const apiSearchParams = {
    offset: 0,
    limit: 250,
    product: ['classic-box', 'veggie-box', 'meal-plan', 'family-box'],
    locale: 'en-US', 
    country: 'us', 
    ['max-prep-time']: 60
}

argv = yargs
        .usage('Usage: $0 [options]')
        .example('$0 -l GB', 'Perform crawling on GB domain')
        .option('locale', {
            alias: 'l',
            describe: 'Locale to perform crawling on.',
            choices: ['US', 'GB'],
            default: 'US',
            nargs: 1
        })
        .argv;

console.log(`Performing crawl on HelloFresh using ${argv.locale} locale`);

apiSearchParams.locale = `en-${argv.locale.toUpperCase()}`;
apiSearchParams.country = argv.locale.toLowerCase();


console.log('Press any key to exit');
process.stdin.resume();
process.stdin.on('data', process.exit.bind(process, 0));