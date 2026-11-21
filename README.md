# DSH-EVA · DeepSeek Harness 人格与记忆插件

给 DSH 一个可编辑的持续人格，并在本机的不同对话间延续长期记忆。插件显示名为 **DSH-EVA**（包名与安装目录仍是 `dsh-persona-memory`）。首版针对本机 **DeepSeek Harness 0.2.2-rc.5** 开发。

## 安装和使用

**从 GitHub 安装**

在 **插件 → 添加插件** 里填仓库地址（本仓库根目录就是插件包，含 `package.json` 与 `cordis.patch.yml`）：

```
https://github.com/Snowfox-2887/DSH-EVA
```

或使用命令行：

```
dsh plugin --profile desktop add https://github.com/Snowfox-2887/DSH-EVA
```

桌面版使用 `desktop` profile；Web 版按实际配置改为 `web`。无需构建：仓库里已包含可直接运行的 ESM 入口和客户端模块。

**本地安装（开发）**

在 **插件 → 添加插件** 中选择本仓库根目录。根据安装结果启用插件；如果 DSH 提示需要重启，再按提示重启。不要手工改写 profile 中的插件清单。

安装完成后：侧栏 **插件 → 已安装插件** 里有“DSH-EVA”卡片，卡片和它的插件行的开关控制整个插件是否运行；**设置 → DSH-EVA** 里的三个开关（启用人格 / 启用跨对话记忆 / 主动记忆）控制功能本身。

左侧栏在 **插件** 和 **自动化** 下面多了两个入口：**EVA 人格** 和 **EVA 记忆**。人格页可以改名字、性别、性格、语气和情绪、表达方式、身份与定位、回答与记忆、日常与职责、会话开场，共九个字段并保存；记忆页有「启用跨对话记忆 / 主动记忆」开关、搜索、添加、编辑和遗忘，两个页面都能直接改设定。

“长期记忆”页可以添加、搜索、分类、编辑、优先回忆和遗忘记忆。两个模型工具 `dsh_persona` 和 `dsh_long_memory` 使用同一份数据。可对模型说“请记住，我喜欢简洁的中文回答”，再在新对话中询问自己的回答偏好。

“主动记忆”默认开启，会引导模型调用记忆工具保存重要信息；它依赖模型调用工具，并不保证每句话都会保存。“主动记忆”关闭后提示模型仅按用户要求写入。“启用跨对话记忆”关闭时，模型的记忆工具读写均被拒绝，原记录保留供用户管理。

## 数据与作用范围

- 人格与记忆保存在 `$DSH_HOME/persona-memory/memory.sqlite`；未设置 `DSH_HOME` 时使用当前用户的 `~/.dsh/persona-memory/memory.sqlite`。目录名跟随包名，与显示名 DSH-EVA 无关。
- 从旧版六字段人格升级时，打开数据库会把人格归一到当前九项并写回；缺失项用默认值补齐，无法对应的旧字段不删除，保留在导出数据的 `legacyPersona` 中。修订号不变，不会让已打开的编辑页误报冲突。
- 使用同一数据目录并启用该插件的 DSH 对话共享数据。不同电脑或独立的 `DSH_HOME` 不会自动同步。
- 使用 SQLite 事务持久化；多个实例的写入串行处理。带版本的修改可防止旧编辑覆盖新内容。
- 不读取或迁移 `dsh-memory-evolve` 的内容，不改写已有对话记录。遗忘仅删除长期记忆条目，已有对话中出现的文字不会被删去。
- 记忆会进入发送给当前对话模型的上下文。本插件不额外调用模型、不上传整个数据库，也没有独立云端服务。
- 以人格系统段与受长度限制的记忆上下文接入 DSH；更多记忆通过工具检索。人格是持续的行为与表达设定，不代表产生主观意识。

## 实现与验证

零第三方运行依赖，使用 Node 内置 SQLite。Host 通过 `systemPrompt.section/context` 和 `tools.register` 接入；设置页使用原生 `settings.section` 槽位与 React。管理请求走 DSH 的认证 Connection 路由，只有 owner 身份可以访问。

运行 `node --test tests/*.test.js` 验证跨实例持久化、并发版本检查、中文检索、去重、编辑、遗忘、上下文长度和模型/UI 操作一致性。

开发参考：本机安装包内的 `dsh-doc`、`dsh-system-prompt`、`dsh-tools`、`dsh-client-connection` 和 `dsh-client-ui-settings` 源码；上游项目：https://github.com/deepseek-ai/deepseek-harness 。

## 开发

仓库根目录包含 `package.json`、`cordis.patch.yml`、`index.js` 和 `client.js`，没有构建步骤。使用 Node.js 22.13 或更新版本运行测试：

```
git clone https://github.com/Snowfox-2887/DSH-EVA.git
cd DSH-EVA
node --test tests/*.test.js
```

问题反馈：[GitHub Issues](https://github.com/Snowfox-2887/DSH-EVA/issues)。

仓库里带 `tests/` 方便跑测试，但 `pnpm pack` 的 tarball 只包含运行所需文件。
