# 物联空间：供应链物联网网页

静态演示站，可构建后部署到 GitHub Pages。通过账号密码登录，按身份展示不同入口。

## 页面视觉与交互

客户展示首页参考 Azure IoT 的产品页结构：蓝色渐变首屏、设备监测界面示意、吸顶栏目导航、可折叠的平台概述、农牧链/工业链方案、功能卡片、三步使用流程与登录区域。首页图表数值明确标为界面示意，不代表真实设备采样；登录后进入原有公司工作台。

动态效果包括首屏图表绘制与光环呼吸、连接图数据流、行业切换过渡、内容随滚动出现及悬停反馈。系统启用“减少动态效果”时自动关闭动画。首页支持手机排版，不依赖第三方动画库或远程图片。

## 身份与页面

| 身份 | 登录后入口 | 功能 |
| --- | --- | --- |
| 平台管理员 `admin` | 供应链平台 | 农牧链 / 工业链 / 物流链 / 测试，查看公司，编辑公司 Markdown 页面 |
| 客户开发者 `developer` | 所属公司 | 首页 / 新闻 / 我的，查看设备，添加 / 删除 / 恢复本公司设备，修改阈值、查看报错 |
| 客户 `customer` | 所属公司 | 首页 / 新闻 / 我的，只读设备数据 |

演示账号为 `admin`、`developer`、`customer`、`customer_b`，密码均为 `123456`。`customer` 和 `developer` 属于公司 A；`customer_b` 属于公司 B。

管理员进入农牧链后可选种植园、养殖场；工业链可选生产、维保；物流链可选仓储，云仓物流展示仓库温度、湿度与光照强度的模拟采样。进入场景后选择公司。

公司首页显示设备总数、在线数量、预警数量和设备列表。只有一台预警设备时点击预警直接进入该设备；多台时显示预警列表。离线设备显示最后一次模拟值。

公司工作台使用蓝色运行概览、状态环图、可切换设备的采样曲线，以及包含具体读数的设备卡片；“需要关注”清单可直达预警或离线设备。数据均来自当前公司的 JSON 模拟快照与已有历史采样，不生成实时读数。底部同步显示本公司可见的最新新闻。

客户与客户开发者使用深色侧栏的数据驾驶舱，提供概览、设备管理、数据监测、告警中心、新闻和个人入口。顶部城市背景只用于欢迎区和统计卡片所在区域，图片位于 `assets/workspace/city.jpg`。设备表支持名称、ID、位置搜索；顶部搜索按 Enter 后跳转到设备表。采集点分布是可点击的布局示意，未提供经纬度，因此不代表真实地图位置。

## 账号与公司配置

`users.json` 中的 `role` 支持 `customer`、`developer`、`admin`，省略或不识别时默认客户。`companyId` 指向 `platform.json` 的公司 ID。平台管理员只能在此文件配置，不开放注册。

网页注册默认创建客户，存储于当前浏览器 localStorage，不能跨浏览器共享。若需长期分配开发者身份，应将账号加入 `users.json`，填写 `passwordHash`、`role` 和 `companyId`。JSON 账号优先于同名本地注册账号。密码字段使用 SHA-256，可生成：

```bash
python3 -c "import getpass,hashlib; print(hashlib.sha256(getpass.getpass('密码: ').encode()).hexdigest())"
```

这只是前端身份与路由演示，不是真实身份认证或公司数据隔离。JSON 数据可被访客下载，浏览器存储可被修改；正式部署敏感数据需要后端登录、密码安全散列与服务端权限校验。注册时选择公司也是演示逻辑，正式版本应使用审核或邀请。

## Markdown 自动生成公司首页

`platform.json` 定义产业链、场景与公司。每家公司的 `template` 指向 `content/companies/公司ID.md`。

首页文件包含恰好一个 dashboard 配置块，其余正文支持标题、段落、列表和粗体，HTML 会转义：

````markdown
# 公司首页

```dashboard
{
  "title": "公司 A，欢迎回来",
  "subtitle": "查看设备与预警",
  "accent": "green",
  "widgets": ["total", "online", "alerts"],
  "showDevices": true
}
```

