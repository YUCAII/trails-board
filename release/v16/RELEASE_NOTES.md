## 中文

v16.0 在 v15.0 全覆盖台账的基础上，把**怪物图鉴升级为完整版**：属性、掉落、出没地三项数据齐备，全部从游戏数据表实解。

### 怪物图鉴 · 完整版

- **190 只魔兽全收录**，每只显示 HP／攻击／防御／魔法／魔防／命中／敏捷七项属性（与游戏内数值一致）。
- **掉落**（新增）：171 只有掉落，每只 1~2 个掉落槽，显示物品名与掉落率百分比（如「掉落 魔兽鸟肉 45%」）。掉落率直接取自状态表掉落槽参数，分布 15%~100%，其中存在 100% 槽，百分数语义得到验证。Boss／事件怪如实标注「无掉落」。
- **出没地**（新增）：185 只有出没记录，来自全部 46 张地图遭遇表与地点表的反查（如：火爆麻雀→洛连特地区、渡渡鸟→卢安地区／阿伊纳街道、真红企鹅→卡鲁迪亚隧道／托兰特平原道）。5 种无固定出没地的稀有／事件怪（黄金波姆、粉红猿羊、战斗猎犬、使徒 α／β）如实不标注。
- **搜索全面升级**：怪物名、掉落物名、地名都能搜——搜「魔兽鸟肉」直接列出全部 11 只掉落怪，搜「卢安」列出卢安地区所有魔兽。

### 数据与验证

- 掉落槽结构：状态表 190 只怪全部解析，0 条坏数据；物品名回查物品表全部命中。
- 地名来自游戏地点表；回忆／演武等无中文名的战斗专用地图不上板。
- 全部 19 张桌面与手机宽度（412px）回归截图通过。

### 安装

- 下载下方 **trails_board_v16.apk**，Android 6.0+。包名 `com.trails.board` 与 v9 相同、签名不同（装前需卸载 v9）；与 v10 多语言版可共存。
- APK SHA256：`fb9b234e20d2c80a0a9789cd241763caddc96e4e85ede4b3f55875ff5988784f`（`SHA256SUMS-v16.txt` 同步提供）。

### 截图

![搜索魔兽鸟肉](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v16/screenshots/birdmeat-search.png)

![怪物图鉴全览](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v16/screenshots/mons-full.png)

![手机版](https://raw.githubusercontent.com/YUCAII/trails-board/main/release/v16/screenshots/birdmeat-phone.png)

## English

v16.0 upgrades the monster encyclopedia to its complete form: stats, drops and habitats for all 190 monsters, parsed directly from the game's data tables.

- **Drops (new)**: 171 monsters carry 1–2 drop slots with item names and drop-rate percentages taken straight from the status table (rates span 15–100%; a 100% slot confirms the percentage semantics). Boss/event monsters are honestly labeled "no drops".
- **Habitats (new)**: 185 monsters mapped to in-game locations via reverse lookup across all 46 encounter tables and the place table (e.g. Hasty Sparrow → Rolent region; Dodo → Ruan region / Aina road; Crimson Penguin → Kaldia tunnel / Toranto plain).
- **Search (upgraded)**: search by monster name, dropped item name, or location — searching "魔兽鸟肉" (bird meat) lists all 11 monsters that drop it.
- **Validation**: zero bad records across all 190 drop parses; 19 regression screenshots at desktop and 412px phone widths all pass.
- **Install**: Android 6.0+. Package `com.trails.board` (same as v9, different signature — uninstall v9 first); coexists with v10 multilang. APK SHA256 `fb9b234e20d2c80a0a9789cd241763caddc96e4e85ede4b3f55875ff5988784f`.

---

Data are unofficial, extracted from the user's own game copy for research and personal walkthrough use. Game text, names and related assets belong to their respective rights holders.
