# Tongji4m3Notice-TGBot

![](https://img.shields.io/badge/node--telegram--bot--api-0.3-brightgreen.svg)
![](https://img.shields.io/badge/cheerio-1.0-brightgreen.svg)

将 4m3.tongji.edu.cn 的通知转发到 Telegram 的 [@tongji4m3](https://t.me/tongji4m3) 频道。

此处鸣谢 [@winely](https://github.com/winely) 对此项目的协助。

## Method

### 权限问题以及登录状态的保持

访问同济 4m3 网站需要登录，然而经过测试发现，获取需要的通知信息只需要登录后的 ``JSESSIONID`` 和 ``SERVERNAME`` 两个 cookie 字段。 
并且只要一直持续地访问，cookie 就会一直有效。 

> 于是目前使用着某一次登录后的 cookie。

### 页面的解析及通知信息提取

[lib/tongji-4m3-notification-fetcher.js](https://github.com/tsengkasing/Tongji4m3Notice-TGBot/blob/master/lib/tongji-4m3-notification-fetcher.js)
4m3 通知的页面 DOM 结构还是比较规范的，此处使用了 [cheerio](https://github.com/cheeriojs/cheerio)(服务器端用的jQuery) 来方便地解析HTML。

### 通知内容的预览

由于众所周知的原因，中国大陆无法访问 Telegram，同理 Telegram 服务器也无法获取国内网页(此处还有登录权限问题)。 
因此在 Telegram 内分享一个网页链接无法生成预览(也不应该把全部通知文本塞到对话框里)，而且用户在频道看到通知后还需要再登录才能看到具体内容。 
为了解决此问题，将通知的页面解析并提取内容，然后转发到 Telegraph，再将生成的 Telegraph 的链接转发到 Telegram 中。

### 更新频率

目前暂定 5 分钟更新一次。

## Screenshots

![screenshots](https://user-images.githubusercontent.com/10103993/37531422-16cab278-2977-11e8-9be1-09c40952dc5e.png)

