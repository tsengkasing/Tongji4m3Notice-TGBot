/**
 * @fileOverview
 * API for Telegraph
 */
const https = require('https');

class TelegraphAPI {
  /**
   * initialize
   * @param {string} accessToken
   */
  constructor(accessToken) {
    this._accessToken = accessToken;
  }

  api(path, method = 'GET', postData = null) {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegra.ph',
        path: encodeURI(path),
        method,
        headers: { 'content-type': 'application/json' }
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          let data = Buffer.concat(chunks).toString();
          try {
            data = JSON.parse(data);
          } catch (e) { resolve({ok: false}); }
          resolve(data);
        });
      });
      if (method === 'POST' && postData) {
        req.write(JSON.stringify(postData));
      }
      req.end();
    });
  }

  async createPage(title, authorName, content) {
    const { ok, result, error } = await this.api('/createPage', 'POST', {
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
