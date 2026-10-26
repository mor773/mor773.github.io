# 物联空间 · 设备监测平台

无需构建、可直接部署到 GitHub Pages 的静态物联网演示网站。

## 页面流程

场景总览 → 选择场景 → 设备列表 → 身份验证 → 传感器详情。

首次访问可以浏览场景与设备，查看传感器详情前需要登录。已登录的用户切换设备时直接按当前身份显示，无需重复输入密码。刷新会返回场景总览，当前标签页保留登录状态。

场景：

- 猪舍温湿氨气检测：温度、湿度、氨气浓度。
- 高压线材侦测：线材温度、电压、电流（当前演示配置，可在 JSON 中调整）。

每类场景预置三台设备，包含正常、预警、离线状态。图表显示最近八次模拟采样；离线设备标注为最后一次模拟数据。设备状态、读数与历史均为模拟快照，不会自动刷新，也没有接入 PCB、MQTT 或真实传感器。

## 身份与体验账号

| 账号 | 密码 | 身份 | 页面权限 |
| --- | --- | --- | --- |
| customer | 123456 | 客户 | 只读传感器、趋势、告警与设备信息 |
| admin | 123456 | 管理员 | 客户功能 + 修改设备配置 |
| developer | 123456 | 开发人员 | 管理员功能 + 报错类型、级别、来源 |

编辑 `users.json` 的 `role` 可切换身份：`customer`、`admin`、`developer`。缺失或无效的身份默认客户。部署更新后退出并重新登录即可生效。账号 ID 和 username 应保持唯一。不提供公开注册。

密码保存为 SHA-256 哈希。生成新哈希：

```bash
python3 -c 'import getpass,hashlib; print(hashlib.sha256(getpass.getpass("新密码: ").encode()).hexdigest())'
```

## 设备配置

`devices.json` 维护场景、指标定义、设备、读数、模拟历史和诊断信息。

管理员和开发人员可以修改设备名称、位置、采样周期与各传感器告警阈值。保存后按新阈值重新计算告警；最小阈值必须小于最大阈值，采样周期为 1–3600 秒整数。

页面修改通过 localStorage 保存在当前浏览器，该浏览器的其他身份也会看到同一份设备配置，不会同步其他浏览器或写回托管文件，也不会下发真实硬件。导出 JSON 后，用导出的 `devices.json` 替换仓库的 `devices.json` 可以持久部署。已有本地配置会覆盖 JSON 默认值，使用“恢复默认”移除当前设备的本地覆盖。

开发人员详情中的诊断显示超限或离线报错类型，正常设备显示 NONE。客户、管理员不显示开发诊断面板。

## 本地预览

```bash
python3 -m http.server 8000
```

打开 http://localhost:8000 。请通过 HTTP 服务打开，直接双击 HTML 无法加载 JSON。

## 上传到 GitHub Pages

解压 `workspace-github-pages.zip`，将以下文件上传至 https://github.com/mor773/mor773.github.io 的根目录（不要只上传 ZIP）：

```text
index.html
styles.css
app.js
.nojekyll
users.json
devices.json
```

在仓库 Settings → Pages 中选择 **Deploy from a branch**，选择文件所在分支（通常为 `main`）和 **/ (root)**。部署完成后访问 https://mor773.github.io/ 。静态资源均使用相对路径，也支持子目录部署。

## 演示边界

GitHub Pages 上的 JSON、密码哈希、模拟设备数据和前端代码均可公开访问，前端身份判断可被浏览器修改。这版实现用于测试逻辑和界面，不提供安全认证或真实访问控制。正式使用需后端验证密码与权限、保存配置，并接入真实设备数据；不要放入真实密码或敏感信息。

Google Fonts 加载失败时自动使用系统字体，不影响页面操作。

部署文件使用仓库根目录的 users.json 和 devices.json。GitHub Pages 使用 main 分支根目录部署。
