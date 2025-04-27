scrape UCSD events on instagram

you need:

- `cookies.json` instagram web cookies of account you want to scrape with
- `api_key.txt` API key for gemini which you can get from Gemini API studio
- water (see: [About Water and Healthier Drinks](https://www.cdc.gov/healthy-weight-growth/water-healthy-drinks/index.html))
- `mongo_userpass.txt` mongo atlas username colon password

```shell
$ npm install
$ npx playwright install firefox
$ node --experimental-strip-types scraper.ts
```

todo:

- [ ] fetch ai and dain??
- [ ] domain
- [ ] mongodb

## dain (`bleh/`)

- [follow this guide](https://lahacks-docs.dain.org/docs/getting-started/introduction)
