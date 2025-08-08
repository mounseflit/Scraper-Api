import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Set the public directory for static files
app.use(express.static(path.join(__dirname, 'public')));
// Set the public directory for static files
app.use('/public', express.static(path.join(__dirname, 'public')));



app.use(cors());
app.use(express.json({ limit: '50mb' }));


// CORS middleware
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Serve static files
app.use(express.static('public'));



async function scrapeWebsite(req, res) {

  // Extract the URL and method from the query parameters
  var websiteUrl = req.query.url;
  const method = req.query.type; // Optional: specify the type of scraping : 'html' or 'images' or 'text' or 'links'


  // Validate the URL and accept it if it have https:// or http:// if it doesnt add https://
  if (!websiteUrl) {
    return res.status(400).json({ message: 'Please provide a valid URL as a query parameter (e.g., ?url=https://example.com)' });
  }
  if (!/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = 'https://' + websiteUrl;
  }
 

  // Validate the method
  if (method && !['html', 'images', 'text', 'links', 'scripts'].includes(method)) {
    return res.status(400).json({ message: 'Invalid method. Please use one of the following: html, images, text, links, scripts' });
  }



  try {

    // Fetch the HTML of the provided website
    let data;
    try {
      const response = await axios.get(websiteUrl);
      data = response.data;
    } catch (error) {
      // If the request fails, try using HTTP instead of HTTPS
      console.error('Error fetching the website:', error.message);
      // Attempt to fetch the website using HTTP
      const httpUrl = websiteUrl.replace('https://', 'http://');
      const response = await axios.get(httpUrl);
      data = response.data;
    }



    // Optionally, load the HTML using cheerio for parsing/manipulating the HTML
    const $ = cheerio.load(data);

    // Extract the title of the page as an example
    const pageTitle = $('title').text();

    // for raw html
    if (method === 'html') {
      return res.json({ message: 'Raw HTML', pageTitle, result: data });
    }

    // for images
    if (method === 'images') {
      const images = [];
      
      // Get regular img tags
      $('img').each((_, element) => {
        const img = $(element);
        const imgSrc = img.attr('src');
        if (imgSrc) {
          images.push({
        src: imgSrc
          });
        }
      });

      // Get CSS background images
      $('*').each((_, element) => {
        const style = $(element).attr('style');
        if (style) {
          const matches = style.match(/url\(['"]?([^'"()]+)['"]?\)/g);
          if (matches) {
        matches.forEach(match => {
          const url = match.replace(/url\(['"]?([^'"()]+)['"]?\)/, '$1');
          images.push({
            src: url
          });
        });
          }
        }
      });

      // Convert relative URLs to absolute URLs and remove duplicates
      const uniqueImages = images.reduce((acc, img) => {
        const absoluteSrc = img.src.startsWith('http') || img.src.startsWith('https') ? 
          img.src : new URL(img.src, websiteUrl).href;
        
        if (!acc.some(x => x.src === absoluteSrc)) {
          img.src = absoluteSrc;
          acc.push(img);
        }
        return acc;
      }, []);

      return res.json({ 
        message: 'Images', 
        pageTitle, 
        result: uniqueImages 
      });
    }
    

    // for text
    if (method === 'text') {
      // Clean up the text by removing script and style tags first
      $('script, style').remove();
      // Get the text content after removing unwanted elements
      const text = $('body').text();
      // Clean up the text by removing extra whitespace
      let cleanedText = text.replace(/\s+/g, ' ').trim();
      // Clean up the text by removing HTML tags
      cleanedText = cleanedText.replace(/<[^>]+>/g, '');
      // Clean up the text by removing non-breaking spaces
      cleanedText = cleanedText.replace(/&nbsp;/g, ' ');
      // Clean up the text by removing HTML entities
      cleanedText = cleanedText.replace(/&[a-zA-Z0-9#]+;/g, '');
      // Clean up the text by removing extra spaces
      cleanedText = cleanedText.replace(/\s+/g, ' ');
      // Clean up the text by removing leading and trailing spaces
      cleanedText = cleanedText.trim();
      // Clean up the text by removing new lines
      cleanedText = cleanedText.replace(/\n/g, ' ');
      // Clean up the text by removing tabs
      cleanedText = cleanedText.replace(/\t/g, ' ');
      // Clean up the text by removing carriage returns
      cleanedText = cleanedText.replace(/\r/g, ' ');
      return res.json({ message: 'Text', pageTitle, result: cleanedText });
    }

    // for links
    if (method === 'links') {
      const links = [];
      $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (href) {
        // Convert relative URLs to absolute URLs
        const absoluteUrl = href.startsWith('http') || href.startsWith('https') || href.startsWith('tel:') || href.startsWith('mailto:') ? 
        href : new URL(href, websiteUrl).href;
        links.push({
        url: absoluteUrl,
        text: text || ''
        });
      }
      });
      
      // Remove duplicates while preserving the first occurrence of each URL
      const uniqueLinks = links.reduce((acc, link) => {
      if (!acc.some(x => x.url === link.url)) {
        acc.push(link);
      }
      return acc;
      }, []);
      
      return res.json({
      message: 'Links extracted successfully',
      pageTitle,
      result: uniqueLinks
      });
    }

    // for scripts
    if (method === 'scripts') {
      let scripts = "";
      // what is inside <script> </script>
      $('script').each((_, element) => {
        scripts += $(element).html() + "\n";
      });
      return res.json({
        message: 'Scripts extracted successfully',
        pageTitle,
        result: scripts
      });
    }

    // If no method is specified, return the raw HTML by default
    return res.json({ message: 'Raw HTML', pageTitle, result: data });
  }
  catch (error) {
    console.error('Error fetching the website:', error);
    return res.status(500).json({ message: 'Error fetching the website', error: error.message });
  }

}

// Define the route for scraping
app.get('/scrape', scrapeWebsite);


// Define the route for Demo 
app.get('/demo', (_req, res) => {
    res.sendFile(__dirname + '/demo.html');
});


// Define the route for the index page
app.get('/', (_req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
