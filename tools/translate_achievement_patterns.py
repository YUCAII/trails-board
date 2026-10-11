"""Translate repeated achievement conditions with explicit, anchored templates."""
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[1]
rules = [
 (r'完成并报告(?:总计)?(\d+)件委托', 'Complete and report {0} quests', '依頼を{0}件達成して報告する'),
 (r'完成并报告(?:所有|全部73件)委托', 'Complete and report all 73 quests', 'すべての依頼73件を達成して報告する'),
 (r'在战斗手册中登记(\d+)种敌人', 'Register {0} enemy types in the battle notebook', '戦闘手帳に{0}種類の敵を登録する'),
 (r'在战斗手册中登记(?:所有|全部245种)敌人', 'Register all 245 enemy types in the battle notebook', '戦闘手帳に全245種類の敵を登録する'),
 (r'制作(\d+)种成功料理', 'Cook {0} types of successful dishes', '成功料理を{0}種類作る'),
 (r'制作(?:所有|全部68种)成功料理', 'Cook all 68 successful dishes', '全68種類の成功料理を作る'),
 (r'制作(\d+)种珍奇料理', 'Cook {0} types of peculiar dishes', '珍妙料理を{0}種類作る'),
 (r'制作(?:所有|全部58种)珍奇料理', 'Cook all 58 peculiar dishes', '全58種類の珍妙料理を作る'),
 (r'收集(\d+)本(?:情报杂志)?《利贝尔通信》', 'Collect {0} issues of Liberl News', 'リベール通信を{0}冊集める'),
 (r'收集(\d+)本(?:小说)?《红耀石》', 'Collect {0} volumes of Carnelia', '小説《カーネリア》を{0}冊集める'),
 (r'开启(?:总计)?(\d+)个宝箱', 'Open {0} treasure chests', '宝箱を{0}個開ける'),
 (r'开启(?:所有|全部212个)宝箱', 'Open all 212 treasure chests', 'すべての宝箱212個を開ける'),
 (r'将艾丝蒂尔和约书亚的支援(?:能力)?等级提升至(\d+)', "Raise Estelle and Joshua's support ability level to {0}", 'エステルとヨシュアのサポート能力をレベル{0}にする'),
 (r'累计获得(\d+)米拉', 'Earn a total of {0} mira', '合計{0}ミラを獲得する'),
 (r'强化武器(\d+)次', 'Upgrade weapons {0} times', '武器を{0}回強化する'),
 (r'在工房强化武器总计(\d+)次', 'Upgrade weapons at a factory {0} times', '工房で武器を合計{0}回強化する'),
 (r'强化防具(\d+)次', 'Upgrade armor {0} times', '防具を{0}回強化する'),
 (r'在工房强化身体防具或脚部防具总计(\d+)次', 'Upgrade body armor or footwear at a factory {0} times', '工房で身体防具または靴を合計{0}回強化する'),
 (r'强化配件(\d+)次', 'Upgrade accessories {0} times', 'アクセサリーを{0}回強化する'),
 (r'在工房强化配件总计(\d+)次', 'Upgrade accessories at a factory {0} times', '工房でアクセサリーを合計{0}回強化する'),
 (r'强化结晶回路(\d+)次', 'Upgrade quartz {0} times', 'クオーツを{0}回強化する'),
 (r'在工房强化结晶回路总计(\d+)次', 'Upgrade quartz at a factory {0} times', '工房でクオーツを合計{0}回強化する'),
 (r'获得(\d+)种结晶回路', 'Obtain {0} types of quartz', 'クオーツを{0}種類入手する'),
 (r'获得(?:所有|全部84种)结晶回路', 'Obtain all 84 types of quartz', '全84種類のクオーツを入手する'),
 (r'发现(\d+)种魔法', 'Discover {0} arts', 'アーツを{0}種類発見する'),
 (r'设置结晶回路，累计发现(\d+)种魔法', 'Set quartz to discover {0} arts in total', 'クオーツを設定し、合計{0}種類のアーツを発見する'),
 (r'发现所有魔法', 'Discover all arts', 'すべてのアーツを発見する'),
 (r'(?:在指令战斗中累计)?发动(\d+)次勇猛攻击“追击”', 'Use Brave Attack: Follow-Up {0} times in command battles', 'コマンドバトルでブレイブアタック「追撃」を{0}回発動する'),
 (r'(?:在指令战斗中累计)?发动(\d+)次勇猛攻击“连锁”', 'Use Brave Attack: Chain {0} times in command battles', 'コマンドバトルでブレイブアタック「チェイン」を{0}回発動する'),
 (r'发动(\d+)次勇猛攻击“爆裂猛攻”', 'Use Brave Attack: Burst {0} times', 'ブレイブアタック「バースト」を{0}回発動する'),
 (r'累计发动(\d+)次勇猛攻击“爆裂猛攻”或“全面爆裂猛攻”', 'Use Brave Attack: Burst or Full Burst {0} times', 'ブレイブアタック「バースト」または「フルバースト」を{0}回発動する'),
 (r'发动(\d+)次支援能力', 'Use support abilities {0} times', 'サポート能力を{0}回発動する'),
 (r'在指令战斗中累计发动(\d+)次的“支援能力”', 'Use support abilities {0} times in command battles', 'コマンドバトルでサポート能力を{0}回発動する'),
 (r'使用(\d+)次S战技', 'Use S-Crafts {0} times', 'Sクラフトを{0}回使う'),
 (r'在指令战斗中累计发动(\d+)次的S战技', 'Use S-Crafts {0} times in command battles', 'コマンドバトルでSクラフトを{0}回発動する'),
 (r'使用魔法(\d+)次', 'Use arts {0} times', 'アーツを{0}回使う'),
 (r'在指令战斗中累计发动(\d+)次的魔法', 'Use arts {0} times in command battles', 'コマンドバトルでアーツを{0}回発動する'),
 (r'发动先制勇猛攻击(\d+)次', 'Perform {0} preemptive Brave Attacks', '先制ブレイブアタックを{0}回発動する'),
 (r'累计发动(\d+)次的先制勇猛攻击', 'Perform {0} preemptive Brave Attacks in total', '先制ブレイブアタックを合計{0}回発動する'),
 (r'一次同时打倒(\d+)个敌人', 'Defeat {0} enemies at once', '敵を{0}体同時に倒す'),
 (r'在指令战斗时同时打倒(\d+)个敌人', 'Defeat {0} enemies at once in a command battle', 'コマンドバトルで敵を{0}体同時に倒す'),
 (r'使用超能驱动(\d+)次', 'Use Boost {0} times', 'ブーストを{0}回使う'),
 (r'在指令战斗中累计发动(\d+)次的超能驱动', 'Use Boost {0} times in command battles', 'コマンドバトルでブーストを{0}回発動する'),
 (r'达成[ｘ×](\d+\.\d+)以上的战术奖励', 'Achieve a tactical bonus of ×{0} or higher', 'タクティカルボーナス×{0}以上を達成する'),
 (r'使战术奖励达到×(\d+\.\d+)以上', 'Achieve a tactical bonus of ×{0} or higher', 'タクティカルボーナス×{0}以上を達成する'),
 (r'在迅捷战斗中完成搭档攻击(\d+)次', 'Perform {0} partner attacks in field battles', 'フィールドバトルでパートナーアタックを{0}回行う'),
 (r'在迅捷战斗中累计发动(\d+)次的搭档攻击', 'Perform {0} partner attacks in field battles in total', 'フィールドバトルでパートナーアタックを合計{0}回発動する'),
 (r'在迅捷战斗中累计击败(\d+)个敌人', 'Defeat {0} enemies in field battles', 'フィールドバトルで敵を合計{0}体倒す'),
 (r'累计击败(\d+)个敌人', 'Defeat {0} enemies in total', '敵を合計{0}体倒す'),
 (r'在迅捷战斗或指令战斗中累计击败(\d+)个敌人', 'Defeat {0} enemies in field or command battles', 'フィールドバトルまたはコマンドバトルで敵を合計{0}体倒す'),
 (r'割取(\d+)次草[或和]花', 'Cut grass or flowers {0} times', '草や花を{0}回刈る'),
 (r'在原野中累计割取(\d+)次草或花', 'Cut grass or flowers in the field {0} times', 'フィールドで草や花を合計{0}回刈る'),
 (r'破坏(\d+)次可破坏物体', 'Destroy breakable objects {0} times', '破壊可能な物を{0}回壊す'),
 (r'在原野中累计破坏(\d+)次可破坏物体', 'Destroy breakable objects in the field {0} times', 'フィールドで破壊可能な物を合計{0}回壊す'),
 (r'在迅捷战斗中达成精准闪避(\d+)次', 'Perform {0} perfect dodges in field battles', 'フィールドバトルでジャスト回避を{0}回成功させる'),
 (r'在迅捷战斗中成功执行(\d+)次的精准闪避', 'Successfully perform {0} perfect dodges in field battles', 'フィールドバトルでジャスト回避を{0}回成功させる'),
 (r'击败(\d+)只闪耀波姆', 'Defeat {0} Shining Poms', 'シャイニングポムを{0}体倒す'),
 (r'在迅捷战斗或指令战斗中击败(\d+)只闪耀波姆', 'Defeat {0} Shining Poms in field or command battles', 'フィールドバトルまたはコマンドバトルでシャイニングポムを{0}体倒す'),
]
people = {'艾丝蒂尔': ('Estelle', 'エステル'), '约书亚': ('Joshua', 'ヨシュア'), '雪拉扎德': ('Scherazard', 'シェラザード'), '奥利维尔': ('Olivier', 'オリビエ'), '克萝赛': ('Kloe', 'クローゼ'), '阿加特': ('Agate', 'アガット'), '缇妲': ('Tita', 'ティータ'), '阵': ('Zin', 'ジン')}
source = json.loads((root/'app/translation-items.json').read_text(encoding='utf-8'))
translated = {}
for ident, zh in source:
    if not 1112 <= ident < 1470:
        continue
    value = zh.removesuffix('。').removesuffix('吧')
    pair = None
    for pattern, en, ja in rules:
        if match := re.fullmatch(pattern, value):
            pair = [en.format(*match.groups()), ja.format(*match.groups())]
            break
    if match := re.fullmatch(r'解锁(3个)?(.+)的(?:所有)?导力器插槽', value):
        amount, person = match.groups()
        if person in people:
            en, ja = people[person]
            pair = [f"Unlock {'3' if amount else 'all'} of {en}'s orbment slots", f'{ja}のオーブメントのスロットを' + ('3個解放する' if amount else 'すべて解放する')]
    if pair:
        if zh.endswith('。'):
            pair = [pair[0]+'.', pair[1]+'。']
        translated[str(ident)] = pair
    else:
        print(ident, zh)
(root/'app/translations/translated-achievement-patterns.json').write_text(json.dumps(translated, ensure_ascii=False, indent=2), encoding='utf-8')
print('Pattern translations:', len(translated))
