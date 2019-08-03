import stringSimilarity from 'string-similarity';
import _ from 'lodash';
import { CronJob } from 'cron';
import { getDistance } from 'geolib';

import AmexOutlet from '../models/AmexOutlet';
import logger from '../logger';
import ChopeOutlet from '../models/ChopeOutlet';
import BurppleOutlet from '../models/BurppleOutlet';
import CitiOutlet from '../models/CitiOutlet';
import MatchedOutlet from '../models/MatchedOutlet';

const convArrToLocObj = location => {
  try {
    const { coordinates } = location;
    const [lng, lat] = coordinates;
    return { longitude: lng, latitude: lat };
  } catch (e) {}
  return null;
};

const isSimilar = (x, y) => {
  const SIMILARITY_THRESHOLD = 0.9;
  const MAX_DIST_METERS = 50;

  const [xLoc, yLoc] = [convArrToLocObj(x.location), convArrToLocObj(y.location)];

  // In the case of both coordinates are avail
  if (xLoc && yLoc) {
    // less than 50 metres
    if (getDistance(xLoc, yLoc) <= MAX_DIST_METERS) {
      const score = stringSimilarity.compareTwoStrings(x.title, y.title);
      return score >= SIMILARITY_THRESHOLD;
    }
    return false;
  }

  // Else simply rely on string similarity
  const score = stringSimilarity.compareTwoStrings(x.title, y.title);
  return score >= SIMILARITY_THRESHOLD;
};

const processPromo = providerOutlet => {
  const { outletId, link, provider } = providerOutlet;

  // For Chope
  if (provider === 'chope') {
    const { minPrice, maxPrice, maxDiscount, availableOffers } = providerOutlet;
    const hasPromo = availableOffers && availableOffers.length > 0;
    const promoInfo = { minPrice, maxPrice, maxDiscount };
    return { hasPromo, promoInfo };

    // For Citi
  } else if (provider === 'citi') {
    const {
      details,
      discountPercent,
      returnVoucherAmount,
      hasFreeStuff,
      isOneForOne
    } = providerOutlet;
    const hasPromo = Boolean(details);
    const promoInfo = { details, discountPercent, returnVoucherAmount, hasFreeStuff, isOneForOne };
    return { hasPromo, promoInfo };

    // For Burpple
  } else if (provider === 'burpple') {
    const { hasBeyond, price } = providerOutlet;
    const hasPromo = hasBeyond;
    const promoInfo = { hasBeyond, price };
    return { hasPromo, promoInfo };

    // For Amex
  } else if (provider === 'amex') {
    const { offers } = providerOutlet;
    const hasPromo = Boolean(offers && offers.length > 0);
    const discounts = offers.map(o => o.discount);
    const promoInfo = {
      minDiscount: _.min(discounts),
      maxDiscount: _.max(discounts)
    };
    return { hasPromo, promoInfo };
  }
};

const matchOutlets = outlets => {
  const numRecords = outlets.length;
  logger.info(`[Matcher] Processing ${numRecords} records.`);

  for (let i = 0; i < outlets.length; i++) {
    if (i % 250 === 0) {
      const progressPercent = (i / numRecords) * 100;
      logger.info(`[Matcher] Matching progress=${progressPercent}%`);
    }

    for (let j = 0; j < outlets.length; j++) {
      const currOutletArr = outlets[i];

      if (!currOutletArr) {
        break;
      }

      const currOutlet = currOutletArr[0];
      const comparedOutletsArr = outlets[j];

      // ignore if same or empty
      if (!comparedOutletsArr || i === j) {
        continue;
      }

      const comparedOutlet = comparedOutletsArr[0];
      if (isSimilar(currOutlet, comparedOutlet)) {
        currOutletArr.push(comparedOutlet);
        outlets[j] = null;
      }
    }
  }

  const outletsFinal = outlets.filter(Boolean);
  logger.info(`[Matcher] Done matching content.  numUniqueOutlets=${outlets.length}`);
  return outletsFinal;
};

