'use strict';

const fs = require('fs');
const https = require('https');
const puppeteer = require('puppeteer');
const prompt = require("prompt-sync")({ sigint: true });

/* ============================================================
  Promise-Based Download Function
============================================================ */

const download = (url, destination, tracker) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        tracker.done += 1;
        // console.log(`Success. Downloaded: ${url}`);
        file.close(resolve(true));
      });
    }).on('error', error => {
      fs.unlink(destination, () => {});
      reject(error.message);
    });
  });
};

/* ============================================================
  Download All Images
============================================================ */

const downloadImages = async (imageUrls, dirName) => {
  const tracker = { done: 0, jobLength: imageUrls.length };
  for (let i = 0; i < imageUrls.length; i++) {
    await download(imageUrls[i], `${dirName}/${i}.png`, tracker);
    console.log(`Success downloading: ${imageUrls[i]}`);
  }
  if (tracker.done !== tracker.jobLength) {
    throw new Error(`Images not all downloaded`);
  } else {
    console.log(`Finished ${tracker.done} out of ${tracker.jobLength} images`);
  }
};

const getImageUrls = async (page, imagesSelector) => {
  return await page.evaluate((imagesSelector) => {
    const images = document.querySelectorAll(imagesSelector);
    return Array.from(images, e => e.src);
  }, imagesSelector);
};

const goToNextPage = async (page, selector) => {
  return await page.evaluate((selector) => {
    const nextChapterButton = document.querySelector(selector);
    if (nextChapterButton) {
      nextChapterButton.click();
    }
    return nextChapterButton;
  }, selector);
};

const mainFunction = async (startUrl, nextPageSelector, imagesSelector, chapterNumber, endChapterNum) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(startUrl);
  while (chapterNumber <= endChapterNum) {
    await page.waitForSelector(imagesSelector, { timeout: 10000 });
    const pageUrl = await page.evaluate(() => document.URL);
    console.log(pageUrl);
    const chapterName = `./downloaded/Chapter-${chapterNumber}`;
    await fs.mkdir(chapterName, (err) => {
      if (err) {
        console.error(err);
      }
      console.log(`Made dir ${chapterName}`);
    });

    const imageUrls = await getImageUrls(page, imagesSelector);
    await downloadImages(imageUrls, chapterName);
    const nextPageButtonExist = await goToNextPage(page, nextPageSelector);

    chapterNumber += 1;
    if (!nextPageButtonExist) {
      break;
    }
  }
  console.log('end');
  // await browser.close();
};

(async () => {
  const nextPageSelector = `body > nav > div > 
    div.collapse.navbar-collapse.d-none.d-md-flex > ul.navbar-nav.ml-auto > li:nth-child(3) > a`;
  const startUrl = `https://mangasee123.com/read-online/Tower-Of-God-chapter-130-index-3.html`;
  const imagesSelector = `.img-fluid`;
  const chapterNumber = 546;
  const endChapterNumber = 550;
  await mainFunction(startUrl, nextPageSelector, imagesSelector, chapterNumber, endChapterNumber);
})();

// const startUrl = prompt("startUrl?");
// const nextPageSelector = prompt("Selector for next page button?");
// const imagesSelector = prompt("Selector for images?");
// const chapterNumber = prompt("chapterNumber?");
// const endChapterNumber = prompt("endChapterNumber?");
// (async () => {
//   await mainFunction(startUrl, nextPageSelector, imagesSelector, chapterNumber);
// })(startUrl, nextPageSelector, imagesSelector, chapterNumber);
