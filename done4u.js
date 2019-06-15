// done4u.js
var phantom = require('phantom');
var d4u  = {};

d4u.urls = {
  main: 'http://www.safeway.com/',
  login: 'https://www.safeway.com/account/sign-in.html'
  coupons: 'https://www.safeway.com/justforu/coupons-deals.html'
};

d4u.currentPage = d4u.urls.main;

d4u.login    = process.env.J4U_LOGIN;
d4u.password = process.env.J4U_PASSWORD;

d4u.init = function() {
  phantom.create(function(ph) {
    ph.createPage(function(page) {
      // https://github.com/ariya/phantomjs/issues/10687
      ph.onError = page.onError = function(err) {
        page.close();
        ph.exit();
      };

      page.set('onLoadFinished', function(status) {
        if (status !== 'success') {
          console.log('exiting, unable to load ' + d4u.currentPage);
          page.close();
          ph.exit();
        } else {
          console.log('loaded\n  ' + d4u.currentPage);
          switch (d4u.currentPage) {
            case d4u.urls.main:
              if (SWY.ENFORCEMENT.isTokenActive()) { // Site function, verifies user is logged in
                //User is logged in, open "just for U"
                page.open(d4u.urls.coupons);
              } else {
                // User is not logged in - redirect to login
                page.open(d4u.urls.login); break;
              }
            case d4u.urls.login:
              d4u.attemptLogin(ph, page); break;
            case d4u.urls.coupons:
              d4u.clipCoupons(ph, page); break;
            default:
              console.log('unknown page, exiting / logging out');
              page.close();
              ph.exit();
              break;
          }
        }
      });

      page.set('onUrlChanged', function(url) {
        d4u.currentPage = url;
      });

      page.open(d4u.currentPage);

    });
  });
};

d4u.clipCoupons = function(ph, page) {
  console.log('attempting to clip coupons');
  page.evaluate(function() {

    // jscs:disable
    // IIFE converted from "bookmarklet" at https://github.com/nishnet2002/Safeway-Just-for-u
    (function() {
      "use strict";
      var promises = [];
      var allcoupons = Object.values(JSON.parse(localStorage.getItem("abCoupons"))["offers"]);
      var coupons = allcoupons.filter(function(x) {
          return x.status === "U";
      }).filter(function(y) {
          return y.deleted !== 0;
      });
      if (coupons.length > 0) {
          //window.alert("clipping " + coupons.length + " of " + allcoupons.length + " coupons");
          coupons.forEach(function(item) {
              var data = {
                  "items": []
              }
                , clip = {}
                , list = {};
              clip.clipType = "C";
              clip.itemId = item.offerId;
              clip.itemType = item.offerPgm;
              list.clipType = "L";
              list.itemId = item.offerId;
              list.itemType = item.offerPgm;
              data.items.push(clip);
              data.items.push(list);
              var request = new Request(window.AB.couponClipPath + "?storeId\x3d" + window.AB.userInfo.j4u.storeId,{
                  method: 'POST',
                  mode: 'cors',
                  redirect: 'error',
                  headers: new Headers(window.AB.j4uHttpOptions),
                  body: JSON.stringify(data)
              });
              var promise = fetch(request).then(function(response) {
                  return response.json();
              }).then(function(itemjson) {
                  if (itemjson.items[0]["status"] === 1) {
                      var wtf = JSON.parse(localStorage.getItem("abCoupons"));
                      wtf.offers[item.offerId].status = "C";
                      localStorage.setItem("abCoupons", JSON.stringify(wtf));
                  }
              });
              promises.push(promise);
          });
          Promise.all(promises).then(function() {
              if (Object.values(JSON.parse(localStorage.getItem("abCoupons"))["offers"]).filter(function(x) {
                  return x.status === "U";
              }).filter(function(y) {
                  return y.deleted !== 0;
              }).length > 0) {
                  //window.alert("there are still some unclipped coupons - something probably broke this script");
              } else {
                  //window.alert("all coupons clipped - reloading page");
              }
              localStorage.removeItem("abCoupons");
              localStorage.removeItem("abJ4uCoupons");
              location.reload();
          });
      } else {
          if (allcoupons.length > 0) {
              //window.alert("no clippable coupons");
          } else {
              //window.alert("no coupons detected");
          }
      }
    }
    )();
    // jscs: enable

    // lol, angularjs
    var _unfilteredItems = justForYouApp.coupons._invokeQueue[12][2][1].unfilteredItems.slice();
    var _data = {};

    _data.count = _unfilteredItems.length || 0;
    _data.clipped = 0;
    _data.unclipped = 0;

    _unfilteredItems.forEach(function(_item) {
      if (_item.clipStatus === 'C') { _data.clipped++; }

      if (_item.clipStatus === 'U') { _data.unclipped++; }
    });

    return _data;
  },

  function(result) {
    console.log('clipping attempt completed\n  results: ' + JSON.stringify(result));

    if (!d4u.clipped) {
      d4u.clipped = true;
      console.log('refreshing coupon page in 180s');
      setTimeout(function() { page.open(d4u.currentPage); }, 180000);
    } else {
      console.log('proceeding with logout in 30s');
      setTimeout(function() { d4u.logout(ph, page); }, 30000);
    }
  });
};

d4u.logout = function(ph, page) {
  console.log('attempting logout');
  d4u.urls.main = '';
  d4u.login = '';
  d4u.password = '';
  page.evaluate(function() {
    openssoLogoff();
  });
};

d4u.attemptLogin = function(ph, page) {
  console.log('attempting login');
  page.evaluate(function(_login, _password) {

    var formEmail    = document.querySelector('input#label-email[type="text"]');
    var formPassword = document.querySelector('input#label-password[type="password"]');

    formEmail.value = _login;
    formPassword.value = _password;

    SWY.OKTA.signIn({ preventDefault: () => {} }) // site function
  }, function() {}, d4u.login, d4u.password);

};

if (!d4u.login || !d4u.password) {
  console.log('d4u could not find any login credentials, exiting');
} else {
  d4u.init();
}
