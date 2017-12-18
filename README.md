# ftp-post

* 作者：winber
* 邮箱：winberxie@163.com
* 版本：**`0.0.1`**

## 介绍

使用 localStorage 缓存js

---

## 使用

- 所有静态资源都在同一台cdn服务器

```
require(["/static/a.js","/static/b.js","/static/c.js","/static/d.js"]);

```

## 注意事项

- 入口require函数参数数组的每一项为 js 的 url 
- 若为 cdn 地址,则需要将 第163行的 CND_PREFIX 设置为cdn前缀， 否则设置为空
- 若合并 js 的静态服务不在同一域名下面，需要将最后一行的 require.baseUrl 的值设置成提供静态资源服务的域名(该服务需支持 CORS 请求), 若为本域名服务进行合并服务，则将该值设置为空即可

---


## Changelog

### 0.0.1
1. init

---
