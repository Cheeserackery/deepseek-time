# DeepSeek Time DSH 适配器

此目录是 DeepSeek Harness（DSH）适配器。插件使用原生 `conversation.input.dock` 插槽，并将图标放在侧边栏外侧靠近窗口底部的位置；支持指针拖拽、视口边界限制，并会记忆上次位置。

鼠标悬停图标时，插件通过 DSH Host 侧接口查询余额。Host 使用 DSH 凭据服务解析 `DEEPSEEK_API_KEY`，只请求 `https://api.deepseek.com/user/balance`；API Key 不会进入浏览器或插件界面。Host 会缓存结果 5 分钟。未配置 Key 或接口失败时，插件仍正常显示时段和倒计时，仅显示通用余额状态。

## 构建

在仓库根目录执行：

```powershell
npm run build
npm run verify
```

构建会生成 `lib/client.js`、`lib/index.js` 以及 `src/` 下的共享模块。生成文件不要手动编辑。必须保留 `lib/index.js`，它是纯 Web 客户端包所需的空宿主入口，缺失可能导致 DSH 启动失败。

## 安装到 DSH

将仓库克隆到本地后，在 DSH Web profile 目录执行以下命令，把 `<仓库路径>` 替换为实际路径：

```powershell
pnpm add "file:<仓库路径>\adapters\dsh"
pnpm install
```

编辑 DSH Web profile 目录下的 `package.json`，在已有的 `dsh.profile.bundles` 数组中加入一次 `deepseek-time`，保留其他 bundle。`pnpm add` 只会添加依赖，不会自动选择 bundle。包内的 `dsh.bundle` 和 `dsh.client` 元数据会提供所需注册，不要删除包根导出、`main`、`lib/index.js` 或 `cordis.patch.yml`。编辑后运行 `pnpm install`，再重启 DSH。

相关结构应类似下面这样：

```json
{
  "dsh": { "profile": { "bundles": ["已有 bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<仓库路径>/adapters/dsh" }
}
```

请将条目合并到现有对象中，不要覆盖 profile 的其他 bundle 或依赖。

从旧版本升级时，先把 profile 依赖路径中的 `adapters/harness` 改为 `adapters/dsh`，不要保留旧路径，再运行 `pnpm install`。已有安装更新时，先在仓库根目录运行 `npm run build`，再重复上述 `pnpm add` 和 `pnpm install`，确认 bundle 列表后重启 DSH。如果插件不显示，请确认 profile 依赖指向本目录且 `lib/client.js` 已生成。

## 卸载

在 DSH Web profile 目录执行：

```powershell
# 先从 package.json 的 dsh.profile.bundles 中删除 "deepseek-time"。
pnpm remove deepseek-time
pnpm install
```

卸载后重启 DSH。

## 兼容性说明

- 该适配器包含 DSH Host 侧余额路由和 Web 客户端入口；它不会替换或修改 DSH 应用本身。
- 显示余额需要在 DSH 的模型/凭据设置中配置 `DEEPSEEK_API_KEY`。不要把 Key 写入 `package.json`、源代码、浏览器存储或 GitHub 仓库。
- 拖拽位置属于浏览器配置数据；清除站点数据后会恢复到侧边栏外侧的默认位置。
- 共享规则使用北京时间：高峰时段为 `09:00-12:00` 和 `14:00-18:00`，其余为空闲时段。
- DSH 版本需要提供 `conversation.input.dock` 插槽；本适配器不会修改 DSH 源码或注入全局 CSS。
- 项目采用 MIT 开源协议，详见仓库根目录 `LICENSE`。
