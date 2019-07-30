import sleep from 'await-sleep';
import ChopeParser from 'node-scraper-chope';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import ChopeOutlet from '../models/ChopeOutlet';
import getLngLat from '../utils/locUtils';

const scrapePageWorker = asyncWorker({
  initialState: {
    numEntries: undefined,
    page: 1
  },
  maxTimeout: 10000,
  onTriggered: async (prevState = {}) => {
    const { page } = prevState;

    try {
      // Fill in page scraper code here
      const entries = await ChopeParser.scrapeOffers({
        page
      });

      // if (page % 5 === 0) {
      logger.info(`[Chope] Scraping page ${page}..`);
      // }

      // Map entries to DB here
      const outletPromises = entries.map(async entry => {
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

        const resolvedLoc = loc || (await getLngLat(address));

        return ChopeOutlet.update(
          { outletId },
          {
            title,
            link,
            outletId,
            address,
            tags,
            imgUrls: images,
            location: {
              type: 'Point',
              coordinates: resolvedLoc
            },
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
      if (e.message === 'read ECONNRESET') {
        logger.error('[Chope] Timeout on chope.co.  Resting before continuing..');
        await sleep(5000);
        return { ...prevState, page, numEntries: 1 }; // set to 1 to trigger loop
      }

      logger.error(
        '[Chope] During page scraping, encountered an exception.  Routine will now terminate.'
      );
      logger.error(e.message);
    }
  },
  toProceed: async (prevState = {}) => {
    const { numEntries } = prevState;
    const toContinue = numEntries > 0;
    if (!toContinue) {
      logger.info('[Chope] Done scraping chope.co offers.');
    }
    return toContinue;
  }
});

const scrapeSite = () => {
  logger.info('[Chope] Started Chope scraping..');
  scrapePageWorker();
};

const scrapeChopeScheduled = interval => {
  const job = new CronJob(interval, () => scrapeSite(), null, true, 'Asia/Singapore');
  job.start();
  logger.info('[Chope] Scheduled Chope scraping.');

  scrapeSite();
};

export default scrapeChopeScheduled;
