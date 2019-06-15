const puppeteer = require('puppeteer');

const credentials = require('./credentials.js');

const urls = {
  main: 'https://www.safeway.com/home.html',
  login: 'https://www.safeway.com/account/sign-in.html',
  coupons: 'https://www.safeway.com/justforu/coupons-deals.html'
};

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
    // First load: Sign in page
      // Attempt login
        // Login fails? => Exit browser
    const currentURL = page.url().split('?')[0];
    switch (currentURL) {
      case urls.login:
        page.evaluate(() => {
          const formEmail = document.querySelector('input#label-email[type="text"]');
          const formPassword = document.querySelector('input#label-password[type="password"]');
          formEmail.value = credentials.username;
          formPassword.value = credentials.password;
          SWY.OKTA.signIn({ preventDefault: () => {} }) // site function
          console.log('LOGGING IN')
        })
        break;
      case urls.main:
        page.goto(urls.coupons);
      case urls.coupons:
        page.evaluate(() => {
          console.log('made it to coupons')
          console.log(localStorage)
        })
      default:
        console.log('Page not found', page.url())
        console.log('tried to match against', currentURL);
        break;
    }
  })
  await page.goto('https://www.safeway.com/account/sign-in.html');

  //await browser.close();
})();
