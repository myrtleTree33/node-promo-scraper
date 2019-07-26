import fs from 'fs';
import path from 'path';

import Bktree from 'bktree';
import BurppleOutlet from '../models/BurppleOutlet';
import ChopeOutlet from '../models/ChopeOutlet';

const dumpProvider = async ({ outlets, filename = 'output.txt', color }) => {
  const lines = outlets
    .map(o => {
      try {
        return `${o.loc[1]}, ${o.loc[0]}, ${o.title}, ${color}`;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  const output = lines.join('\n');

  fs.writeFile(filename, output, err => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(`Successfully Written file=${filename}.`);
  });
};

const dumpOutlets = () => {
  (async () => {
    // let chopeOutlets = await ChopeOutlet.find({}, 'title');
    // chopeOutlets = chopeOutlets.map(outlet => outlet.title).filter(Boolean);

    // let burppleOutlets = await BurppleOutlet.find({}, 'title');
    // burppleOutlets = burppleOutlets.map(outlet => outlet.title).filter(Boolean);

    // const outlets = [...chopeOutlets, ...burppleOutlets];

    // const tree = new Bktree(outlets);
    // const r = tree.query(`Uni Gallery by OosterBay`, 12, 10);
    // console.log(r);

    const chopeOutlets = await ChopeOutlet.find({}, 'title loc');
    let burppleOutlets = await BurppleOutlet.find({}, 'title location');
    burppleOutlets = burppleOutlets.map(o => {
      return { title: o.title, loc: o.location.coordinates };
    });

    await Promise.all([
      dumpProvider({
        outlets: chopeOutlets,
        filename: path.join(__dirname, 'chope.txt'),
        color: '#00ffff'
      }),
      dumpProvider({
        outlets: burppleOutlets,
        filename: path.join(__dirname, 'burpple.txt'),
        color: '#ff0000'
      })
    ]);

    console.log('written files.');
  })();
};

export default dumpOutlets;