const reduceOutlets = async () => {
  let amexOutlets = await AmexOutlet.find({})
    .select('outletId title location imgUrls link address offers')
    .lean();
  amexOutlets = amexOutlets.map(o => ({
    ...o,
    provider: 'amex'
  }));

  let chopeOutlets = await ChopeOutlet.find({})
    .select(
      'outletId title location imgUrls link address minPrice maxPrice maxDiscount availableOffers'
    )
    .lean();
  chopeOutlets = chopeOutlets.map(o => ({
    ...o,
    provider: 'chope'
  }));

  let burppleOutlets = await BurppleOutlet.find({})
    .select('outletId title location imgUrls link address hasBeyond price')
    .lean();
  burppleOutlets = burppleOutlets.map(o => ({
    ...o,
    provider: 'burpple'
  }));

  let citiOutlets = await CitiOutlet.find({})
    .select(
      'outletId title location imgUrls link address details discountPercent returnVoucherAmount hasFreeStuff isOneForOne'
    )
    .lean();
  citiOutlets = citiOutlets.map(o => ({
    ...o,
    provider: 'citi'
  }));

  let outlets = [...amexOutlets, ...chopeOutlets, ...burppleOutlets, ...citiOutlets];
  outlets = outlets.map(o => [o]);
  // outlets = outlets.splice(0, 1000);

  // Create unique outlets
  outlets = matchOutlets(outlets);

  // outlets = outlets.filter(o => o.length > 1);
  logger.info('[Matcher] Proceeding to chunk outlets..');

  // Progressively match each outlet to DB entry
  const chunks = _.chunk(outlets, 50);
  for (let i = 0; i < chunks.length; i++) {
    logger.info(`[Matcher] Processing chunk ${i}..`);
    (async () => {
      const currOutlets = chunks[i];
      const upsertPromises = currOutlets.map(outletArr => {
        const titles = _.uniq(outletArr.map(o => o.title));
        const location = (outletArr.find(o => o.location) || {}).location;
        const address = (outletArr.find(o => o.address) || {}).address;
        const telephone = (outletArr.find(o => !o.telephone) || {}).telephone;

        let imgUrls = outletArr.map(o => o.imgUrls);
        imgUrls = [].concat.apply([], imgUrls);
        const providers = outletArr.map(o => {
          const { outletId, link, provider } = o;

          // Add switching for promo here per provider;
          // Adds the fields hasPromo and promoInfo
          const additionalInfo = processPromo(o);

          return { outletId, link, provider, ...additionalInfo };
        });

        // This field is across all providers
        const hasPromo = providers.reduce((hasPromos, p) => hasPromos || p.hasPromo, false);

        return MatchedOutlet.findOneAndUpdate(
          {
            titles: { $in: titles }
          },
          {
            titles,
            location,
            address,
            telephone,
            imgUrls,
            hasPromo,
            providers,
            lastSeen: new Date()
          },
          {
            upsert: true,
            unique: true,
            setDefaultsOnInsert: true
          }
        );
      });

      // Upsert all new entries
      await Promise.all(upsertPromises);
      logger.info(
        `[Matcher] Chunk ${i + 1}/${chunks.length} Upserted ${
          upsertPromises.length
        } matched outlets.`
      );
    })();
  }

  logger.info(`[Matcher] Upserted ${outlets.length} matched outlets.`);

  // Remove all entries that were stale / not updated in the last 20 mins
  const staleRecords = await MatchedOutlet.deleteMany({
    lastSeen: { $lt: new Date(Date.now() - 20 * 60 * 1000) }
  });
  logger.info(`[Matcher] Deleted ${staleRecords.deletedCount} stale records.`);
};

const runReduceOutlets = () =>
  (async () => {
    try {
      logger.info(`[Matcher] Starting scheduled outlet matching job..`);
      await reduceOutlets();
    } catch (e) {
      logger.error(e.message);
    }
  })();

const runReduceOutletsScheduled = interval => {
  const job = new CronJob(interval, () => runReduceOutlets(), null, true, 'Asia/Singapore');
  job.start();
  runReduceOutlets(); // uncomment in debug mode
};

export default runReduceOutletsScheduled;
