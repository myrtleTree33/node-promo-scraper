import scrapeBurppleScheduled from './burppleScraper';
import scrapeChopeScheduled from './chopeScraper';
import logger from '../logger';

const startScraping = () => {
  logger.info('== Starting scrapers ==');
  scrapeBurppleScheduled('1 2 */1 * *');
  scrapeChopeScheduled('1 2 */1 * *');
};

export default startScraping;
