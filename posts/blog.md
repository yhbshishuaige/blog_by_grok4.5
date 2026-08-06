---
title: XiaoHongShu
date: 2026-07-31
tag: 随笔
slug: blog
excerpt: 用通俗语言解释 Claude Code、Codex、Agent、GPT、API、Token 等 AI 常见名词，帮小白快速建立第一张地图。
lead: 这是我小红书的第一篇文章，我会使用通俗的语言帮助大家理解关于 AI 的名词，旨在帮助小白打破信息差。
---

干货满满，收藏防迷路。

下面我用尽量通俗的话，把常见名词讲清楚。

## 名词解释

### Claude Code 和 Codex 是什么

Claude Code 是 Anthropic(简称a社) 推出的 AI 编程工具，常被简称为 CC。你可以把它理解成一个会在终端里工作的程序员助手：它能读项目文件、理解代码结构、修改代码、运行命令、分析报错，也能帮你写测试和整理文档。

Codex 是 OpenAI 面向编程场景的工具和模型体系。早期 Codex 主要指 OpenAI 的代码模型，现在很多时候也指 OpenAI 的编程 Agent 或命令行编程工具。它的核心用途也很明确：帮你在真实项目里写代码、改代码、跑测试、修问题。

### Agent 是什么

解释起来比较模糊, 可以理解为有调用工具能力的ai, 有点像"人"

### Fable 和 GPT 是什么

GPT 是 OpenAI 的模型系列，也可以理解成一种大语言模型技术路线。我们常说的 GPT-4、GPT-5，都是模型名字；ChatGPT 则是面向普通用户的聊天产品。

- 截止2026.7.31 openai的旗舰模型是gpt-5.6-sol, 除此之外还有gpt-5.6-luna和gpt-5.6-terra以及5.5等等系列

Fable 是a社现在的最强模型, 比opus系列更强

- 目前fable是不是最好的还有待商榷,但是一定是最贵的!!!和烧钱没区别

### CLI 和 GUI 是什么

CLI 是 Command Line Interface，意思是命令行界面。你需要在终端里输入命令来使用它。

GUI 是 Graphical User Interface，意思是图形界面。使用按钮、菜单、窗口，用鼠标点来操作的，就是 GUI。

### Codex、GPT 和 OpenAI 的关系是什么

- OpenAI 是公司和平台
- GPT 是 OpenAI 旗下的大语言模型系列
- Codex 是 OpenAI 面向编程任务的能力或工具形态

codex, gpt, openai对应到豆包就是:豆包app, 豆包大模型, 字节跳动

### ai编程工具: Codex、OpenCode、CC、CCS、Pi Agent

codex和cloude code一样都是官方的ai 编程工具

opencode是口碑比较好的第三方ai 编程工具,用来调用各家的大模型

CC是cloude code的简称

ccs是cloude code switch的简称

pi agent也是一个第三方ai 编程工具,特点是简单,可定制性强(我现在用的就是pi,也是我最喜欢的了)

openclaw 小龙虾,基于pi agent进行开发的个人ai助手, 严格来说不是ai 编程工具了(龙虾濒临灭绝)

### CCS 是什么

全称Cloude code Switch ,用于统一管理api key,方便进行账号切换

### 中转站是什么

由于a社和openai在国外,很多人直接购买"会员"很麻烦,而且封号不断 (这可不是有钱就能正常使用的)

中转就是将官方的额度进行二次计费,然后卖给普通用户

好的中转站就是:"稳定"和"便宜"

中转站的价格一般会比官方的便宜很多, 一般是1 rmb= 1 $, gpt-5.6-sol模型比较划算的的倍率一般是0.2左右, A社的模型会更贵,价格一般是gpt的好几倍

有的中转需要科学上网有的不需要

### API 是什么

一般有两种登录模式,账号登录和api接入, 账号登录就是使用你的gpt账号,适合长期稳定的使用
api登录是给你一个api key类似于sk-xxxxxxxxxxxxxxxxxxxxxxxx, 可以不使用账号直接使用模型, api key就是一把调用ai的钥匙

### Token 是什么

token 可以简单理解为一个"单词"或者一个"汉字", token也可以理解为使用额度 

## 分享

### 去 AI 味 skill

可以看这个项目：

[stop-slop：去 AI 味写作提示与规则](https://github.com/hardikpandya/stop-slop)


### Superpowers

Superpowers 更适合已经开始使用 Claude Code、Codex 这类工具的人。

[superpowers：给 AI 编程工具增强工作流的项目](https://github.com/obra/superpowers)

- 在gpt5.6之前最权威的skill, 对大项目来说很香, 但是小项目可能会比较繁琐, 增加工作量


### UI 设计提示词网站

做页面、海报、App 原型时，提示词很重要。不是因为提示词能替代审美，而是它能帮你把需求讲清楚。

[UI 设计提示词参考](https://youmind.com/zh-CN/nano-banana-pro-prompts)

### ui设计skill

[taste-skill](https://github.com/leonxlnx/taste-skill)现在比较好用的前端skill了

- ui-ux-pro-max,曾经很好用,现在有点落伍了

### 如何使用

使用自然语言调用 或者 /skill强行调用

---
skill只是锦上添花,在日新月异的今天,模型越来越强大,很多情况下将需求提给ai,不需要skill他自己就能完成得很好,skill反而会浪费token,延长思考时间
---

## 最后

ai编程工具 + api key ( + skill + 插件)

嗯嗯,这样你就可以开始你的ai之旅了
