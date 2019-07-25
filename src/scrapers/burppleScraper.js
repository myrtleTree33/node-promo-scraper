import BurppleParser from 'node-scraper-burpple';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import BurppleOutlet from '../models/BurppleOutlet';

const burppleWorker = asyncWorker({
  initialState: {
    numEntries: undefined,
    page: 1
  },
  maxTimeout: 1000,
  onTriggered: async (prevState = {}) => {
    try {
      const { page } = prevState;

      const entries = await BurppleParser.scrapePage({
        page,
        priceMin: 0,
        priceMax: 90
      });

      if (page % 5 === 0) {
        logger.info(`Scraping page ${page}..`);
      }

      const outletPromises = entries.map(entry => {
        const {
          id,
          imgUrls,
          title,
          numReviews,
          price,
          categories,
          hasBeyond,
          genericLoc,
          link
        } = entry;
        return BurppleOutlet.update(
          { outletId: id },
          {
            outletId: id,
            dateAdded: Date.now(),
            title,
            imgUrls,
            numReviews,
            price,
            categories,
            hasBeyond,
            genericLoc,
            link
          },
          {
            upsert: true,
            new: true
          }
        );
      });

      await Promise.all(outletPromises);

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

const burppleWorkerSingle = asyncWorker({
  initialState: {
    toContinue: true
  },
  maxTimeout: 1000,
  onTriggered: async () => {
    let outletId = null;
    try {
      const outlet = await BurppleOutlet.findOne({ location: null });

      if (!outlet) {
        return {
          toContinue: false
        };
      }

      outletId = outlet.outletId;

      logger.info(`Updating ${outletId}`);

      const entry = await BurppleParser.scrapeEntry({
        url: outlet.link
      });

      const { address, location } = entry;

      await BurppleOutlet.update(
        { outletId },
        {
          address,
          location: {
            type: 'Point',
            coordinates: location
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      return {
        toContinue: true
      };
    } catch (e) {
      logger.error(e);
      logger.error('During scraping a single entry, encountered an exception.');

      if (!outletId) {
        logger.error('Due to error and unknown outletId, routine will now terminate.');
        return;
      }

      // Update coords if outlet found
      // but error parsing for later review.
      logger.info(`Updating coords of ${outletId} to [0,0] for review.`);
      await BurppleOutlet.update(
        { outletId },
        {
          location: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      return {
        toContinue: true
      };
    }
  },
  toProceed: async (prevState = {}) => {
    const { toContinue } = prevState;
    return toContinue;
  }
});

const scrapeBurpple = () => {
  logger.info('Started Burpple scraping..');
  burppleWorker();
  burppleWorkerSingle();
};

const scrapeBurppleScheduled = interval => {
  const job = new CronJob(interval, () => scrapeBurpple(), null, true, 'America/Los_Angeles');
  job.start();
  logger.info('Scheduled Burpple scraping.');

  scrapeBurpple();
};

export default scrapeBurppleScheduled;
