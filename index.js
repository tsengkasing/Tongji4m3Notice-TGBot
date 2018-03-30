const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const NoticeFetcher = require('./lib/tongji-4m3-notification-fetcher');
const TelegraphAPI = require('./lib/telegraph');

const {
  AUTHOR,
  GROUPID,
  ALERTID,
  LOGINTOKEN,
  PERIOD,
  PROXY,
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
 * @param {any} option
 */
function info(content, isError, option) {
  const _content = `[${new Date().toLocaleString({}, {
    timeZone: 'Asia/Shanghai'
  })}] ${content}`;
  if (isError) {
    console.error(_content);
    if (option && option.bot) {
      option.bot.sendMessage(ALERTID, content);
    }
  } else console.log(_content);
}

/**
 * 主函数
 */
(function main() {
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(TOKEN, {
    polling: true,
    request: PROXY ? { proxy: PROXY } : {},
  });

  // Listen for any kind of message. There are different kinds of
  // messages.
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    info(`${chatId} send message.`);

    // send a message to the chat acknowledging receipt of their message
    bot.sendMessage(chatId, 'Received your message');
  });

  fetcher.login().then(() => scan(bot));
}());

/**
 * 发送通知
 * @param {TelagramBot} bot
 * @param {any} notices
 */
async function sendNotice(bot, notices) {
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
      await bot.sendMessage(GROUPID, `[${title}](${url})`, {
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
 * @param {TelagramBot} bot
 */
async function scan(bot) {
  const visitedNoticeIds = getVisitedNoticesIds();
  let list = [];
  try {
    list = await fetcher.getNotificationList();
    info('System OK!');
  } catch (e) {
    Raven.captureException(e);
    info(e.message, true, { bot });
  }
  let newNotices = list.filter(({id}) => !visitedNoticeIds.includes(id));

  if (newNotices.length > 0) {
    setVisitedNoticesIds(list.map(({id}) => id.toString()));
    newNotices = await Promise.all(
      newNotices.map(async info => (
        { ...info, content: await fetcher.getNotificationInfo(info.id) }
      ))
    );
    // 倒序发送通知
    sendNotice(bot, newNotices.reverse());
  }

  setTimeout(() => scan(bot), PERIOD);
}
