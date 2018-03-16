/**
 * @fileoverview
 * 获取 4m3 通知列表及详情
 *
 * 需要的 cookie 从 config.json 读取
 * JESSIONID
 * SERVERNAME
 */

const http = require('http');
const cheerio = require('cheerio');

class NoticeFetcher {
  constructor({JSESSIONID, SERVERNAME}) {
    this._cookie = `JSESSIONID=${JSESSIONID};SERVERNAME=${SERVERNAME}`;
  }

  /**
   * 请求 4m3
   */
  fetch ({
    hostname = '4m3.tongji.edu.cn',
    path = '/',
    method = 'GET',
    headers = { 'cookie': this._cookie }
  }) {
    return new Promise(function (resolve, reject) {
      http.request({ hostname, path, method, headers }, function (res) {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      }).end();
    });
  }

  /**
 * 解析 4m3 通知列表
 */
  async getNotificationList() {
    const html = await this.fetch({ path: '/eams/home!welcome.action' });
    const $ = cheerio.load(html, { normalizeWhitespace: true });
    const notices = [];
    const notificationListDOM = $('tr', 'div.module.expanded > div.modulebody');
    notificationListDOM.each(function (i, ele) {
      if (i === 0) return;
      const $notice = $('td a[alt=查看详情]', ele);
      const title = $notice.text();
      if (!title) return;
      const id = /getNewNoticeInfo\('(.*)'\)/.exec($notice.prop('onclick'));
      if (!id) return;
      const publishedTime = $('td', ele).last().text();
      notices.push({ title, publishedTime, id: id[1] });
    });
    return notices;
  }

  /**
   * 获取单条通知详细信息
   * @param {string | number} notificationId 通知Id
   */
  async getNotificationInfo(notificationId) {
    const html = await this.fetch({ path: `/eams/noticeDocument!info.action?ifMain=1&notice.id=${notificationId}` });
    const $ = cheerio.load(html, { normalizeWhitespace: true });
    const content = [];
    $('p', 'table#studentInfoTable').each((i, ele) => content.push({tag: 'p', children: [$(ele).text()]}));
    $('td a', 'table#studentInfoTable').each((i, ele) =>
      content.push({tag: 'p', children: [{tag: 'a', children: [$(ele).text()]}]})
    );
    return content;
  }
}

module.exports = NoticeFetcher;
