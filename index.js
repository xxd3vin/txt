/**
 * 从www.yikanxiaoshuo.com下载小说
 * 《愿无深情可相守》
 */

const puppeteer = require('puppeteer');
const debug = require('debug')('txt');
const fs = require('fs');

// 从166集开始下载
const START_CHAPTER = '166';

function warn(...arg) {
  console.warn('[txt::index.js] [WARN]', ...arg);
}

/**
 * http://www.yikanxiaoshuo.com/yikan/438447/
 * http://www.yikanxiaoshuo.com/yikan/438447/62417528.html
 */
async function run(url = 'http://www.yikanxiaoshuo.com/yikan/438447/62417528.html') {
  debug('chapter()');

  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md
  // const browser = await puppeteer.launch();
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();

  // 设置
  page.setViewport({
    width: 1440,
    height: 900
  });

  const tocUrl = 'http://www.yikanxiaoshuo.com/yikan/438447/';
  debug('跳转到页面并获取所有章节', tocUrl);
  await page.goto(tocUrl, {
    networkIdleTimeout: 500,
    waitUntil: 'networkidle',
    timeout: 3000000
  })
    .catch((error) => {
      warn('跳转到页面并获取所有章节，调用page.goto()时候出现异常：', error.message);
    });

  // [
  //   { title: '', url: 'http://www.yikanxiaoshuo.com/yikan/438447/62417541.html' },
  // ]
  const chapters = await page.evaluate(() => {
    const dds = document.getElementsByTagName('dl')[0].querySelectorAll('dd');
    const list = [];
    dds.forEach((dd, idx) => {
      const a = dd.querySelector('a');
      if (a != null) {
        list.push({
          title: a.textContent,
          url: 'http://www.yikanxiaoshuo.com' + a.getAttribute('href')
        });
      }
    });
    return list;
  });
  console.log('获取到所有的章节URL：', chapters);

  let txt = '';

  async function chapter(url = 'http://www.yikanxiaoshuo.com/yikan/438447/62417528.html') {
    debug('跳转到页面', url);
    await page.goto(url, {
      networkIdleTimeout: 1000,
      waitUntil: 'networkidle',
      timeout: 3000000
    })
      .catch((error) => {
        warn('调用page.goto()时候出现异常：', error.message);
      });

    // 获取页面中的文本内容
    debug('获取页面文本内容');
    const content = await page.evaluate(() => document.getElementById('content').textContent);
    const title = await page.evaluate(() => document.getElementsByTagName('h1')[0].textContent);
    txt += title + '\n\n' + content.replace('chaptererror();章节错误,没有更新,点此举报!', '');
    debug('写入临时文件tmp.txt');
    fs.writeFile("tmp.txt", txt, function(err) {
      if(err) {
          return console.log('写入tmp.txt错误：', err);
      }
      console.log("tmp.txt, the file was saved!");
    });
  }

  debug('找到需要开始下载的第一个章节，比如166集');
  let startChapterIdx = 0;
  chapters.forEach((chapter, idx) => {
    if (chapter.title.startsWith(START_CHAPTER)) {
      startChapterIdx = idx;
    }
  });
  debug(`准备从第${startChapterIdx}开始下载`);

  debug('开始下载每一个章节');
  for (let i = startChapterIdx; i < chapters.length; i++) {
    const chapter = chapters[i];
    debug('开始处理标题:', chapter.title, 'url:', chapter.url);
    await chapter(chapter.url);
  }

  debug('写入最终文件');
  fs.writeFile("output.txt", txt, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("output.txt, the file was saved!");
  });

  await browser.close();
}

run();
