# API Scraper

This is a Node.js-based web scraper that accepts a URL as a query parameter and returns the HTML content of the page. The API is deployed on Vercel and includes CORS support.

## Features:
- Fetches the HTML content of a given website.
- Uses `axios` to fetch the page content.
- Uses `cheerio` for optional HTML parsing and manipulation.
- Supports CORS requests using the `cors` middleware.

## How to Use:
1. Deploy the project on Vercel.
2. Make a GET request to the `/api/scrape` endpoint with the `url` query parameter:
https://api-scraper/api/scrape?url=https://example.com

## Dependencies:
- axios
- cheerio
- cors
