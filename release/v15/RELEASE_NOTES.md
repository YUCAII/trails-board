## 中文

**v15.0 是台账的全新一代**：基于从游戏文件重新解析的完整数据管道重建，界面为全新设计的简体中文版。与 v10 多语言版相互独立，可共存安装。

### 本版亮点

**1. 选项台账 · 全覆盖**

87 个委托的「选项」栏全部有明确交代，不再出现"只进选项总览、台账里却空白"的情况。每个委托按证据强度落在三种状态之一：

- **已归属选项**（37 件）：选项组精确挂到对应委托，含推荐项与脚本来源。
- **BP 记账确认**（5 件）：脚本里有 BP 加分调用证据，菜单归属待进一步确认，如实标注而非猜测。
- **确认无 BP 选项**（45 件）：脚本内不存在指向该委托的选项调用，明确显示"✓ 本件没有 BP 选项"。

支撑这组状态的归属引擎做了两层工作：

- **BP 记账链**：解析 SCP 字节码中全部 QUEST_ADDBP 调用，确定每个 BP 选项记在哪件委托名下。
- **CFG 追踪**：对脚本控制流建图（基本块 + 跳转边 + 后向可达性），用"菜单调用是否从该委托的 QUEST 调用点可达"做归属判定，纠正了多处分册错挂。

配套体验：连续分册（如《×事件 ①②③》）自动指引"这一件的选项记在《×事件 ①》名下"；每组连续委托给出 BP 记账枢纽册提示；43 组尚未归属到具体委托的剧情选项按 6 个章节打包，折叠显示在各章相关委托详情页尾部，确保每一个游戏内选项都能在台账里看到。

**2. 战技·魔法全表（123 条）**

从游戏数据表完整解出：8 名主角的全部战技（艾丝蒂尔 / 约修亚 / 雪拉扎德 / 奥利维尔 / 科洛丝 / 阿加特 / 提妲 / 金），含威力、消耗与官方中文说明；结晶魔法与敌方技能一并收录。

**3. 资料库 8 个分区**

- 宝箱 221 处 · 怪物图鉴 190 种 · 商店 60 家 · 料理 394 道 · 支援任务 34 项 · 战斗系统讲解 4 篇 · 战技魔法 123 条 · 小游戏数据
- 小游戏：21 点全部押注档位（5 / 20 / 50 / 200 / 500 / 2500 米拉）与扑克牌型赔付表。

**4. 成就**

游戏内成就 178 项、Steam 成就 43 项，与委托、选项同板联动。

### 截图

![手机版选项台账](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v15/screenshots/choices-phone.png)

![剧情选项折叠区](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v15/screenshots/loose-box.png)

![无选项证明](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v15/screenshots/no-choice-proof.png)

### 安装与兼容

- 下载下方 **trails_board_v15.apk**（约 125 KB，纯本地 WebView 壳 + 内嵌数据，离线可用）。
- Android 6.0+。包名 `com.trails.board` 与原 v9 相同，但**签名不同**：已安装 v9 的设备无法直接覆盖安装，需先卸载 v9（v9 进度不会保留）；v15 与 v10 多语言版（`com.trails.board.multilang`）签名、包名都不同，可共存。
- 校验：`SHA256SUMS-v15.txt` 随发布资产提供；本版 APK SHA256 为
  `6cdf925481d1b5b27b2a36ad63a4ed1d9bab579ac9592ed29eb008a49a95de9a`

### 验证情况

- 全部 87 件委托选项状态经脚本回归（含人工确认 ground truth 表）逐一核对通过。
- 桌面端自动化截图（手机宽度 375px 布局、选项页、资料库各分区）全部通过。
- 数据规模复核：委托 87 / 场景选项组 92 / 战技魔法 123 / 宝箱 221 / 怪物 190 / 商店 60 / 料理 394 / 支援 34 / 成就 178+43。
- APK 完成签名与打包对齐；**尚未做 Android 真机安装测试**。
- 少量战技参数（如范围字段）语义未完全验证，界面中未展示这类不确定字段。

## English

**v15.0 is a new generation of the board**: rebuilt on a data pipeline parsed directly from the game files, with a brand-new Simplified Chinese interface. It is independent from the v10 multilang edition and can be installed alongside it.

- **Choice ledger, full coverage**: all 87 quests now have an explicit entry in the choices column. 37 quests carry precisely attributed choice groups (with recommended picks); 5 quests show confirmed BP-booking evidence pending menu attribution; 45 quests are verified to have no BP choices at all ("✓ no BP choices in this quest"). Attribution is powered by two engines: SCP bytecode QUEST_ADDBP call parsing, and a CFG tracer (basic blocks + backward reachability) that decides which quest a menu belongs to. Consecutive quest booklets cross-reference each other, and 43 unattributed scene-choice groups are bundled per chapter into collapsible sections so every in-game choice is visible in the ledger.
- **Crafts & arts, 123 entries**: all crafts of the 8 playable characters (power, cost, official Chinese descriptions), plus quartz arts and enemy skills.
- **Library, 8 sections**: 221 chests, 190 monsters, 60 shops, 394 recipes, 34 support quests, 4 battle-system articles, crafts/arts table, and minigame data (Blackjack bet tiers 5–2500 Mira, Poker payout table).
- **Achievements**: 178 in-game + 43 Steam, linked with quests and choices.
- **Install**: Android 6.0+. Package `com.trails.board` (same as v9, different signature — uninstall v9 first; cannot upgrade in place). Coexists with v10 multilang. Verify with `SHA256SUMS-v15.txt`; APK SHA256 `6cdf925481d1b5b27b2a36ad63a4ed1d9bab579ac9592ed29eb008a49a95de9a`.
- **Validation**: all choice states passed scripted regression against a manually confirmed ground-truth table; desktop automated screenshots (375px layout included) passed; APK is signed and aligned. Physical-device installation has not been tested. Content is Simplified Chinese only in this edition.

---

Translations and data are unofficial, extracted from the user's own game copy for research and personal walkthrough use. Game text, names and related assets belong to their respective rights holders. The repository contains editable web code and a compiled Android shell; the original Android Java/Kotlin project is not included.
