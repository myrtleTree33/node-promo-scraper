// import BurppleParser from 'node-scraper-burpple';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
// import BurppleOutlet from '../models/BurppleOutlet';

const scrapePageWorker = asyncWorker({
  initialState: {
    numEntries: undefined,
    page: 1
  },
  maxTimeout: 1000,
  onTriggered: async (prevState = {}) => {
    try {
      const { page } = prevState;

      // Fill in page scraper code here
      const entries = [];

      if (page % 5 === 0) {
        logger.info(`Scraping page ${page}..`);
      }

      // Map entries to DB here
      // const outletPromises = entries.map(entry => {
      //   const {} = entry;
      //   return BurppleOutlet.update(
      //     {},
      //     {},
      //     {
      //       upsert: true,
      //       new: true
      //     }
      //   );
      // });

      // await Promise.all(outletPromises);

      return { ...prevState, page: page + 1, numEntries: entries.length };
    } catch (e) {
      logger.error(e);
      logger.error('During page scraping, encountered an exception.  Routine will now terminate.');
    }
  },
  toProceed: async (prevState = {}) => {
    const { numEntries } = prevState;
    return numEntries > 0;
  }
});

const scrapeSite = () => {
  logger.info('Started Burpple scraping..');
  scrapePageWorker();
};

const scrapeCustomScheduled = interval => {
  const job = new CronJob(interval, () => scrapeSite(), null, true, 'America/Los_Angeles');
  job.start();
  logger.info('Scheduled Custom scraping.');

  scrapeSite();
};

export default scrapeCustomScheduled;
