/**
 * @fileoverview
 * 获取 4m3 通知列表及详情
 */

const cheerio = require('cheerio');
const request = require('request-promise-native');

class NoticeFetcher {
  constructor({token1, token2}) {
    this._token1 = token1;
    this._token2 = token2;
    this.fetch = request.defaults({ jar: request.jar(), simple: false });
  }

  /**
   * 登录
   */
  async login() {
    this.fetch = request.defaults({ jar: request.jar(), simple: false });
    let html, uri, $;
    html = await this.fetch.get('http://4m3.tongji.edu.cn/eams/login.action');
    html = await this.fetch.get('http://4m3.tongji.edu.cn/eams/samlCheck');

    // 从 html 头部 meta 信息取出要跳转的 url
    uri = /url=(.*)"></.exec(html)[1];
    html = await this.fetch.get(uri);

    // 从 html body 的表单中取出要跳转的 url ，再次跳转
    $ = cheerio.load(html, { normalizeWhitespace: true });
    uri = $('form').prop('action');
    html = await this.fetch.post(`https://ids.tongji.edu.cn:8443${uri}`, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });

    // 到达统一身份验证登录页面
    // 输入学号和密码，提交表单登录
    $ = cheerio.load(html, { normalizeWhitespace: true });
    uri = $('form[name=IDPLogin]').prop('action');
    html = await this.fetch.post(uri, {
      form: {
        option: 'credential',
        Ecom_User_ID: this._token1,
        Ecom_Password: this._token2,
        submit: 'Login'
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (/Login failed, please try again/.test(html)) throw new Error('账号密码错误导致登录失败!');

    // 从 html 中取出需要跳转的 href 进行跳转
    uri = /href='(.*)';/.exec(html)[1];
    html = await this.fetch.get(uri);

    // 再次提交一个表单，带有一个巨大的 SAMLResponse 字符串参数
    $ = cheerio.load(html);
    uri = $('form').prop('action');
    html = await this.fetch.post(uri, {
      form: {
        SAMLResponse: $('form input[name=SAMLResponse]').val(),
        RelayState: $('form input[name=RelayState]').val()
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      followAllRedirects: true // 允许从 POST 跳到 GET,
    });

    if (!html.includes(`(${this._token1})`)) {
      throw new Error('登录失败！');
    }
  }

  /**
   * 解析 4m3 通知列表
   */
  async getNotificationList() {
    const html = await this.fetch.get('http://4m3.tongji.edu.cn/eams/home!welcome.action');
    if (!html) throw new Error('Cookie 失效啦！');
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
    const html = await this.fetch.get(`http://4m3.tongji.edu.cn/eams/noticeDocument!info.action?ifMain=1&notice.id=${notificationId}`);
    const $ = cheerio.load(html, { normalizeWhitespace: true });
    const content = [];
    $('p', 'table#studentInfoTable').each((i, ele) => content.push({tag: 'p', children: [$(ele).text()]}));
    $('td a', 'table#studentInfoTable').each((i, ele) =>
      content.push({tag: 'p', children: [{tag: 'a', children: [$(ele).text()]}]})
    );
    if (content.length <= 0) {
      content.push({tag: 'p', children: [$('table#studentInfoTable').text()]});
    }
    return content;
  }
}

module.exports = NoticeFetcher;
