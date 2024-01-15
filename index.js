import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fetch from 'node-fetch';
import config from './config.json' assert {type : "json"};


async function runScript() {
  const { username, password, email } = config.twitter;
  const {address} = config.nyft


  const chromeOptions = new chrome.Options();
  // chromeOptions.addArguments("--headless");
  // chromeOptions.addArguments("--disable-gpu");
  const user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.346 Safari/537.36";
  chromeOptions.addArguments(`user-agent=${user_agent}`);

  chromeOptions.addArguments("--headless")
  chromeOptions.excludeSwitches("enable-automation")

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();

  const login_url = "https://twitter.com/i/flow/login";
  await driver.get(login_url);

  await driver.sleep(2000);
  console.log("Current URL after login page:", await driver.getCurrentUrl());
  const pageSource = await driver.getPageSource();
  console.log("HTML source of the current page:", pageSource);
  const usernameField = await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), 20000);
  await usernameField.sendKeys(username, Key.RETURN);

  await driver.sleep(5000);

  const passwordField = await driver.wait(until.elementLocated(By.xpath('//input[@name="password"]')), 20000);
  await passwordField.sendKeys(password, Key.RETURN);

  await driver.sleep(5000);

  console.log("Current URL:", await driver.getCurrentUrl());

  const pageSource2 = await driver.getPageSource();
  const isHelpUsPresent = pageSource2.includes("Help us keep your account safe.");
  if(isHelpUsPresent){
    const emailField = await driver.wait(until.elementLocated(By.xpath('//input[@inputmode="email"]')),20000);
    await emailField.sendKeys(email, Key.RETURN )
  }

  await driver.get("https://twitter.com/explore");
  await driver.sleep(2000);

  const searchBox = await driver.findElement(By.xpath("//input[@data-testid='SearchBox_Search_Input']"));
  const yesterdayDate = new Date(new Date() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const todayDate = new Date().toISOString().split('T')[0];
  const dynamicSubject = `league pass menu (from:worldwidewob) until:${todayDate} since:${yesterdayDate}`;
  await searchBox.sendKeys(dynamicSubject, Key.RETURN);

  await driver.sleep(5000);

  console.log("Current URL:", await driver.getCurrentUrl());

  const tweetElements = await driver.wait(until.elementsLocated(By.xpath("//div[@data-testid='tweetText']")), 30000);
  const numTweets = Math.min(tweetElements.length, 3);

  for (let i = 0; i < numTweets; i++) {
    const tweet = tweetElements[i];
    const tweetText = await tweet.getText();
    console.log(`Tweet ${i + 1}: ${tweetText}`);

    try {
        const tweetParent = await tweet.findElement(By.xpath('..'));
        const images = await tweetParent.findElements(By.xpath("//img"));
      const sizes = [];
      for (let idx = 0; idx < images.length; idx++) {
        const image = images[idx];
        sizes.push({ "idx": idx, "size": (await image.getRect()).height + (await image.getRect()).width });
      }
      const maxDict = sizes.reduce((max, current) => (current.size > max.size ? current : max), { size: -Infinity });
      const correctImage = images[maxDict.idx];
      const url = await correctImage.getAttribute("src");

      console.log(`text = ${tweetText}`);

      await fetch(`https://ntfy.sh/${address}`, {
        method: 'POST',
        body: Buffer.from(tweetText, 'utf-8'),
        headers: {
            'Content-Type': 'application/octet-stream',
            'Attach': url,
        },
        });

    } catch (error) {
      console.log(`No image found for Tweet ${i + 1}`);
      console.log(error.stack)
    }
  }

  await driver.quit();
}

runScript();