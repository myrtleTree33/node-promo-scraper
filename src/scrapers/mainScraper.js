import logger from '../logger';

import scrapeBurppleScheduled from './burppleScraper';
import scrapeChopeScheduled from './chopeScraper';
import scrapeAmexScheduled from './amexScraper';
import scrapeCitiScheduled from './citiScraper';

const startScraping = () => {
  logger.info('== Starting scrapers ==');
  scrapeBurppleScheduled('1 1 */1 * *');
  scrapeCitiScheduled('1 1 */1 * *');
  scrapeChopeScheduled('1 2 */1 * *');
  scrapeAmexScheduled('1 2 */1 * *');
};

export default startScraping;
