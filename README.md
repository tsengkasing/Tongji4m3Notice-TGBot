# Tongji4m3Notice-TGBot

![](https://img.shields.io/badge/cheerio-1.0-brightgreen.svg)
![](https://img.shields.io/badge/request-2.85.0-brightgreen.svg)
![](https://img.shields.io/badge/request--promise--native-1.0.5-brightgreen.svg)

将 4m3.tongji.edu.cn 的通知转发到 Telegram 的 [@tongji4m3](https://t.me/tongji4m3) 频道。

此处鸣谢 [@winely](https://github.com/winely) 对此项目的协助。

## Method

### 权限问题以及登录状态的保持

<del>访问同济 4m3 网站需要登录，然而经过测试发现，获取需要的通知信息只需要登录后的 ``JSESSIONID`` 和 ``SERVERNAME`` 两个 cookie 字段。
并且只要一直持续地访问，cookie 就会一直有效。 </del>

> 学校网站偶尔抽风，无法连接，时间一长，cookie 就失效了 orz

PS: 现已改成每次先登录再抓取信息。

### 页面的解析及通知信息提取

[lib/tongji-4m3-notification-fetcher.js](https://github.com/tsengkasing/Tongji4m3Notice-TGBot/blob/master/lib/tongji-4m3-notification-fetcher.js)

4m3 通知的页面 DOM 结构还是比较规范的，此处使用了 [cheerio](https://github.com/cheeriojs/cheerio)(服务器端用的jQuery) 来方便地解析HTML。

### 通知内容的预览

由于众所周知的原因，中国大陆无法访问 Telegram，同理 Telegram 服务器也无法获取国内网页(此处还有登录权限问题)。
因此在 Telegram 内分享一个网页链接无法生成预览(也不应该把全部通知文本塞到对话框里)，而且用户在频道看到通知后还需要再登录才能看到具体内容。
为了解决此问题，将通知的页面解析并提取内容，然后转发到 Telegraph，再将生成的 Telegraph 的链接转发到 Telegram 中。

### 更新频率

目前 10 分钟更新一次。

## Screenshots

![screenshots](https://user-images.githubusercontent.com/10103993/37531422-16cab278-2977-11e8-9be1-09c40952dc5e.png)

## Get Started

### Run on Linux

```bash
$ git clone https://github.com/tsengkasing/Tongji4m3Notice-TGBot.git
$ cd Tongji4m3Notice-TGBot
$ npm install
```

Then

```bash
$ node index.js
```
or

```bash
$ pm2 start index.js --name Tongji-4m3
```

### Run on Docker

由 [@DarkKowalski](https://github.com/DarkKowalski) 维护 [Docker 镜像](https://hub.docker.com/r/darkkowalski/tongji4m3notice-tgbot)

部署时需挂载 `config.json` 和 `visitedNoticeIds.json`

```bash
$ docker run -v ~/4m3bot/config.json:/usr/src/app/config.json -v ~/4m3bot/visitedNoticeIds.json:/usr/src/app/visitedNoticeIds.json -it darkkowalski/tongji4m3notice-tgbot:latest
```

## 代码结构

### Project Structure

```
.
├── index.js
├── lib
│   ├── telegraph.js
│   └── tongji-4m3-notification-fetcher.js
├── config.json
└── visitedNoticeIds.json
```

### Introduction

- index.js
    程序主入口
- lib/telegraph.js
    负责转发到 Telegraph 生成预览网页。
- lib/tongji-4m3-notification-fetch.js
    负责从 4m3.tongji.edu.cn 获取通知。
- visitedNoticeIds.json
    负责存储已经转发过的通知 id, 文件不存在时会自动创建。
- config.json
    配置文件，包括 telegram 的 token, telegraph 的 token, 4m3 的账号密码 以及 PROXY 的 URL 等等。

```javascript
{
  "AUTHOR": "Tongji 4m3 Notice",
  "LOGINTOKEN": {
    "token1": "", // 4m3 用户名
    "token2": ""  // 4m3 密码
  },
  "PERIOD": 600000, // 周期 10 分钟
  "ALERTID": "",    // 报错通知 id
  "GROUPID": "@tongji4m3", // 频道 id
  "TELEGRAM": {
    "TOKEN": ""
  },
  "TELEGRAPH": {
    "ACCESS_TOKEN":""
  },
  "RAVENDSN": "",    // 报错上报 Sentry 的 id
  "PROXY": "http://localhost:1080"  // 如果需要走代理，代理的 URL, 如 http://localhost:1080
}
```
