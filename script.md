Hi! We made FREE FOOD!!!, which finds events with free food at our university, UC San Diego.

Why?
42% of UCSD undergrads have reported experiencing food insecurity, and this number grows to 53% for underrepresented minorities. Our dining halls are not all-you-can-eat, unlike UCLA, so when you rely on financial aid and run out of dining dollars, you run out of meals.
Our campus also hosts a lot of events, but some struggle to get the word out to enough students, leading to leftover food gone to waste.
Our school is also known for being "UC socially dead," so advertising events with free food can help bring our community together.

So, how?
You might be thinking, oh, this is easy, just use Instagram's API— NO!
Instagram is at constant war with bots on their platform, so they do everything they can to prevent web scraping. We tried to use Instaloader but quickly ran into rate limit issues.

Fortunately, we found a new way to reliably scrape Instagram. We created an account whose sole purpose is to follow all student orgs at UCSD. Then, the home page conveniently serves all of their posts in one place, and we can just scroll down the feed and click through stories. These are actions that a human user would make, reducing the likelihood of Instagram detecting bot activity.

Here is our Instagram scraper at work, written with Node.js and beautiful TypeScript. It uses Playwright to spawn a headless browser, and it captures network activity while it browses Instagram. Post and story data are conveniently found in the website's internal GraphQL calls as JSON objects, which we process. Then, we use Gemini 2.0 Flash to extract event information from the post image and caption, then store it in MongoDB.

Here is our MongoDB collection.

Our website simply lists the events in our database, but what if the user wants something more personalized?

We also created a DAIN service that provides the agent tools for accessing our events database. You can ask DAIN for the events coming up this week, and it'll use our service to give you exactly what you need.

Thanks for watching!
