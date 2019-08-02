import sleep from 'await-sleep';
import CitiParser from 'node-scraper-citi';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import CitiOutlet from '../models/CitiOutlet';
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
      const entries = await CitiParser.scrapeOffers({
        page
      });

      // if (page % 5 === 0) {
      logger.info(`[Citi] Scraping page ${page}..`);
      // }

      // Map entries to DB here
      const outletPromises = entries.map(async entry => {
        const {
          title,
          link,
          id: outletId,
          address,
          tags = [],
          imgUrls = [],
          loc,
          telephone,
          details,
          discountPercent,
          returnVoucherAmount,
          hasFreeStuff,
          isOneForOne,
          dateEnd: dateExpiry,
          tos = []
        } = entry;

        // If dead link, skip
        if (!address) {
          return Promise.resolve({});
        }

        const resolvedLoc = loc || (await getLngLat(address));

        return CitiOutlet.update(
          { outletId },
          {
            title,
            link,
            outletId,
            address,
            tags,
            imgUrls,
            location: {
              type: 'Point',
              coordinates: resolvedLoc
            },
            telephone,
            details,
            discountPercent,
            returnVoucherAmount,
            hasFreeStuff,
            isOneForOne,
            dateExpiry,
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
        logger.error('[Citi] Timeout on citiworldprivileges.com.  Resting before continuing..');
        await sleep(1000);
        return { ...prevState, page, numEntries: 1 }; // set to 1 to trigger loop
      }

      logger.error(
        '[Citi] During page scraping, encountered an exception.  Routine will now terminate.'
      );
      logger.error(e.message);
    }
  },
  toProceed: async (prevState = {}) => {
    const { numEntries } = prevState;
    const toContinue = numEntries > 0;
    if (!toContinue) {
      logger.info('[Citi] Done scraping citiworldprivileges.com offers.');
    }
    return toContinue;
  }
});

const scrapeSite = () => {
  logger.info('[Citi] Started Citi scraping..');
  scrapePageWorker();
};

const scrapeCitiScheduled = interval => {
  const job = new CronJob(interval, () => scrapeSite(), null, true, 'Asia/Singapore');
  job.start();
  logger.info('[Citi] Scheduled Citi scraping.');

  scrapeSite();
};

export default scrapeCitiScheduled;
