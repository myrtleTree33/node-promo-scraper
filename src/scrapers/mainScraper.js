import scrapeBurppleScheduled from './burppleScraper';

const startScraping = () => {
  scrapeBurppleScheduled('1 * */1 * *');
};

export default startScraping;
