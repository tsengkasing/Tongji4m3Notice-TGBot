const fs = require('fs');
const path = require('path');
const http = require('http');
const NoticeFetcher = require('./lib/tongji-4m3-notification-fetcher');

const {
  LOGINTOKEN,
  PERIOD,
  RAVENDSN,
} = require('./config.json');
const fetcher = new NoticeFetcher(LOGINTOKEN);
const visitedNoticeIdsFile = path.join(__dirname, 'visitedNoticeIds.json');

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
    // if (alert) sendMessage(ALERTID, content);
  } else console.log(_content);
}

/**
 * 主函数
 */
(function main() {
  scan();
}());

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

function sendNotice(notices) {
  const req = http.request({
    hostname: 'g.everstar.xyz',
    path: '/4m3',
    method: 'POST'
  }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      info(body);
    });
  });
  req.write(JSON.stringify(notices));
  req.end();
}
