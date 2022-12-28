const puppeteer = require('puppeteer-extra')
const chromePaths = require('chrome-paths'); 
const Chrome_Browser_PATH = chromePaths.chrome;
var fs = require("fs");
const _ = require('lodash');
var credentials = fs.readFileSync("login.env");
var login_credentials = credentials.toString();

const data = login_credentials.split('\n');
let config = [];
for(let i = 0; i < data.length; i++) {

  if(/^\s*$/.test(data[i])) continue;
  var contentCells = data[i];
  var passed = contentCells.includes("=");
  if(passed){
  for(let i = 0; i < contentCells.length; i++) 
  var key = contentCells.substring(0, contentCells.indexOf("=")); //
  var property = contentCells.substring(contentCells.indexOf("=") + 1);
  property = property.replace('\r','')
  // Push new line to json array
  config.push({
    [key]:property
  });
  }

 
}
var newArray = Object.assign({}, ...config);
delete config.config;
var login_details = { ...newArray };
var phone = login_details.phone;
var password = login_details.password;
var requestTotal = login_details.needusers;

const getusers = async () => {
  const browser = await puppeteer.launch({  
      executablePath: Chrome_Browser_PATH,
      headless: true,
      args: [
          "--disable-infobars",
          "--no-sandbox",
          "--disable-blink-features=AutomationControlled",'--start-maximized'
      ],
      ignoreDefaultArgs: ["--enable-automation"],
  });
  console.log("boss i am running with headless mode");
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  await page.setViewport({width:1920, height:1000});
    
  const cookiesFilePath = "twitter-cookies.json";

  const previousSession = fs.existsSync(cookiesFilePath);
  if (previousSession) {
    // If file exist load the cookies
    const cookiesString = fs.readFileSync(cookiesFilePath);

    if (cookiesString != '') {
      const parsedCookies = JSON.parse(cookiesString);
      if (parsedCookies.length !== 0) {
        for (let cookie of parsedCookies) {
          await page.setCookie(cookie);
        }
        console.log('Session loaded');
      }
    }
  }

  await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
          get() {
              return 1;
          },
      }); 
      navigator.permissions.query = i => ({then: f => f({state: "prompt", onchange: null})});
  
  });
  
  await page.goto('https://twitter.com/i/flow/login',{waitUntil: 'load', timeout: 0});

  await page.waitForSelector('[autocomplete="username"]');
  await page.type('[autocomplete="username"]',phone);
  const [button] = await page.$x("//span[contains(., 'Next')]");
  if (button) {
      await button.click();
  }
    
  await page.waitForSelector('#modal-header');
  var headeInfo =   await page.evaluate(() => {
    var modalHeader = document.querySelector('#modal-header');
    modalHeader =modalHeader?modalHeader.innerText : '';
    return modalHeader;
  });

  if(headeInfo=='Login to Twitter')
  {
    const [button] = await page.$x("//span[contains(., 'Cancel')]");
      if (button) {
          await button.click();
      }
  }
  else{
      await page.waitForSelector('[autocomplete="current-password"]');
      await page.type('[autocomplete="current-password"]',password);

      const [buttons] = await page.$x("//span[contains(., 'Log in')]");
      if (buttons) {
          await buttons.click();
      }
  }

  await page.waitFor(6000);
  await page.goto('https://twitter.com/TwitterSpaces/followers',{waitUntil: 'load', timeout: 0});
  console.log("login success");
  const NewcookiesFilePath = "twitter-cookies.json";
  // Save Session Cookies
  const cookiesObject = await page.cookies();
  // Write cookies to temp file to be used in other profile pages
  fs.writeFile(
    NewcookiesFilePath,
    JSON.stringify(cookiesObject),
    function (err) {
      if (err) {
        console.log("The file could not be written.", err);
      }
      console.log("Session saved");
    }
  );
  await page.waitForSelector('[aria-label="Timeline: Followers"]');
  console.log("please wait...listing users profile");

  var all = await page.evaluate(async (requestTotal) => {
    var dataset = [];
    var totalUserRequest = requestTotal*5;
    totalUserRequest = totalUserRequest+500;
    await new Promise((resolve, reject) => {  
      var prev_height = 0;
      var distance =900;
      var countFails = 0;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        if(prev_height==scrollHeight)
        {
          countFails++;
        }
        else{
          countFails=0;
        }
        window.scrollBy(0, distance);
        prev_height = document.body.scrollHeight;
        var data = document.querySelectorAll('[data-testid="cellInnerDiv"]>div>div>div>div>div>div>div>div>div>div>a');
        for (let index = 0; index < data.length; index++) {
          var link = data[index];
          link = link?link.href : '';
          dataset.push({link:link}); 
        }
        console.log(requestTotal);
        //5x with request total users

        if(dataset.length>totalUserRequest)
        {
          clearInterval(timer);
          resolve();
        }

        // if (countFails == 30) {
        //   clearInterval(timer);
        //   resolve();
        // }
      }, 500);
    });
    return dataset;
  }, requestTotal); //end loading data
  var dataset =  _.uniqBy(all, 'link');

  fs.writeFileSync('twiterations.json', JSON.stringify(dataset));

  console.log("Total users link listed = ==== "  + dataset.length);

  console.log("closed the browser");
  await browser.close();      
};

module.exports = {getusers};
