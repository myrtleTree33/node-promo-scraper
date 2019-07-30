import stringSimilarity from 'string-similarity';

import AmexOutlet from '../models/AmexOutlet';
import logger from '../logger';
import ChopeOutlet from '../models/ChopeOutlet';
import BurppleOutlet from '../models/BurppleOutlet';

const similarity = (x, y) => {
  const score = stringSimilarity.compareTwoStrings(x.title, y.title);
  return score >= 0.9;
};

const reduceOutlets = async () => {
  let amexOutlets = await AmexOutlet.find({})
    .select('outletId title location')
    .lean();
  amexOutlets = amexOutlets.map(o => ({
    ...o,
    provider: 'amex'
  }));

  let chopeOutlets = await ChopeOutlet.find({})
    .select('outletId title location')
    .lean();
  chopeOutlets = chopeOutlets.map(o => ({
    ...o,
    provider: 'chope'
  }));

  let burppleOutlets = await BurppleOutlet.find({})
    .select('outletId title location')
    .lean();
  burppleOutlets = burppleOutlets.map(o => ({
    ...o,
    provider: 'burpple'
  }));

  let outlets = [...amexOutlets, ...chopeOutlets, ...burppleOutlets];
  outlets = outlets.map(o => [o]);
  outlets = outlets.splice(0, 1000);

  for (let i = 0; i < outlets.length; i++) {
    if (i % 500 === 0) {
      logger.info(`running iteration ${i}`);
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
  outlets = outlets.filter(o => o.length > 1);
  logger.info(`Done matching content.  numUniqueOutlets=${outlets.length}`);
  console.log(outlets);
};

const runReduceOutlets = async () => {
  try {
    await reduceOutlets();
  } catch (e) {
    logger.error(e.message);
  }
};

export default runReduceOutlets;
