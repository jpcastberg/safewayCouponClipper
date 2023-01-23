#! /usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const credentials = require('./credentials.js');

const logging = true; // Turn logging to log.txt for each clipping session on or off

const urls = {
  main: 'https://www.safeway.com/',
  login: 'https://www.safeway.com/account/sign-in.html',
  coupons: 'https://www.safeway.com/foru/coupons-deals.html'
};

// Helper function for necessary wait times
const waitNMilliseconds = (wait) => {
  return new Promise((res) => setTimeout(() => res(), wait))
}

const logClippedCouponCount = (couponCount) => {
  const dataToWrite = `Clipped ${couponCount} coupons on ${new Date().toLocaleString()}\n`;
  return new Promise((res, rej) => {
    fs.appendFile(path.join(__dirname, 'log.txt'), dataToWrite, (err) => {
      if (err) rej(err);
      res();
    })
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true }); // Change 'headless' to false to watch coupons get clipped
  const page = await browser.newPage();

  // Event listener closes browser after failed login attempt
  page.on('response', (response) => {
    if (response._url === 'https://albertsons.okta.com/api/v1/authn' && response._status === 401) {
      response.buffer()
        .then((buffer) => {
          const responseBody = JSON.parse(buffer.toString());
          if (responseBody.errorSummary === 'Authentication failed') {
            console.error('Authentication failed. Closing now...')
            browser.close();
          }
        })
    }
  })

  page.on('load', async () => {
    // Get current URL without parameters
    const currentURL = page.url().split('?')[0];

    if (currentURL === urls.login) {
      console.log('On Login page')
      // Attempt sign-in
      page.evaluate((un, pw) => {
        const formEmail = document.querySelector('input#label-email[type="text"]');
        const formPassword = document.querySelector('input#label-password[type="password"]');
        formEmail.value = un;
        formPassword.value = pw;
        SWY.OKTA.signIn({ preventDefault: () => {} }) // site function
      }, credentials.username, credentials.password)
      console.log('Attempting to log in...')
    } else if (currentURL === urls.main) {
      console.log('On Main page - redirecting to just for u coupons page')
      page.goto(urls.coupons);
    } else if (currentURL === urls.coupons) {
      console.log('On Coupons page');
      // Load all coupons
      let loadMoreButton;
      while (!loadMoreButton) {
        await waitNMilliseconds(500); // Wait some time for the 'Load More' button to load
        loadMoreButton = await page.$('.load-more');
      }
      while (loadMoreButton) {
        await page.click('.load-more');
        await waitNMilliseconds(250);
        loadMoreButton = await page.$('.load-more');
      }
      const allUnclippedCouponButtons = await page.$$('.grid-coupon-btn:not([disabled])');
      const couponCount = allUnclippedCouponButtons.length;
      while (allUnclippedCouponButtons.length > 0) {
        // Coupon clicks require wait time for some reason, otherwise redirects to Safeway home
        await waitNMilliseconds(150);
        await allUnclippedCouponButtons[0].click();
        allUnclippedCouponButtons.shift();
      }
      if (logging) await logClippedCouponCount(couponCount);
      console.log('All coupons clipped! Exiting now...')
      await browser.close();
      process.exit();
    } else {
      console.log(`Landed on unexpected page: ${page.url()}\nShutting down...`);
      await browser.close();
      process.exit();
    }
  })
  page.goto('https://www.safeway.com/account/sign-in.html');
})();
