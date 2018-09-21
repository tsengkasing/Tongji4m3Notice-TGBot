const fs = require('fs');
const path = require('path');
const https = require('https');
const NoticeFetcher = require('./lib/tongji-4m3-notification-fetcher');
const TelegraphAPI = require('./lib/telegraph');

const {
  AUTHOR,
  GROUPID,
  ALERTID,
  LOGINTOKEN,
  PERIOD,
  RAVENDSN,
  TELEGRAPH: { ACCESS_TOKEN },
  TELEGRAM: { TOKEN }
} = require('./config.json');
const fetcher = new NoticeFetcher(LOGINTOKEN);
const visitedNoticeIdsFile = path.join(__dirname, 'visitedNoticeIds.json');
const telegraphAPI = new TelegraphAPI(ACCESS_TOKEN);

// 监控使用
const Raven = require('raven');
Raven.config(RAVENDSN).install();

/**
 * 日志
 * @param {string} content
 * @param {boolean} isError
 * @param {boolean} alert
 */
function info(content, isError, alert) {
  const _content = `[${new Date().toLocaleString({}, {
    timeZone: 'Asia/Shanghai'
  })}] ${content}`;
  if (isError) {
    console.error(_content);
    if (alert) sendMessage(ALERTID, content);
  } else console.log(_content);
}

/**
 * 主函数
 */
(function main() {
  scan();
}());

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
      info(content, true);
      info(error, true);
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
      Raven.captureException(e);
      info(e.message, true);
    }
  }
}

/**
 * 获取已读通知序号
 * @returns {string[]}
 */
function getVisitedNoticesIds() {
  let visitedNoticeIds = [];
  if (fs.existsSync(visitedNoticeIdsFile)) {
    const data = fs.readFileSync(visitedNoticeIdsFile, {encoding: 'utf8'});
    if (data) {
      try {
        visitedNoticeIds = JSON.parse(data);
      } catch (e) { /* whatever */ }
    }
  }
  return visitedNoticeIds;
}

/**
 * 保存已读通知序号
 * @param {string[]} oldNoticeIds
 */
function setVisitedNoticesIds(oldNoticeIds) {
  fs.writeFileSync(visitedNoticeIdsFile, JSON.stringify(oldNoticeIds), {flag: 'w', encoding: 'utf8'});
}

/**
 * 扫描
 */
async function scan() {
  const visitedNoticeIds = getVisitedNoticesIds();
  let list = [];
  try {
    await fetcher.login();
    list = await fetcher.getNotificationList();
    info('System OK!');
  } catch (e) {
    Raven.captureException(e);
    info(e.message, true, true);
  }
  let newNotices = list.filter(({id}) => !visitedNoticeIds.includes(id));
  info(JSON.stringify(newNotices, null, 2));

  if (newNotices.length > 0) {
    setVisitedNoticesIds(list.map(({id}) => id.toString()));
    newNotices = await Promise.all(
      newNotices.map(async info => (
        { ...info, content: await fetcher.getNotificationInfo(info.id) }
      ))
    );
    // 倒序发送通知
    sendNotice(newNotices.reverse());
  }

  setTimeout(() => scan(), PERIOD);
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
