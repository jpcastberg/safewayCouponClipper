const puppeteer = require('puppeteer');

const credentials = require('./credentials.js');

const urls = {
  main: 'https://www.safeway.com/home.html',
  login: 'https://www.safeway.com/account/sign-in.html',
  coupons: 'https://www.safeway.com/justforu/coupons-deals.html'
};

// Helper function for necessary wait times
const waitNMilliseconds = (wait) => {
  return new Promise((res) => setTimeout(() => res(), wait))
}

(async () => {
  const browser = await puppeteer.launch();
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
      // Wait for "Load More" button to appear
      await waitNMilliseconds(3000);
      // Load all coupons
      let loadMoreButton = await page.$('.load-more');
      while (loadMoreButton) {
        await page.click('.load-more');
        loadMoreButton = await page.$('.load-more');
      }
      const allUnclippedCouponButtons = await page.$$('.grid-coupon-btn:not([disabled])');
      if (allUnclippedCouponButtons.length === 0) {
        console.log('No coupons to clip! Exiting now...')
        browser.close();
        return process.exit();
      }
      while (allUnclippedCouponButtons.length > 0) {
        // Coupon clicks require wait time for some reason, otherwise redirects to Safeway home
        await waitNMilliseconds(50);
        await allUnclippedCouponButtons[0].click();
        allUnclippedCouponButtons.shift();
      }
      console.log('All coupons clipped! Exiting now...')
      browser.close();
      process.exit()
    } else {
      console.log(`Landed on unexpected page: ${page.url()}\nShutting down...`);
      browser.close();
      process.exit(1);
    }
  })
  page.goto('https://www.safeway.com/account/sign-in.html');
})();
