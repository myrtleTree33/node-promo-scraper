import stringSimilarity from 'string-similarity';
import _ from 'lodash';
import { CronJob } from 'cron';

import AmexOutlet from '../models/AmexOutlet';
import logger from '../logger';
import ChopeOutlet from '../models/ChopeOutlet';
import BurppleOutlet from '../models/BurppleOutlet';
import MatchedOutlet from '../models/MatchedOutlet';

const similarity = (x, y) => {
  const score = stringSimilarity.compareTwoStrings(x.title, y.title);
  return score >= 0.9;
};

const matchOutlets = async outlets => {
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
      if (similarity(currOutlet, comparedOutlet)) {
        currOutletArr.push(comparedOutlet);
        outlets[j] = null;
      }
    }
  }

  outlets = outlets.filter(Boolean);
  logger.info(`[Matcher] Done matching content.  numUniqueOutlets=${outlets.length}`);
  return Promise.resolve(outlets);
};

const reduceOutlets = async () => {
  let amexOutlets = await AmexOutlet.find({})
    .select('outletId title location imgUrls link address')
    .lean();
  amexOutlets = amexOutlets.map(o => ({
    ...o,
    provider: 'amex'
  }));

  let chopeOutlets = await ChopeOutlet.find({})
    .select('outletId title location imgUrls link address')
    .lean();
  chopeOutlets = chopeOutlets.map(o => ({
    ...o,
    provider: 'chope'
  }));

  let burppleOutlets = await BurppleOutlet.find({})
    .select('outletId title location imgUrls link address')
    .lean();
  burppleOutlets = burppleOutlets.map(o => ({
    ...o,
    provider: 'burpple'
  }));

  let outlets = [...amexOutlets, ...chopeOutlets, ...burppleOutlets];
  outlets = outlets.map(o => [o]);
  // outlets = outlets.splice(0, 1000);

  // Create unique outlets
  outlets = await matchOutlets(outlets);

  // outlets = outlets.filter(o => o.length > 1);

  // Match each outlet to DB entry
  const upsertPromises = outlets.map(outletArr => {
    const titles = _.uniq(outletArr.map(o => o.title));
    const location = (outletArr.find(o => o.location) || {}).location;
    const address = (outletArr.find(o => o.address) || {}).address;
    const telephone = (outletArr.find(o => !o.telephone) || {}).telephone;

    let imgUrls = outletArr.map(o => o.imgUrls);
    imgUrls = [].concat.apply([], imgUrls);
    const providers = outletArr.map(o => {
      const { outletId, link, provider } = o;
      return { outletId, link, hasPromo: false, provider };
    });

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
  logger.info(`[Matcher] Upserted ${upsertPromises.length} matched outlets.`);

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
  runReduceOutlets();
};

export default runReduceOutletsScheduled;
