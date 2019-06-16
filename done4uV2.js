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

    if (currentURL === urls.login) {
      console.log('On login page')
      page.evaluate((un, pw) => {
        const formEmail = document.querySelector('input#label-email[type="text"]');
        const formPassword = document.querySelector('input#label-password[type="password"]');
        formEmail.value = un;
        formPassword.value = pw;
        SWY.OKTA.signIn({ preventDefault: () => {} }) // site function
      }, credentials.username, credentials.password)
      console.log('Attempting to log in...')
    } else if (currentURL === urls.main) {
      console.log('On main page - redirecting to just for u coupons page')
      page.goto(urls.coupons);
    } else if (currentURL === urls.coupons) {
      console.log('On coupons page');
      browser.close();
    } else {
      console.log(`Landed on unexpected page: ${page.url()}\nSigning out and shutting down...`);
      browser.close();
    }
  })
  page.goto('https://www.safeway.com/account/sign-in.html');
})();