## 运营提示

- 点击预警查看异常设备。
````

`accent` 可选 `green`、`blue`、`purple`、`orange`。`widgets` 控制统计项的显示和顺序；`showDevices` 控制设备列表。

管理员进入公司，点击“配置页面”，可预览、保存、导出 Markdown。网页保存仅影响当前浏览器；导出后替换对应 `.md` 文件并部署才会共享给其他人。阈值修改同样保存在当前浏览器；导出 JSON 可得到完整设备配置，其余公司保留原始配置，不会向真实设备下发指令。

## Markdown 新闻文章

平台管理员在 `_news/` 中新增 `.md` 文件，新闻列表自动按日期倒序排列，点击标题或“阅读全文”打开正文。正文提供目录、返回列表和上一篇/下一篇。

例如 `_news/2026-10-28-example.md`：

```markdown
---
title: 设备巡检通知
date: 2026-10-28
author: 平台管理员
summary: 本周设备巡检安排。
image: assets/news/platform-update.png
companyId: company-a
draft: false
---

## 巡检安排

请检查设备供电和网络连接。

- 查看设备在线状态。
- 点击预警定位异常设备。
```

`title` 必填；日期省略时读取文件名开头的 `YYYY-MM-DD`；摘要省略时自动提取。省略 `companyId` 表示所有公司可见，填写时应使用 `platform.json` 中已有的公司 ID。`draft: true` 不发布。管理员可查看全部文章；这些范围是前端演示规则，静态文章内容仍然公开可下载。

新闻列表使用左文右图卡片，`image` 指定封面路径，例如 `assets/news/platform-update.png`，也支持 HTTPS 图片地址。封面建议横向图片，约 16:10；图片会裁切填满右侧区域。未填写、路径不支持或加载失败时显示默认封面。手机上图片移到正文摘要下方。

支持标题、段落、粗体、斜体、列表、引用、代码块、链接和图片，HTML 会转义。图片放在 `assets/news/`，正文使用 `![图片说明](assets/news/example.jpg)`。暂不支持 Markdown 表格和 Mermaid 渲染。

本地 `serial_server.py` 每次请求都扫描目录，重新进入“新闻”即可读取新文章。普通静态服务器无法扫描目录，需要先构建，并复制生成的索引到根目录：

```bash
.venv/bin/python scripts/build_site.py
cp dist/news-index.json news-index.json
```

### GitHub Pages 自动发布

仓库已包含 `.github/workflows/pages.yml`。在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，之后推送到 `main` 会自动扫描 `_news/`、生成 `dist/` 并发布。文章格式错误会让构建失败，避免静默漏发；本地新闻页会显示错误文件。本次未在 GitHub 远程执行发布。

## 本地预览与测试

```bash
cd /home/vovl773/rd-web
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python serial_server.py --port 8002
```

打开 http://127.0.0.1:8002/ 。普通静态预览也可使用 `python3 -m http.server 8002`，但不提供采集 API。

登录 `admin` → 测试 → USB 或本地联网。两种源独立维护消息缓冲区；MQTT 也可由客户开发者的设备管理入口启动接收，不烧录固件。

```bash
.venv/bin/python serial_server.py --source both --port 8002 --device /dev/ttyUSB0 --baudrate 9600 --mqtt-host 127.0.0.1 --mqtt-port 1883 --mqtt-topic 'rd-web/test/#'
```

USB 测试按行读取串口。MQTT 测试订阅指定 Broker，Broker 需要单独运行；可用项目中的测试 Broker：

```bash
.venv/bin/python mqtt_test_broker.py
```

设备必须已配置为向对应 Broker / Topic 发消息。页面会显示实际连接错误与原始接收消息，不会伪造设备连接成功。暂停、清空仅影响显示；服务最多保留 500 条。`--source serial` 或 `--source mqtt` 可只启用一种源。

本地采集 API 仅接受 localhost/127.0.0.1 同源访问。服务只提供白名单站点资源，不公开固件、本地配置和 Git 文件；API 本身没有正式账号认证，仅用于本机测试。GitHub Pages 不运行 Python 服务，也不能直接读取 USB 或 TCP 1883。

