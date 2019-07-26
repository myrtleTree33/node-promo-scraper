import scrapeBurppleScheduled from './burppleScraper';
import scrapeChopeScheduled from './chopeScraper';

const startScraping = () => {
  // scrapeBurppleScheduled('1 * */1 * *');
  scrapeChopeScheduled('1 * */1 * *');
};

export default startScraping;
