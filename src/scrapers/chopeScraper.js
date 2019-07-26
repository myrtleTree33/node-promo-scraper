import ChopeParser from 'node-scraper-chope';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import ChopeOutlet from '../models/ChopeOutlet';

const scrapePageWorker = asyncWorker({
  initialState: {
    numEntries: undefined,
    page: 11
  },
  maxTimeout: 10000,
  onTriggered: async (prevState = {}) => {
    try {
      const { page } = prevState;

      // Fill in page scraper code here
      const entries = await ChopeParser.scrapeOffers({
        page
      });

      // if (page % 5 === 0) {
      logger.info(`Scraping page ${page}..`);
      // }

      // Map entries to DB here
      const outletPromises = entries.map(entry => {
        const {
          title,
          link,
          id: outletId,
          address,
          tags = [],
          images,
          loc,
          maxPax,
          daysExpiry,
          minPrice,
          maxPrice,
          maxDiscount,
          offers = [],
          availableOffers = [],
          tos = []
        } = entry;

        return ChopeOutlet.update(
          { outletId },
          {
            title,
            link,
            outletId,
            address,
            tags,
            images,
            loc,
            maxPax,
            daysExpiry,
            minPrice,
            maxPrice,
            maxDiscount,
            offers,
            availableOffers,
            tos
          },
          {
            setDefaultsOnInsert: true,
            upsert: true,
            new: true
          }
        );
      });

      await Promise.all(outletPromises);

      return { ...prevState, page: page + 1, numEntries: entries.length };
    } catch (e) {
      logger.error(e.message);
      logger.error('During page scraping, encountered an exception.  Routine will now terminate.');
    }
  },
  toProceed: async (prevState = {}) => {
    const { numEntries } = prevState;
    return numEntries > 0;
  }
});

const scrapeSite = () => {
  logger.info('Started Chope scraping..');
  scrapePageWorker();
};

const scrapeChopeScheduled = interval => {
  const job = new CronJob(interval, () => scrapeSite(), null, true, 'America/Los_Angeles');
  job.start();
  logger.info('Scheduled Chope scraping.');

  scrapeSite();
};

export default scrapeChopeScheduled;
