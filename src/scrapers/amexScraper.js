import crypto from 'crypto';

import { CronJob } from 'cron';
import AmexParser from 'node-scraper-amex';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import AmexOutlet from '../models/AmexOutlet';
import getLngLat from '../utils/locUtils';

const createHash = data =>
  crypto
    .createHash('md5')
    .update(data)
    .digest('hex');

const scrapePageWorker = asyncWorker({
  initialState: {
    numEntries: undefined
  },
  maxTimeout: 1000,
  onTriggered: async (prevState = {}) => {
    try {
      // Fill in page scraper code here
      const entries = await AmexParser.scrapeOffers();

      logger.info(`[Amex] Scraping Amex offers..`);

      // Map entries to DB here
      const outletPromises = entries.map(async entry => {
        const { title, address, telephone, website, imgUrl, offers = [] } = entry;

        if (!title) {
          return Promise.resolve();
        }
        const outletId = createHash(title);
        const resolvedLoc = await getLngLat(address);

        if (!resolvedLoc) {
          return Promise.resolve();
        }

        return AmexOutlet.update(
          { outletId },
          {
            outletId,
            title,
            address,
            telephone,
            link: website,
            imgUrls: [imgUrl],
            offers,
            location: {
              type: 'Point',
              coordinates: resolvedLoc
            }
          },
          {
            setDefaultsOnInsert: true,
            upsert: true,
            new: true
          }
        );
      });

      await Promise.all(outletPromises);

      return { ...prevState, numEntries: entries.length };
    } catch (e) {
      logger.error(e.message);
      logger.error(
        '[Amex] During page scraping, encountered an exception.  Routine will now terminate.'
      );
    }
  },
  toProceed: async (prevState = {}) => {
    logger.info('[Amex] Done scraping Amex offers.');
    return false;
  }
});

const scrapeSite = () => {
  logger.info('[Amex] Started scraping..');
  scrapePageWorker();
};

const scrapeAmexScheduled = interval => {
  const job = new CronJob(interval, () => scrapeSite(), null, true, 'America/Los_Angeles');
  job.start();
  logger.info('[Amex] Scheduled scraping.');

  scrapeSite();
};

export default scrapeAmexScheduled;
