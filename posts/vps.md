---
title: vps
date: 2026-07-22
tag: 随笔
slug: vps
excerpt: vps
lead: 服务器
---

下载pi agent

~~~shell
apt update
apt install npm
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
~~~

- 如果遇到node版本低,更新后重新安装pi

**方案一**

~~~shell
node -v
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
hash -r
node -v
npm -v
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@latest
pi --version
~~~

**方案二**

~~~shell
apt-get purge -y libnode-dev && dpkg --configure -a && apt-get install --reinstall -y nodejs && hash -r && node -v
 && npm -v && npm install -g --ignore-scripts @earendil-works/pi-coding-agent@latest && pi --version
~~~

之后配置models.json文件

~~~json
{
        "providers": {
                "lucky_grok": {
                      "_commit": "的士交易",
                      "baseUrl": "https://example.com/v1",
                      "api": "openai-responses",
                      "apiKey": "sk-***************************",
                      "models": [{
                        "id" : "grok-4.5",
                        "reasoning": true,
                        "contextWindow": 1000000
                                }]
                }  
        }
}
~~~

配置好之后直接告诉pi: 帮我配置一个openclaw ai助手, 使用~/.pi/agent/models.json中的XXX模型

微型扫描连接成功

体验不好, 不稳定, 总是掉线, 占资源, 没啥用感觉, 已删

