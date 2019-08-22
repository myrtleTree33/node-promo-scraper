import BurppleParser from 'node-scraper-burpple';

import { CronJob } from 'cron';

import logger from '../logger';
import asyncWorker from '../utils/asyncWorker';
import BurppleOutlet from '../models/BurppleOutlet';
import getLngLat from '../utils/locUtils';

const burppleWorker = asyncWorker({
  initialState: {
    numEntries: undefined,
    page: 1
  },
  maxTimeout: 2000,
  onTriggered: async (prevState = {}) => {
    try {
      const { page } = prevState;

      const entries = await BurppleParser.scrapePage({
        page,
        priceMin: 0,
        priceMax: 90
      });

      // Shortcircuit if page is NaN
      if (!page) {
        logger.warn('[Burpple] Short-circuiting scraper as page is NaN.');
        return { ...prevState, page, numEntries: 0 };
      }

      // if (page % 5 === 0) {
      logger.info(`[Burpple] Scraping page ${page}..`);
      // }

      const outletPromises = entries.map(async entry => {
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

        // Use existing latlng if found, so we can
        // be nice.
        let resolvedLatLng = [0, 0];
        const outlet = await BurppleOutlet.findOne({ outletId: id });
        if (outlet) {
          resolvedLatLng = outlet.location.coordinates;
        }

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
            link,
            location: {
              type: 'Point',
              coordinates: resolvedLatLng
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

      return { ...prevState, page: page + 1, numEntries: entries.length };
    } catch (e) {
      logger.error(e.message);
      logger.error(
        '[Burpple] During page scraping, encountered an exception.  Routine will now terminate.'
      );
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
      const outlet = await BurppleOutlet.findOne({
        $or: [
          {
            location: {
              type: 'Point',
              coordinates: [0, 0]
            }
          },
          {
            location: null
          }
        ]
      });

      if (!outlet) {
        return {
          toContinue: false
        };
      }

      outletId = outlet.outletId;

      logger.info(`[Burpple] Updating ${outletId}`);

      console.log(outlet.link);

      const entry = await BurppleParser.scrapeEntry({
        url: outlet.link
      });

      const { address, location } = entry;
      let resolvedLocation = location;
      if (!resolvedLocation && address) {
        resolvedLocation = await getLngLat(address);
      }

      await BurppleOutlet.update(
        { outletId },
        {
          address,
          location: {
            type: 'Point',
            coordinates: resolvedLocation
          }
        },
        {
          setDefaultsOnInsert: true,
          upsert: true,
          new: true
        }
      );

      return {
        toContinue: true
      };
    } catch (e) {
      logger.error('------------------');
      logger.error(e.message);
      logger.error(e.response);
      logger.error('------------------');
      logger.error('[Burpple] During scraping a single entry, encountered an exception.');

      if (!outletId) {
        logger.error('[Burpple] Due to error and unknown outletId, routine will now terminate.');
        return;
      }

      // Update coords if outlet found
      // but error parsing for later review.
      logger.info(`[Burpple] Updating coords of ${outletId} to [0,0] for review.`);
      await BurppleOutlet.update(
        { outletId },
        {
          location: {
            type: 'Point',
            coordinates: [-1, -1]
          }
        },
        {
          setDefaultsOnInsert: true,
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
    if (!toContinue) {
      logger.info('[Burpple] Done scraping individual entries.');
    }
    return toContinue;
  }
});

const scrapeBurpple = () => {
  logger.info('[Burpple] Started Burpple scraping..');
  burppleWorker();
  burppleWorkerSingle();
};

const scrapeBurppleScheduled = interval => {
  const job = new CronJob(interval, () => scrapeBurpple(), null, true, 'Asia/Singapore');
  job.start();
  logger.info('[Burpple] Scheduled Burpple scraping.');

  scrapeBurpple();
};

export default scrapeBurppleScheduled;
