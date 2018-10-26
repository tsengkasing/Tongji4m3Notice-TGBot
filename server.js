const http = require('http');
const https = require('https');
const TelegraphAPI = require('./lib/telegraph');

const {
  AUTHOR,
  GROUPID,
  TELEGRAPH: { ACCESS_TOKEN },
  TELEGRAM: { TOKEN }
} = require('./config.json');

const telegraphAPI = new TelegraphAPI(ACCESS_TOKEN);

const info = function (...args) {
  console.log(`[${new Date().toLocaleString({}, {
    timeZone: 'Asia/Shanghai'
  })}] ${args.map(i => JSON.stringify(i, null, 2)).join('|')}`);
};

// Main
server();

function server() {
  http.createServer(function (request, response) {
    const { url, method } = request;
    if (url === '/4m3' && method.toUpperCase() === 'POST') {
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        let data = Buffer.concat(chunks).toString();
        try {
          data = JSON.parse(data);
          info(data);
          if (Array.isArray(data)) {
            sendNotice(data).then(() => info('OK'));
          }
          response.statusCode = 200;
          response.write('OK');
        } catch (e) {
          response.statusCode = 415;
        }
        response.end();
      });
    } else {
      response.statusCode = 404;
      response.end();
    }
  }).listen(4321, () => info('Server start!'));
}

/**
 * 发送通知
 * @param {any} notices
 */
async function sendNotice(notices) {
  // 按顺序发送，不并发
  for (let notice of notices) {
    const {title, publishedTime, content, id} = notice;
    info(` ${title} ${publishedTime}`);
    const {ok, url, error} = await telegraphAPI.createPage(title, AUTHOR, content);
    if (!ok) {
      info(content, 'Telegraph Failed', error);
      continue;
    }
    try {
      await sendMessage(GROUPID, `[${title}](${url})`, {
        parse_mode: 'Markdown',
        reply_markup: {inline_keyboard: [[{
          text: '阅读原文',
          url: `http://4m3.tongji.edu.cn/eams/noticeDocument!info.action?ifMain=1&notice.id=${id}`
        }]]}
      });
    } catch (e) {
      info(e.message);
    }
  }
}

/**
 * 发送消息到 telegram API
 * @param {string} chatId 消息目标
 * @param {string} msg 信息文本
 * @param {any} option 附加选项
 */
function sendMessage (chatId, msg = '', option = {}) {
  return new Promise(function (resolve, reject) {
    if (!chatId) reject(new Error('Empty chatID!'));
    const request = https.request({
      hostname: 'api.telegram.org',
      method: 'POST',
      path: `/bot${TOKEN}/sendMessage`,
      headers: { 'Content-Type': 'application/json' }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        let data = Buffer.concat(chunks).toString();
        try {
          data = JSON.parse(data);
        } catch (e) {
          return reject(new Error('Parse Telegram Bot API resposne JSON Error'));
        }
        const { ok, description } = data;
        if (!ok) { return reject(new Error(`[Send Message Failed] ${description}`)); }
        resolve();
      });
    });
    request.write(
      JSON.stringify(Object.assign({ chat_id: chatId, text: msg }, option))
    );
    request.end();
  });
}
