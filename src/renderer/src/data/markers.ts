/**
 * Original marker catalogue. Marker ids follow a stable, XMind-like naming
 * scheme so they can be stored in documents without depending on any external
 * asset pack. Icons are plain emoji, rendered by the platform font.
 */
export interface MarkerDef {
  id: string
  label: { zh: string; en: string }
  icon: string
  group: string
}

export interface MarkerGroup {
  id: string
  label: { zh: string; en: string }
  markers: MarkerDef[]
}

type MarkerSeed = [id: string, icon: string, zh: string, en: string]

function makeGroup(
  id: string,
  zh: string,
  en: string,
  seeds: MarkerSeed[]
): MarkerGroup {
  return {
    id,
    label: { zh, en },
    markers: seeds.map(([markerId, icon, zhLabel, enLabel]) => ({
      id: markerId,
      icon,
      label: { zh: zhLabel, en: enLabel },
      group: id
    }))
  }
}

export const MARKER_GROUPS: MarkerGroup[] = [
  makeGroup('priority', '优先级', 'Priority', [
    ['priority-1', '🔴', '最高优先级', 'Highest priority'],
    ['priority-2', '🟠', '高优先级', 'High priority'],
    ['priority-3', '🟡', '中高优先级', 'Medium-high priority'],
    ['priority-4', '🟢', '中优先级', 'Medium priority'],
    ['priority-5', '🔵', '中低优先级', 'Medium-low priority'],
    ['priority-6', '🟣', '低优先级', 'Low priority'],
    ['priority-7', '⚪', '最低优先级', 'Lowest priority']
  ]),
  makeGroup('task', '任务进度', 'Task progress', [
    ['task-start', '⏳', '开始', 'Started'],
    ['task-oct', '🌱', '完成 10%', '10% done'],
    ['task-quarter', '🌿', '完成 25%', '25% done'],
    ['task-3oct', '☘️', '完成 37%', '37% done'],
    ['task-half', '🌾', '完成 50%', '50% done'],
    ['task-5oct', '🍀', '完成 62%', '62% done'],
    ['task-3quar', '🌳', '完成 75%', '75% done'],
    ['task-7oct', '🎋', '完成 87%', '87% done'],
    ['task-done', '✅', '已完成', 'Done']
  ]),
  makeGroup('flag', '旗帜', 'Flags', [
    ['flag-red', '🟥', '红色旗标', 'Red flag'],
    ['flag-orange', '🟧', '橙色旗标', 'Orange flag'],
    ['flag-yellow', '🟨', '黄色旗标', 'Yellow flag'],
    ['flag-green', '🟩', '绿色旗标', 'Green flag'],
    ['flag-blue', '🟦', '蓝色旗标', 'Blue flag'],
    ['flag-purple', '🟪', '紫色旗标', 'Purple flag']
  ]),
  makeGroup('star', '星标', 'Stars', [
    ['star-yellow', '⭐', '黄色星标', 'Yellow star'],
    ['star-orange', '🌟', '橙色星标', 'Orange star'],
    ['star-red', '🌠', '红色星标', 'Red star'],
    ['star-green', '💫', '绿色星标', 'Green star'],
    ['star-blue', '✨', '蓝色星标', 'Blue star'],
    ['star-purple', '🔯', '紫色星标', 'Purple star']
  ]),
  makeGroup('smiley', '表情', 'Smileys', [
    ['smiley-smile', '😀', '开心', 'Smile'],
    ['smiley-laugh', '😂', '大笑', 'Laugh'],
    ['smiley-wink', '😉', '眨眼', 'Wink'],
    ['smiley-cool', '😎', '酷', 'Cool'],
    ['smiley-love', '😍', '喜爱', 'Love'],
    ['smiley-neutral', '😐', '平静', 'Neutral'],
    ['smiley-sad', '😢', '难过', 'Sad'],
    ['smiley-angry', '😠', '生气', 'Angry']
  ]),
  makeGroup('symbol', '符号', 'Symbols', [
    ['symbol-plus', '➕', '加号', 'Plus'],
    ['symbol-minus', '➖', '减号', 'Minus'],
    ['symbol-multiply', '✖️', '乘号', 'Multiply'],
    ['symbol-divide', '➗', '除号', 'Divide'],
    ['symbol-equals', '🟰', '等号', 'Equals'],
    ['symbol-question', '❓', '疑问', 'Question'],
    ['symbol-exclamation', '❗', '注意', 'Exclamation'],
    ['symbol-check', '✔️', '勾选', 'Check'],
    ['symbol-cross', '❌', '叉号', 'Cross'],
    ['symbol-info', 'ℹ️', '信息', 'Information'],
    ['symbol-warning', '⚠️', '警告', 'Warning'],
    ['symbol-heart', '❤️', '爱心', 'Heart']
  ]),
  makeGroup('people', '人物', 'People', [
    ['people-person', '👤', '单个人', 'Person'],
    ['people-two', '👥', '两个人', 'Two people'],
    ['people-group', '👨‍👩‍👧‍👦', '群体', 'Group'],
    ['people-team', '🧑‍🤝‍🧑', '团队', 'Team'],
    ['people-leader', '👑', '负责人', 'Leader'],
    ['people-mentor', '🧑‍🏫', '导师', 'Mentor'],
    ['people-client', '🤝', '客户', 'Client']
  ]),
  makeGroup('arrow', '箭头', 'Arrows', [
    ['arrow-right', '➡️', '向右', 'Right'],
    ['arrow-left', '⬅️', '向左', 'Left'],
    ['arrow-up', '⬆️', '向上', 'Up'],
    ['arrow-down', '⬇️', '向下', 'Down'],
    ['arrow-up-right', '↗️', '右上', 'Up-right'],
    ['arrow-down-right', '↘️', '右下', 'Down-right'],
    ['arrow-up-left', '↖️', '左上', 'Up-left'],
    ['arrow-down-left', '↙️', '左下', 'Down-left'],
    ['arrow-refresh', '🔁', '刷新', 'Refresh'],
    ['arrow-loop', '🔄', '循环', 'Loop']
  ]),
  makeGroup('other', '其他', 'Other', [
    ['other-pin', '📌', '图钉', 'Pin'],
    ['other-bookmark', '🔖', '书签', 'Bookmark'],
    ['other-lightbulb', '💡', '灵感', 'Idea'],
    ['other-fire', '🔥', '热门', 'Hot'],
    ['other-target', '🎯', '目标', 'Target'],
    ['other-clock', '⏰', '时间', 'Time'],
    ['other-calendar', '📅', '日历', 'Calendar'],
    ['other-mail', '✉️', '邮件', 'Mail'],
    ['other-phone', '📞', '电话', 'Phone'],
    ['other-link', '🔗', '链接', 'Link'],
    ['other-lock', '🔒', '锁定', 'Lock'],
    ['other-key', '🔑', '关键', 'Key'],
    ['other-money', '💰', '金额', 'Money'],
    ['other-trophy', '🏆', '成就', 'Trophy']
  ])
]

const MARKER_BY_ID = new Map<string, MarkerDef>(
  MARKER_GROUPS.flatMap((group) => group.markers).map((marker) => [marker.id, marker])
)

export function markerById(id: string): MarkerDef | undefined {
  return MARKER_BY_ID.get(id)
}
