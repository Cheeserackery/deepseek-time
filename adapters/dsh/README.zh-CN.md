# DeepSeek Time DSH 适配器

此目录是 DeepSeek Harness（DSH）适配器，面向 DSH `0.2.2-rc.1` 及之后的 `0.2.x` 版本。插件注册到由 `@deepseek-ai/dsh-client-ui-layout` 声明的框架级 `shell.overlay` 插槽：图标在切换会话时不会消失（空白的“新会话”界面同样常驻），也不会被任何滚动容器裁剪。默认位置在侧边栏右侧、靠近窗口底部；支持指针拖拽、窗口边界限制，并会记忆上次位置；双击图标可恢复默认位置。

`shell.overlay` 正是 DSH 为“框架级状态挂件”提供的插槽：浮层本身不拦截指针事件，每个条目再自行接管交互，因此图标不会挡住下方应用。

鼠标悬停或键盘聚焦时，图标会显示详情卡（计价时段、北京时间下一次切换点、账户余额），并通过 DSH Host 侧接口查询最新余额。Host 使用 DSH 凭据服务解析 `DEEPSEEK_API_KEY`，只请求 `https://api.deepseek.com/user/balance`；API Key 不会进入浏览器或插件界面。正在进行的并发悬停请求会合并，但已完成的结果不再缓存。未配置 Key 或接口失败时，插件仍正常显示时段和倒计时，并显示简短的余额状态。

## 包契约

包清单声明了 DSH `0.2.x` 的插件契约：

- `dsh.manifestVersion: 1` 与 `engines.dsh: "^0.2.2-rc.1"`：DSH 0.2.2-rc.1 及后续 `0.2.x` 会加载该插件；更旧的版本会直接拒绝，而不是加载不兼容的客户端代码。
- `dsh.client`：Web 客户端入口，加载时先注入 `@deepseek-ai/dsh-client-ui-layout`，并在启动时立即加载，因此不打开会话也能看到图标。
- `dsh.bundle.patch`：通过 `cordis.patch.yml` 选中 `deepseek-time` Loader 行。
- `icon` 与 `locale/en.json`、`locale/zh.json`：DSH 插件管理器读取的标题、描述与详情文档。

## 构建

在仓库根目录执行：

```powershell
npm run build
npm run verify
```

构建会生成 `lib/client.js`、`lib/index.js`、`icon.svg` 以及 `src/` 下的共享模块。生成文件不要手动编辑。必须保留 `lib/index.js`：它是注册余额路由的 Host 入口，删除后会直接导致启动失败。

## 安装到 DSH

Web profile 目录通常是 `<DSH_HOME>\profiles\<profile>`（桌面版为 `%DSH_HOME%\profiles\desktop`）。在该目录执行：

```powershell
pnpm add "file:<仓库路径>\adapters\dsh"
pnpm install
```

然后编辑 profile 的 `package.json`，在已有的 `dsh.profile.bundles` 数组中加入一次 `deepseek-time`：

```json
{
  "dsh": { "profile": { "bundles": ["已有 bundle", "deepseek-time"] } },
  "dependencies": { "deepseek-time": "file:<仓库路径>/adapters/dsh" }
}
```

请将条目合并到现有对象中，不要覆盖 profile 的其他 bundle 或依赖。`pnpm add` 只添加依赖，不会自动选择 bundle；编辑后重启 DSH。

之后也可以在 DSH 的 **设置 → 插件** 中启用或停用该 bundle，插件管理器写入的是同一份 `dsh.profile.bundles` 选择。DSH 升级后请确认插件仍处于启用状态：超出 `engines.dsh` 范围的版本会被直接拒绝，而不是静默加载。

卸载时先从 `dsh.profile.bundles` 删除 `deepseek-time`（或在插件管理器中停用），再执行 `pnpm remove deepseek-time` 和 `pnpm install`，最后重启 DSH。

## 兼容性说明

- 需要 DSH `0.2.2-rc.1` 或之后的 `0.2.x`。适配器依赖 `@deepseek-ai/dsh-client-ui-layout` 声明的 `shell.overlay` 插槽；不修改 DSH 应用源码，也不注入全局 CSS。
- 定位只读取两项有文档保证的 DOM 事实：`data-shell-overlay` 浮层属性与侧边栏的网格列位置；侧边栏折叠、抽屉模式和窗口缩放都会自动跟随。
- 配色使用 DSH 主题变量并提供回退值，浅色与深色主题下都能正常显示。
- 显示余额需要在 DSH 的模型/凭据设置中配置 `DEEPSEEK_API_KEY`。不要把 Key 写入 `package.json`、源代码、浏览器存储或 GitHub 仓库。
- 拖拽位置属于浏览器配置数据；清除站点数据后会恢复默认位置。
- 共享规则始终使用北京时间：周一至周五高峰时段为 `09:00-12:00` 和 `14:00-18:00`；周六、周日全天为空闲时段。
- 若 DSH 升级后提示插件不兼容，请先更新本适配器；只有在确认构建可信时，才用 `dsh plugin allow-version` 或插件管理器授予精确版本豁免。
- 项目采用 MIT 开源协议，详见仓库根目录 `LICENSE`。
