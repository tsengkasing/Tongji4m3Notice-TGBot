/**
 * @fileOverview
 * API for Telegraph
 */
const request = require('request');

class TelegraphAPI {
  /**
   * initialize
   * @param {string} accessToken
   * @param {string} proxy
   */
  constructor(accessToken, PROXY) {
    this._accessToken = accessToken;
    this.fetch = request.defaults({'proxy': PROXY});
  }

  api(path, postData = null) {
    return new Promise((resolve) => {
      this.fetch.post({
        url: `https://api.telegra.ph${path}`,
        headers: { 'content-type': 'application/json' },
        body: postData,
        json: true
      }, function (err, httpResponse, body) {
        if (err) {
          return resolve({ok: false});
        }
        resolve(body);
      });
    });
  }

  async createPage(title, authorName, content) {
    const { ok, result, error } = await this.api('/createPage', {
      'access_token': this._accessToken,
      'title': title,
      'author_name': authorName,
      'content': content,
      'return_content': true
    });
    if (ok) return { ok: true, url: result.url };
    return { ok: false, error };
  }
}

module.exports = TelegraphAPI;
