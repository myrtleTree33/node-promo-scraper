# Singapore Food Promotions Scraper

## Introduction

This code exposes a working NodeJS server, that scrapes and matches food and dining deals in Singapore.

Multiple deals for a given restaurant are matched automatically by the algorithm in O(n^2) time.

At current, the following sources are supported.

Help would be appreciated to integrate more providers below:

| Source        | Status                  |
| ------------- | ----------------------- |
| Burpple       | Scraped                 |
| Chope Deals   | Scraped                 |
| Chope Outlets | Outlets not scraped yet |
| Amex          | Scraped                 |
| Citi          | Scraped                 |
| OCBC          |                         |
| HungryGoWhere |                         |

## Help needed for

- [ ] Scraping OCBC promos
- [ ] Scraping HungryGoWhere promos
- [ ] Refactoring code
- [ ] Improving matching algorithm time / space efficiency and accuracy (O(n^2) time, O(n) space at current)

## Installation

You will need to have `node` and a working MongoDB instance running. Populate the values in `.env`.

To install, use the following:

```
$ yarn        # yarn
$ npm install # npm
```

To run, use the following:

```
$ yarn run dev       # yarn
$ npm run dev        # npm
```

## Issues / Help

Please open on GitHub issues.