## 主要文件

- `index.html`、`styles.css`：页面入口与样式。
- `visual.js`：入口页、场景插画、行业标签切换与入场动效。
- `portal.js`：登录注册、身份分流、产业链/公司路由、Markdown 首页。
- `app.js`：设备监测、阈值编辑、预警与采集展示。
- `users.json`：账号、身份、公司关联。
- `platform.json`、`content/companies/*.md`：平台结构与公司页面配置。
- `_news/*.md`、`news.js`：新闻源文件、列表与正文渲染。
- `news_content.py`、`scripts/build_site.py`：自动扫描文章与静态网站构建。
- `devices.json`：公司设备、传感器、模拟快照与诊断数据。
- `serial_server.py`、`mqtt_monitor.py`：本地 USB/MQTT 接收服务。

使用 GitHub Actions 时提交网站源码、`_news`、`content`、构建脚本和工作流即可；手动部署时上传 `dist/` 内全部文件。请勿上传 `.venv`、WiFi 密码、固件私密配置或 Git 凭据。

## 客户开发者设备管理

客户开发者可从侧栏“设备管理”或工作台“管理设备”进入，添加、删除、恢复本公司设备。可选设备类型由 `platform.json` 中业务场景的 `sceneIds` 指定。设备 ID 不区分大小写查重，已删除设备的 ID 保留，可恢复使用。新增设备必须先通过 MQTT 实际上报：打开管理页后自动监听本地接收服务，选择已发现的设备、预览指标，再填写设备名称、安装位置等信息才能添加。页面不扫描 IP；设备需要连接同一局域网可达的 MQTT Broker，并发布到服务订阅的 Topic。场景只决定业务分类，监测卡片和详情指标按实际上报动态生成，不再套用场景的固定传感器列表。

设备增删记录保存于当前浏览器 localStorage，刷新后保留，同一浏览器的客户和管理员读取相同的本地设备列表。管理页可导出完整 `devices.json`（包含本公司新增、删除及配置修改，保留其他公司的设备）；替换项目文件并重新部署后其他浏览器才能读取。删除前需确认，可在“已删除设备”中恢复；不会向硬件发送指令。该功能沿用静态站演示权限，生产部署仍需服务端鉴权和持久化接口。


### MQTT 发现与动态监测

通过本地预览服务启动，替换下面的 Broker 地址及 Topic 为实际配置：

```bash
.venv/bin/python serial_server.py --port 8002 --source mqtt --mqtt-host 192.168.1.100 --mqtt-topic 'sensors/#'
```

浏览器仍访问 `http://127.0.0.1:8002/`，登录客户开发者 → 设备管理。没有收到可识别的有效上报时不能直接添加。可读取以下文本：

```text
温度：10 ℃  湿度：42％
```

温度统一显示 `℃`。也支持 JSON 数值、带单位字符串或 `{value, unit}` 形式；`data`、`metrics`、`values` 对象可作为指标容器：

```json
{
  "device_id": "sensor-001",
  "name": "温湿度终端",
  "data": {
    "temperature": {"value": 10, "unit": "℃"},
    "humidity": {"value": 42, "unit": "%"},
    "光照": {"value": 100, "unit": "lx"}
  }
}
```

设备按 Topic 与 `device_id`（也支持 `deviceId`、`id`）组合识别。未提供 ID 时，一个 Topic 视为一台设备；多个设备共用 Topic 必须带各自 ID。每条上报视为当前完整指标集合，字段增减会更新卡片，最近 30 次实际接收值形成趋势，不推测数据。温湿度以外的数值字段按原名称和单位展示。新指标默认没有告警阈值，可在设备配置中设置。

保留消息可预览但不能据此添加或判定在线。超过 `max(15 秒, 3 × 配置采样周期)` 没有新上报或接收服务断开时显示离线，保留最后接收值。刷新后保留设备绑定，收到数据前显示待接收；请将网页采样周期设置为设备实际周期，该设置不会修改固件。发现列表仅覆盖接收缓冲区和当前打开页面期间收到的消息。GitHub Pages 只展示静态站点，设备发现和实时监测需要本地服务。
