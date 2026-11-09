import type { Sheet, Topic } from '@shared/types'
import { createSheet, createTopic, newId } from '@shared/defaults'
import { THEME_PRESETS, defaultPreset } from './themes'

/**
 * Original starter templates. Each factory returns a completely fresh Sheet so
 * that creating the same template twice never shares ids or mutable state.
 */
export interface TemplateDef {
  id: string
  name: { zh: string; en: string }
  category: string
  description: { zh: string; en: string }
  accent: string[]
  create(): Sheet
}

export interface TemplateCategory {
  id: string
  label: { zh: string; en: string }
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'planning', label: { zh: '规划与计划', en: 'Planning' } },
  { id: 'work', label: { zh: '工作协作', en: 'Work & collaboration' } },
  { id: 'analysis', label: { zh: '分析决策', en: 'Analysis & decisions' } },
  { id: 'study', label: { zh: '学习阅读', en: 'Study & reading' } },
  { id: 'life', label: { zh: '生活旅行', en: 'Life & travel' } },
  { id: 'creative', label: { zh: '创意写作', en: 'Creative & writing' } },
  { id: 'personal', label: { zh: '个人成长', en: 'Personal growth' } },
  { id: 'general', label: { zh: '通用', en: 'General' } }
]

interface TopicSpec {
  title: string
  children?: TopicSpec[]
  markers?: string[]
  labels?: string[]
  note?: string
  boundary?: string
}

function buildTopic(spec: TopicSpec): Topic {
  const topic = createTopic(spec.title)
  if (spec.markers?.length) {
    topic.markers = spec.markers.map((markerId) => ({ markerId }))
  }
  if (spec.labels?.length) {
    topic.labels = [...spec.labels]
  }
  if (spec.note) {
    topic.notes = {
      plain: { content: spec.note },
      html: { content: `<p>${spec.note}</p>` }
    }
  }
  if (spec.boundary) {
    topic.boundaries = [{ id: newId('boundary'), title: spec.boundary }]
  }
  if (spec.children?.length) {
    topic.children = { attached: spec.children.map(buildTopic), detached: [] }
  }
  return topic
}

function presetFor(id: string) {
  return THEME_PRESETS.find((preset) => preset.id === id) ?? defaultPreset()
}

function themeAccent(id: string): string[] {
  return [...presetFor(id).accent]
}

function makeSheet(rootTitle: string, themeId: string, branches: TopicSpec[]): Sheet {
  const sheet = createSheet(rootTitle, rootTitle, presetFor(themeId).theme)
  sheet.rootTopic.children = { attached: branches.map(buildTopic), detached: [] }
  return sheet
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'project-plan',
    name: { zh: '项目计划', en: 'Project Plan' },
    category: 'planning',
    description: {
      zh: '从目标、里程碑到风险与交付物的通用项目规划模板。',
      en: 'A general project plan covering goals, milestones, risks and deliverables.'
    },
    accent: themeAccent('preset-16'),
    create: () =>
      makeSheet('项目计划 Project Plan', 'preset-16', [
        {
          title: '目标 Goals',
          markers: ['other-target'],
          children: [
            {
              title: '成功标准 Success criteria',
              markers: ['priority-1'],
              note: '用一句话说明项目成功的样子。 / Describe in one sentence what success looks like.'
            },
            {
              title: '关键指标 Key metrics',
              children: [
                { title: '按时交付 On-time delivery', labels: ['目标 100%'] },
                { title: '预算偏差 Budget variance', labels: ['≤ 10%'] }
              ]
            }
          ]
        },
        {
          title: '里程碑 Milestones',
          markers: ['other-calendar'],
          children: [
            { title: '需求冻结 Scope freeze', labels: ['W1'], markers: ['task-done'] },
            { title: '原型评审 Prototype review', labels: ['W2'], markers: ['task-half'] },
            { title: '开发完成 Build complete', labels: ['W4'], markers: ['task-3quar'] },
            { title: '发布上线 Launch', labels: ['W5'], markers: ['task-start'] }
          ]
        },
        {
          title: '团队 Team',
          markers: ['people-group'],
          children: [
            { title: '产品 Product', markers: ['people-leader'] },
            { title: '设计 Design', markers: ['people-two'] },
            { title: '工程 Engineering', markers: ['people-team'] },
            { title: '测试 QA', markers: ['people-person'] }
          ]
        },
        {
          title: '交付物 Deliverables',
          markers: ['task-done'],
          children: [
            { title: 'PRD 与验收标准 PRD & acceptance criteria' },
            { title: '设计规范 Design specs', labels: ['Figma'] },
            { title: '发布版本 Release build', markers: ['task-start'] }
          ]
        },
        {
          title: '风险与对策 Risks & mitigation',
          markers: ['symbol-warning'],
          boundary: '风险区 Risk zone',
          children: [
            { title: '依赖延期 Dependency delay', markers: ['flag-red', 'priority-2'] },
            { title: '范围蔓延 Scope creep', markers: ['symbol-minus'] },
            { title: '资源不足 Resource gap', markers: ['star-yellow'] }
          ]
        },
        {
          title: '沟通机制 Communication',
          markers: ['other-mail'],
          children: [
            { title: '周会 Weekly sync', labels: ['Mon 10:00'] },
            { title: '日报 Daily update' },
            { title: '决策记录 Decision log', markers: ['other-bookmark'] }
          ]
        }
      ])
  },
  {
    id: 'weekly-plan',
    name: { zh: '周计划', en: 'Weekly Plan' },
    category: 'planning',
    description: {
      zh: '按星期拆分任务，兼顾目标、深度工作与复盘。',
      en: 'Plan the week by day with goals, focus blocks and a review.'
    },
    accent: themeAccent('preset-07'),
    create: () =>
      makeSheet('周计划 Weekly Plan', 'preset-07', [
        {
          title: '本周目标 Weekly goals',
          markers: ['other-target'],
          children: [
            { title: '完成季度复盘 Finish quarterly review', markers: ['priority-1', 'task-start'] },
            { title: '交付官网改版 Ship website refresh', markers: ['priority-2', 'task-half'] },
            { title: '运动 3 次 Exercise 3 times', markers: ['priority-4', 'smiley-smile'] }
          ]
        },
        {
          title: '周一 Monday',
          labels: ['11/09'],
          children: [
            { title: '团队同步 Team sync', markers: ['other-clock'], labels: ['09:30'] },
            { title: '需求澄清 Requirement clarification', labels: ['14:00'] }
          ]
        },
        {
          title: '周二 Tuesday',
          labels: ['11/10'],
          children: [
            {
              title: '深度工作 Deep work block',
              markers: ['other-fire'],
              labels: ['09:00–12:00'],
              note: '关闭通知，只处理当前任务。 / Notifications off, one task only.'
            },
            { title: '设计评审 Design review', markers: ['people-two'] }
          ]
        },
        {
          title: '周三 Wednesday',
          labels: ['11/11'],
          children: [
            { title: '用户访谈 User interviews', markers: ['people-client'] },
            { title: '数据复盘 Metrics review', markers: ['other-target'] }
          ]
        },
        {
          title: '周四 Thursday',
          labels: ['11/12'],
          children: [
            { title: '写作日 Writing day', markers: ['other-lightbulb'] },
            { title: '1:1 沟通 One-on-ones', markers: ['people-person'] }
          ]
        },
        {
          title: '周五 Friday',
          labels: ['11/13'],
          children: [
            { title: '发布验证 Release check', markers: ['task-done'] },
            { title: '周会纪要 Weekly notes', markers: ['other-bookmark'] }
          ]
        },
        {
          title: '周末 Weekend',
          markers: ['smiley-smile'],
          children: [
            { title: '家庭时间 Family time' },
            { title: '阅读 2 小时 Read for two hours', markers: ['other-bookmark'] }
          ]
        },
        {
          title: '复盘 Review',
          markers: ['task-done'],
          children: [
            { title: '完成度 Completion rate', labels: ['0–100%'] },
            {
              title: '下周调整 Adjustments',
              note: '保留有效做法，删掉一个低价值事项。 / Keep what worked, drop one low-value item.'
            }
          ]
        }
      ])
  },
  {
    id: 'meeting-notes',
    name: { zh: '会议纪要', en: 'Meeting Notes' },
    category: 'work',
    description: {
      zh: '记录议程、讨论、决策与行动项，避免会议结论丢失。',
      en: 'Capture agenda, discussion, decisions and action items in one place.'
    },
    accent: themeAccent('preset-10'),
    create: () =>
      makeSheet('会议纪要 Meeting Notes', 'preset-10', [
        {
          title: '会议信息 Meeting info',
          markers: ['other-calendar'],
          note: '会前补充议程，会后 24 小时内发出纪要。 / Add the agenda before, send notes within 24 hours.',
          children: [
            { title: '时间 Date：2026-11-06 10:00', labels: ['UTC+8'] },
            { title: '地点 Location：线上 Zoom', markers: ['other-link'] },
            { title: '主持 Facilitator：王琳 Wang Lin', markers: ['people-leader'] },
            { title: '参会 Attendees：产品 / 设计 / 工程', markers: ['people-group'] }
          ]
        },
        {
          title: '议程 Agenda',
          markers: ['other-bookmark'],
          children: [
            { title: '上次行动回顾 Review action items' },
            { title: '本周数据 Weekly metrics' },
            { title: '阻塞与决策 Blockers & decisions' }
          ]
        },
        {
          title: '讨论要点 Discussion',
          markers: ['other-lightbulb'],
          children: [
            { title: '定价策略 Pricing strategy', markers: ['symbol-question'] },
            { title: '发布节奏 Launch cadence', markers: ['other-calendar'] },
            { title: '客服反馈 Support feedback', markers: ['people-client'] }
          ]
        },
        {
          title: '决策 Decisions',
          markers: ['task-done'],
          children: [
            { title: '采用方案 B Adopt option B', markers: ['star-yellow'] },
            { title: '预算保持不变 Keep budget unchanged', markers: ['symbol-check'] }
          ]
        },
        {
          title: '行动项 Action items',
          markers: ['arrow-right'],
          children: [
            {
              title: '更新报价单 Update the quote — 王琳',
              labels: ['Due 11/08'],
              markers: ['priority-1']
            },
            {
              title: '通知客户 Notify the client — 李哲',
              labels: ['Due 11/08'],
              markers: ['priority-2']
            },
            {
              title: '补充数据 Add metrics — 周宁',
              labels: ['Due 11/10'],
              markers: ['priority-3']
            }
          ]
        },
        {
          title: '待确认 Open questions',
          markers: ['symbol-question'],
          children: [
            { title: '合同期限 Contract term?' },
            { title: '退款政策 Refund policy?' }
          ]
        }
      ])
  },
  {
    id: 'swot-analysis',
    name: { zh: 'SWOT 分析', en: 'SWOT Analysis' },
    category: 'analysis',
    description: {
      zh: '梳理优势、劣势、机会与威胁，并落到可执行策略。',
      en: 'Map strengths, weaknesses, opportunities and threats into action.'
    },
    accent: themeAccent('preset-12'),
    create: () =>
      makeSheet('产品 SWOT Product SWOT', 'preset-12', [
        {
          title: '优势 Strengths',
          markers: ['star-yellow'],
          children: [
            { title: '技术积累 Strong technical foundation' },
            { title: '忠实用户 Loyal user base' },
            { title: '数据壁垒 Proprietary data' }
          ]
        },
        {
          title: '劣势 Weaknesses',
          markers: ['symbol-minus'],
          children: [
            { title: '品牌认知低 Low brand awareness', markers: ['priority-2'] },
            { title: '交付周期长 Long delivery cycle' },
            { title: '依赖单一渠道 Single-channel dependency' }
          ]
        },
        {
          title: '机会 Opportunities',
          markers: ['arrow-up-right'],
          children: [
            { title: '行业数字化 Industry digitalization', markers: ['other-fire'] },
            { title: '海外市场 Overseas expansion' },
            { title: 'AI 能力 AI capabilities', markers: ['other-lightbulb'] }
          ]
        },
        {
          title: '威胁 Threats',
          markers: ['symbol-warning'],
          children: [
            { title: '巨头入场 Big-tech entry', markers: ['flag-red'] },
            { title: '价格战 Price war' },
            { title: '合规变化 Regulatory change' }
          ]
        },
        {
          title: '策略 Actions',
          markers: ['arrow-right'],
          labels: ['Q4'],
          children: [
            {
              title: 'SO：用技术优势抢占 AI 场景',
              note: 'Leverage technical depth to win AI use cases.'
            },
            { title: 'WO：借合作提升品牌声量' },
            { title: 'ST：差异化定位避开价格战' },
            { title: 'WT：控制成本并保留现金', markers: ['other-money'] }
          ]
        }
      ])
  },
  {
    id: 'okr',
    name: { zh: 'OKR', en: 'OKR' },
    category: 'planning',
    description: {
      zh: '季度目标与关键结果，附带评分、对齐与复盘。',
      en: 'Quarterly objectives and key results with scoring and alignment.'
    },
    accent: themeAccent('preset-17'),
    create: () =>
      makeSheet('Q4 OKR', 'preset-17', [
        {
          title: 'O1 打造最佳新手体验 Best onboarding',
          markers: ['other-target'],
          children: [
            {
              title: 'KR1 7 日留存 35% → 45%',
              labels: ['Baseline 35%'],
              markers: ['priority-1']
            },
            { title: 'KR2 引导完成率 ≥ 80%', markers: ['task-half'] },
            { title: 'KR3 NPS ≥ 50', markers: ['other-trophy'] }
          ]
        },
        {
          title: 'O2 建立可持续增长 Sustainable growth',
          markers: ['arrow-up-right'],
          children: [
            { title: 'KR1 自然流量 +40%', markers: ['priority-2'] },
            { title: 'KR2 付费转化 3.2% → 4.0%', markers: ['task-3quar'] },
            { title: 'KR3 CAC 下降 15%', markers: ['arrow-down'] }
          ]
        },
        {
          title: 'O3 提升团队效能 Team effectiveness',
          markers: ['people-team'],
          children: [
            { title: 'KR1 发布周期 4 周 → 2 周', markers: ['priority-3'] },
            { title: 'KR2 自动化测试覆盖 70%', markers: ['task-oct'] }
          ]
        },
        {
          title: '评分 Scoring',
          markers: ['other-target'],
          children: [
            { title: '0.7 为健康区间 0.7 is healthy', labels: ['0–1'] },
            { title: '每月检查 Monthly check-in', markers: ['other-calendar'] }
          ]
        },
        {
          title: '对齐 Alignment',
          markers: ['other-link'],
          children: [
            { title: '公司目标 Company goals' },
            { title: '跨团队依赖 Cross-team dependencies', markers: ['flag-yellow'] }
          ]
        },
        {
          title: '复盘 Review',
          markers: ['task-done'],
          note: '用数据说话，先复盘再定下季目标。 / Review with data before setting next-quarter goals.',
          children: [
            { title: '季度复盘 Quarterly retro', labels: ['12/20'] },
            { title: '下季草案 Next-quarter draft', markers: ['task-start'] }
          ]
        }
      ])
  },
  {
    id: 'travel-plan',
    name: { zh: '旅行计划', en: 'Travel Plan' },
    category: 'life',
    description: {
      zh: '行程、预算、交通、住宿与行李清单，一图规划旅程。',
      en: 'Plan itineraries, budgets, transport, stays and packing in one map.'
    },
    accent: themeAccent('preset-20'),
    create: () =>
      makeSheet('京都五日 Kyoto in Five Days', 'preset-20', [
        {
          title: '行程 Itinerary',
          markers: ['other-pin'],
          children: [
            {
              title: 'Day 1 东山 Higashiyama',
              labels: ['11/12'],
              children: [
                { title: '清水寺 Kiyomizu-dera', markers: ['star-yellow'] },
                { title: '二年坂 Ninenzaka' }
              ]
            },
            {
              title: 'Day 2 岚山 Arashiyama',
              children: [
                { title: '竹林小径 Bamboo grove' },
                { title: '渡月桥 Togetsukyo Bridge' }
              ]
            },
            {
              title: 'Day 3 伏见 Fushimi',
              children: [
                { title: '千本鸟居 Thousand torii gates', markers: ['other-fire'] },
                { title: '宇治抹茶 Uji matcha', markers: ['smiley-love'] }
              ]
            },
            {
              title: 'Day 4 金阁寺 Kinkaku-ji',
              children: [
                { title: '龙安寺 Ryoan-ji' },
                { title: '锦市场 Nishiki Market' }
              ]
            }
          ]
        },
        {
          title: '预算 Budget',
          markers: ['other-money'],
          children: [
            { title: '机票 Flights ¥4,200' },
            { title: '住宿 Hotels ¥3,600', labels: ['4 nights'] },
            { title: '餐饮 Food ¥1,800' },
            { title: '门票 Tickets ¥600' }
          ]
        },
        {
          title: '交通 Transport',
          markers: ['arrow-right'],
          children: [
            { title: '机场快线 Airport express', markers: ['other-clock'] },
            { title: '公交一日券 Day bus pass' },
            { title: 'IC 卡 IC card', markers: ['symbol-check'] }
          ]
        },
        {
          title: '住宿 Stay',
          markers: ['other-bookmark'],
          children: [
            { title: '四条乌丸 Shijo Karasuma', labels: ['4 nights'] },
            { title: '入住 15:00 Check-in 15:00' }
          ]
        },
        {
          title: '清单 Checklist',
          markers: ['task-done'],
          children: [
            { title: '护照 Passport', markers: ['task-done'] },
            { title: '转换插头 Adapter', markers: ['task-start'] },
            { title: '预订确认 Booking confirmation', markers: ['task-done'] },
            { title: '旅行保险 Travel insurance', markers: ['symbol-check'] }
          ]
        },
        {
          title: '美食 Food',
          markers: ['smiley-love'],
          children: [
            { title: '怀石料理 Kaiseki dinner' },
            { title: '拉面 Ramen' },
            { title: '便利店早餐 Konbini breakfast' }
          ]
        },
        {
          title: '注意事项 Notes',
          markers: ['symbol-info'],
          note: '出发前 48 小时再次确认天气与预约。 / Recheck weather and reservations 48 hours before departure.',
          children: [
            { title: '樱花季人多 Crowds in sakura season' },
            { title: '准备现金 Carry cash', markers: ['other-money'] }
          ]
        }
      ])
  },
  {
    id: 'study-notes',
    name: { zh: '学习笔记', en: 'Study Notes' },
    category: 'study',
    description: {
      zh: '概念、公式、例题、易错点与复习计划的学科笔记。',
      en: 'A subject notebook with concepts, formulas, examples and review.'
    },
    accent: themeAccent('preset-23'),
    create: () =>
      makeSheet('线性代数 Linear Algebra', 'preset-23', [
        {
          title: '核心概念 Key concepts',
          markers: ['other-lightbulb'],
          children: [
            {
              title: '向量空间 Vector space',
              children: [
                { title: '线性无关 Linear independence' },
                { title: '基与维数 Basis & dimension' }
              ]
            },
            {
              title: '线性变换 Linear transformation',
              children: [
                { title: '矩阵表示 Matrix representation' },
                { title: '特征值与特征向量 Eigenvalues & eigenvectors', markers: ['star-yellow'] }
              ]
            }
          ]
        },
        {
          title: '公式 Formulas',
          markers: ['symbol-equals'],
          children: [
            { title: 'Ax = λx', labels: ['特征方程 Eigen equation'] },
            { title: 'det(A − λI) = 0' },
            { title: '秩–零度定理 Rank–nullity theorem' }
          ]
        },
        {
          title: '例题 Examples',
          markers: ['task-start'],
          children: [
            { title: '求特征值 Find eigenvalues', markers: ['priority-2', 'task-start'] },
            { title: '判断可对角化 Diagonalizability', markers: ['priority-3'] },
            { title: '计算最小多项式 Minimal polynomial', markers: ['task-oct'] }
          ]
        },
        {
          title: '易错点 Pitfalls',
          markers: ['symbol-warning'],
          children: [
            { title: '混淆秩与维数 Rank vs. dimension' },
            { title: '忽略重根 Multiplicity', markers: ['flag-red'] },
            { title: '忘记检查可逆性 Check invertibility' }
          ]
        },
        {
          title: '复习计划 Review',
          markers: ['other-calendar'],
          note: '先做题再看答案，错题隔天重做。 / Attempt first, then redo missed questions the next day.',
          children: [
            { title: '习题 1–5 Exercises 1–5', labels: ['Due 11/07'], markers: ['task-half'] },
            { title: '制作闪卡 Make flashcards', markers: ['task-start'] },
            { title: '周末自测 Weekend self-test', labels: ['11/09'] }
          ]
        }
      ])
  },
  {
    id: 'reading-notes',
    name: { zh: '读书笔记', en: 'Reading Notes' },
    category: 'study',
    description: {
      zh: '记录书籍信息、核心观点、金句、联想与后续行动。',
      en: 'Capture book info, key ideas, quotes, connections and next actions.'
    },
    accent: themeAccent('preset-26'),
    create: () =>
      makeSheet('《思考，快与慢》Thinking, Fast and Slow', 'preset-26', [
        {
          title: '书目 Book info',
          markers: ['other-bookmark'],
          children: [
            { title: '作者 Author：丹尼尔·卡尼曼 Daniel Kahneman' },
            { title: '主题 Theme：判断与决策 Judgment & decision making' },
            { title: '评分 Rating：★★★★★', labels: ['5/5'], markers: ['star-yellow'] }
          ]
        },
        {
          title: '核心观点 Key ideas',
          markers: ['other-lightbulb'],
          children: [
            {
              title: '系统 1 与系统 2 System 1 & System 2',
              children: [
                { title: '快思考 Fast thinking' },
                { title: '慢思考 Slow thinking' }
              ]
            },
            { title: '锚定效应 Anchoring' },
            { title: '损失厌恶 Loss aversion', markers: ['symbol-warning'] },
            { title: '可得性启发 Availability heuristic' }
          ]
        },
        {
          title: '金句 Quote',
          markers: ['star-yellow'],
          labels: ['第 12 章 Ch. 12'],
          note: '我们以为的理性，常常只是事后解释。 / What we call reasoning is often rationalization.'
        },
        {
          title: '我的联想 Connections',
          markers: ['arrow-right'],
          children: [
            { title: '行为经济学 Behavioral economics', markers: ['other-link'] },
            { title: '产品定价 Product pricing' },
            { title: '团队决策 Team decisions', markers: ['people-group'] }
          ]
        },
        {
          title: '行动 Action',
          markers: ['task-done'],
          children: [
            { title: '写 500 字摘要 Write a 500-word summary', labels: ['Due 11/10'] },
            { title: '周会分享 10 分钟 Share at weekly meeting', markers: ['people-group'] },
            { title: '记录一次决策偏差 Log one decision bias', markers: ['other-pin'] }
          ]
        }
      ])
  },
  {
    id: 'brainstorm',
    name: { zh: '头脑风暴', en: 'Brainstorm' },
    category: 'creative',
    description: {
      zh: '围绕目标发散创意，再从资源与评估角度收敛。',
      en: 'Diverge around a goal, then converge using resources and criteria.'
    },
    accent: themeAccent('preset-05'),
    create: () =>
      makeSheet('活动创意 Campaign Ideas', 'preset-05', [
        {
          title: '目标 Goal',
          markers: ['other-target'],
          note: '先追求数量，不急于判断。 / Go for quantity before judging ideas.',
          children: [
            { title: '提升品牌声量 Boost awareness' },
            { title: '获取 500 条线索 Generate 500 leads', labels: ['MQL'] },
            { title: '激活沉默用户 Reactivate dormant users', markers: ['task-start'] }
          ]
        },
        {
          title: '创意 Ideas',
          markers: ['other-lightbulb'],
          children: [
            { title: '城市快闪店 City pop-up', markers: ['star-yellow'] },
            { title: '用户故事短片 User-story film' },
            { title: '联名礼盒 Co-branded gift box', markers: ['smiley-love'] },
            { title: '24 小时线上挑战 24-hour online challenge', markers: ['other-fire'] },
            { title: '用户共创展览 Co-created exhibition' }
          ]
        },
        {
          title: '受众 Audience',
          markers: ['people-group'],
          children: [
            { title: '新锐白领 Young professionals' },
            { title: '高校学生 University students' },
            { title: '亲子家庭 Families with children' }
          ]
        },
        {
          title: '资源 Resources',
          markers: ['other-money'],
          children: [
            { title: '预算 Budget ¥80k' },
            { title: '团队 4 人 Team of four', markers: ['people-team'] },
            { title: '外部代理 Agency partner', markers: ['people-client'] }
          ]
        },
        {
          title: '评估 Evaluate',
          markers: ['symbol-question'],
          children: [
            { title: '影响力 Impact', markers: ['star-yellow'] },
            { title: '成本 Cost', markers: ['other-money'] },
            { title: '执行风险 Execution risk', markers: ['flag-red'] }
          ]
        },
        {
          title: '下一步 Next steps',
          markers: ['arrow-right'],
          children: [
            { title: '筛选 Top 3 Shortlist top three', labels: ['11/10'], markers: ['task-start'] },
            { title: '用户测试 Test with users', labels: ['11/12'] },
            { title: '输出提案 Write proposal', markers: ['task-oct'] }
          ]
        }
      ])
  },
  {
    id: 'decision-matrix',
    name: { zh: '决策矩阵', en: 'Decision Matrix' },
    category: 'analysis',
    description: {
      zh: '用加权评分比较多个选项，明确结论与退出条件。',
      en: 'Compare options with weighted scores and record the decision conditions.'
    },
    accent: themeAccent('preset-18'),
    create: () =>
      makeSheet('工具选型决策 Tool Selection Decision', 'preset-18', [
        {
          title: '选项 Options',
          markers: ['symbol-question'],
          children: [
            { title: '方案 A：自研 Option A: Build' },
            { title: '方案 B：采购 Option B: Buy' },
            { title: '方案 C：开源 Option C: Open source' }
          ]
        },
        {
          title: '评估维度 Criteria',
          markers: ['other-target'],
          children: [
            { title: '成本 Cost', labels: ['权重 30%'], markers: ['other-money'] },
            { title: '速度 Speed', labels: ['权重 25%'], markers: ['other-clock'] },
            { title: '可维护性 Maintainability', labels: ['权重 25%'], markers: ['symbol-check'] },
            { title: '风险 Risk', labels: ['权重 20%'], markers: ['flag-red'] }
          ]
        },
        {
          title: '评分 Scores',
          markers: ['star-yellow'],
          children: [
            { title: '方案 A：3 / 4 / 5 / 2' },
            { title: '方案 B：5 / 5 / 3 / 3' },
            { title: '方案 C：4 / 3 / 4 / 3' }
          ]
        },
        {
          title: '加权结果 Weighted result',
          markers: ['task-done'],
          children: [
            { title: '方案 A：3.55' },
            { title: '方案 B：4.05', markers: ['other-trophy'] },
            { title: '方案 C：3.50' }
          ]
        },
        {
          title: '结论 Decision',
          markers: ['task-done'],
          note: '选择方案 B，并设置 6 个月复评点。 / Choose option B with a six-month review.',
          children: [
            { title: '选择方案 B Choose option B', markers: ['star-yellow'] },
            { title: '记录假设 Record assumptions', markers: ['other-bookmark'] }
          ]
        },
        {
          title: '条件与风险 Conditions & risks',
          markers: ['symbol-warning'],
          children: [
            { title: '合同不超过 1 年 Contract ≤ 1 year', markers: ['priority-1'] },
            { title: '准备退出方案 Prepare exit plan', markers: ['flag-red'] },
            { title: '确保数据可迁移 Ensure data portability', markers: ['arrow-refresh'] }
          ]
        }
      ])
  },
  {
    id: 'product-launch',
    name: { zh: '产品发布', en: 'Product Launch' },
    category: 'work',
    description: {
      zh: '从定位、发布节奏到渠道、素材、指标与风险。',
      en: 'Positioning, launch timeline, channels, assets, metrics and risks.'
    },
    accent: themeAccent('preset-27'),
    create: () =>
      makeSheet('新品发布 New Product Launch', 'preset-27', [
        {
          title: '产品定位 Positioning',
          markers: ['other-target'],
          children: [
            { title: '目标用户 Target users：独立开发者 Indie makers', markers: ['people-person'] },
            {
              title: '核心价值 Value proposition：10 分钟搭建知识库',
              labels: ['10 min']
            },
            {
              title: '一句话介绍 One-liner',
              note: '把散落的笔记变成可探索的知识网络。 / Turn scattered notes into an explorable knowledge graph.'
            }
          ]
        },
        {
          title: '发布节奏 Timeline',
          markers: ['other-calendar'],
          children: [
            { title: 'T-4 周 预热 Teaser', labels: ['W-4'], markers: ['task-quarter'] },
            { title: 'T-2 周 公测 Beta', labels: ['W-2'], markers: ['task-half'] },
            { title: 'T-0 正式发布 GA', labels: ['Launch day'], markers: ['task-done'] },
            { title: 'T+1 周 复盘 Retro', labels: ['W+1'], markers: ['task-start'] }
          ]
        },
        {
          title: '渠道 Channels',
          markers: ['arrow-right'],
          children: [
            { title: '官网 Website', markers: ['other-link'] },
            { title: '开发者社区 Communities', markers: ['people-group'] },
            { title: '邮件列表 Email list', markers: ['other-mail'] },
            { title: '创作者合作 Creator partnerships', markers: ['people-client'] }
          ]
        },
        {
          title: '素材 Assets',
          markers: ['task-done'],
          children: [
            { title: '落地页 Landing page', markers: ['task-start'] },
            { title: '演示视频 Demo video', markers: ['task-half'] },
            { title: '帮助文档 Help docs', markers: ['symbol-check'] },
            { title: '新闻稿 Press release', markers: ['other-bookmark'] }
          ]
        },
        {
          title: '指标 Metrics',
          markers: ['other-target'],
          children: [
            { title: '注册 Signups：5,000' },
            { title: '激活率 Activation：40%' },
            { title: '媒体曝光 Impressions：300k', markers: ['other-fire'] }
          ]
        },
        {
          title: '风险 Risks',
          markers: ['flag-red'],
          children: [
            { title: '服务器容量 Capacity', markers: ['priority-1'] },
            { title: '支持负载 Support load' },
            { title: '信息遗漏 Messaging gaps' }
          ]
        }
      ])
  },
  {
    id: 'timeline',
    name: { zh: '时间线', en: 'Timeline' },
    category: 'planning',
    description: {
      zh: '按季度铺开产品路线图，并标出关键节点与依赖。',
      en: 'Lay out a quarterly roadmap with key dates and dependencies.'
    },
    accent: themeAccent('preset-21'),
    create: () =>
      makeSheet('产品路线图 Product Roadmap', 'preset-21', [
        {
          title: 'Q1 基础能力 Foundations',
          labels: ['Jan–Mar'],
          children: [
            { title: '账户与权限 Accounts & permissions', markers: ['task-done'] },
            { title: '数据导入 Data import', markers: ['task-done'] },
            { title: '基础编辑器 Core editor', markers: ['task-done'] }
          ]
        },
        {
          title: 'Q2 协作 Collaboration',
          labels: ['Apr–Jun'],
          children: [
            { title: '实时协作 Real-time collaboration', markers: ['task-3quar'] },
            { title: '评论与通知 Comments & notifications', markers: ['task-half'] }
          ]
        },
        {
          title: 'Q3 智能化 Intelligence',
          labels: ['Jul–Sep'],
          children: [
            { title: 'AI 摘要 AI summaries', markers: ['other-lightbulb', 'task-oct'] },
            { title: '智能模板 Smart templates', markers: ['task-start'] }
          ]
        },
        {
          title: 'Q4 生态 Ecosystem',
          labels: ['Oct–Dec'],
          children: [
            { title: '开放 API Open API', markers: ['other-link'] },
            { title: '插件市场 Plugin marketplace', markers: ['arrow-up-right'] }
          ]
        },
        {
          title: '关键节点 Key dates',
          markers: ['other-calendar'],
          note: '日期为示意，发布前与各团队确认。 / Dates are indicative; confirm with each team before launch.',
          children: [
            { title: '3/15 内测 Beta', labels: ['15 Mar'], markers: ['task-done'] },
            { title: '6/30 公测 Public beta', labels: ['30 Jun'], markers: ['task-half'] },
            { title: '9/10 发布会 Launch event', labels: ['10 Sep'], markers: ['task-start'] },
            { title: '12/01 年度版 v1.0', labels: ['1 Dec'], markers: ['task-start'] }
          ]
        },
        {
          title: '依赖 Dependencies',
          markers: ['flag-yellow'],
          children: [
            { title: '设计系统 Design system', markers: ['people-two'] },
            { title: '支付平台 Payments', markers: ['other-money'] },
            { title: '法务审核 Legal review' }
          ]
        }
      ])
  },
  {
    id: 'habit-tracker',
    name: { zh: '习惯追踪', en: 'Habit Tracker' },
    category: 'personal',
    description: {
      zh: '追踪 30 天习惯，记录障碍并准备最小可选方案。',
      en: 'Track 30 days of habits, barriers and minimum fallback versions.'
    },
    accent: themeAccent('preset-19'),
    create: () =>
      makeSheet('30 天习惯养成 30-Day Habit Builder', 'preset-19', [
        {
          title: '每日习惯 Daily habits',
          markers: ['task-done'],
          children: [
            { title: '早起 7:00 Wake at 7:00', labels: ['21/30'], markers: ['task-3quar'] },
            { title: '阅读 30 分钟 Read 30 minutes', labels: ['18/30'], markers: ['task-half'] },
            { title: '喝水 2L Drink 2L water', labels: ['26/30'], markers: ['task-7oct'] },
            { title: '拉伸 10 分钟 Stretch 10 minutes', labels: ['20/30'], markers: ['task-5oct'] }
          ]
        },
        {
          title: '每周习惯 Weekly habits',
          markers: ['other-calendar'],
          children: [
            { title: '跑步 3 次 Run three times', markers: ['task-half'] },
            { title: '周日复盘 Sunday review', markers: ['task-start'] },
            { title: '整理桌面 Tidy desk', markers: ['task-done'] }
          ]
        },
        {
          title: '追踪方法 Tracking',
          markers: ['other-target'],
          children: [
            { title: '打卡表 Habit grid', markers: ['symbol-check'] },
            { title: '21:00 提醒 Reminder at 21:00', markers: ['other-clock'] },
            { title: '每周奖励 Weekly reward', markers: ['smiley-smile'] }
          ]
        },
        {
          title: '障碍 Barriers',
          markers: ['flag-red'],
          children: [
            { title: '加班晚归 Late work' },
            { title: '出差旅行 Travel', markers: ['other-pin'] },
            { title: '动力不足 Low motivation', markers: ['symbol-minus'] }
          ]
        },
        {
          title: '调整策略 Adjustments',
          markers: ['arrow-refresh'],
          children: [
            { title: '最小版本 Minimum version', markers: ['other-lightbulb'] },
            { title: '不连续中断两次 Never miss twice', markers: ['star-yellow'] }
          ]
        },
        {
          title: '复盘 Review',
          markers: ['task-done'],
          note: '每 7 天检查一次，保留有效习惯，替换无效习惯。 / Review every 7 days and replace what does not work.'
        }
      ])
  },
  {
    id: 'fitness-plan',
    name: { zh: '健身计划', en: 'Fitness Plan' },
    category: 'personal',
    description: {
      zh: '12 周训练、饮食、恢复与安全提示。',
      en: 'A 12-week plan covering training, nutrition, recovery and safety.'
    },
    accent: themeAccent('preset-24'),
    create: () =>
      makeSheet('12 周健身计划 12-Week Fitness Plan', 'preset-24', [
        {
          title: '目标 Goals',
          markers: ['other-target'],
          children: [
            { title: '减脂 4kg Lose 4kg', labels: ['12 weeks'], markers: ['priority-1'] },
            { title: '深蹲 1.5 倍体重 Squat 1.5× body weight', markers: ['priority-2'] },
            { title: '每周训练 4 次 Train four times per week', markers: ['task-start'] }
          ]
        },
        {
          title: '训练计划 Training',
          markers: ['arrow-up'],
          children: [
            {
              title: '周一 上肢 Upper body',
              labels: ['Mon'],
              children: [
                { title: '卧推 Bench press' },
                { title: '划船 Row' },
                { title: '肩推 Shoulder press' }
              ]
            },
            {
              title: '周三 下肢 Lower body',
              labels: ['Wed'],
              children: [
                { title: '深蹲 Squat' },
                { title: '硬拉 Deadlift', markers: ['priority-1'] }
              ]
            },
            {
              title: '周五 全身 Full body',
              labels: ['Fri'],
              children: [
                { title: '推举 Press' },
                { title: '引体向上 Pull-up' }
              ]
            },
            {
              title: '周日 有氧 Cardio',
              labels: ['Sun'],
              children: [
                { title: '慢跑 5km Run 5 km' },
                { title: '拉伸 Stretch', markers: ['task-done'] }
              ]
            }
          ]
        },
        {
          title: '饮食 Nutrition',
          markers: ['other-fire'],
          children: [
            { title: '蛋白质 1.6g/kg Protein' },
            { title: '热量缺口 300 kcal Calorie deficit' },
            { title: '少糖少酒 Less sugar & alcohol', markers: ['symbol-minus'] }
          ]
        },
        {
          title: '恢复 Recovery',
          markers: ['smiley-smile'],
          note: '睡眠和饮食决定训练效果。 / Recovery and nutrition drive training results.',
          children: [
            { title: '睡眠 7–8 小时 Sleep 7–8 hours', markers: ['other-clock'] },
            { title: '泡沫轴 Foam rolling' },
            { title: '每周休息日 Weekly rest day' }
          ]
        },
        {
          title: '追踪 Tracking',
          markers: ['task-done'],
          children: [
            { title: '训练日志 Training log' },
            { title: '每周体重 Weekly weight', markers: ['task-half'] },
            { title: '围度测量 Measurements', markers: ['task-oct'] }
          ]
        },
        {
          title: '安全提示 Safety',
          markers: ['symbol-warning'],
          boundary: '安全第一 Safety first',
          children: [
            { title: '热身 10 分钟 Warm up for 10 minutes' },
            { title: '疼痛即停 Stop if it hurts', markers: ['flag-red'] }
          ]
        }
      ])
  },
  {
    id: 'recipe',
    name: { zh: '菜谱', en: 'Recipe' },
    category: 'life',
    description: {
      zh: '食材、步骤、调味与提示，适合记录家常菜谱。',
      en: 'Ingredients, steps, seasoning and tips for a home recipe.'
    },
    accent: themeAccent('preset-28'),
    create: () =>
      makeSheet('番茄牛腩 Tomato Beef Stew', 'preset-28', [
        {
          title: '食材 Ingredients',
          markers: ['other-bookmark'],
          children: [
            { title: '牛腩 500g Beef brisket 500g' },
            { title: '番茄 4 个 Tomatoes × 4', markers: ['smiley-love'] },
            { title: '洋葱 1 个 Onion × 1' },
            {
              title: '香料 Spices',
              children: [
                { title: '八角 2 颗 Star anise × 2' },
                { title: '桂皮 1 段 Cinnamon stick' },
                { title: '姜 3 片 Ginger × 3' }
              ]
            }
          ]
        },
        {
          title: '准备 Prep',
          markers: ['task-start'],
          children: [
            { title: '牛腩切块 Cube the beef', labels: ['3 cm'] },
            { title: '冷水焯水 Blanch in cold water', labels: ['3 min'] },
            { title: '番茄去皮 Peel tomatoes', markers: ['other-fire'] }
          ]
        },
        {
          title: '步骤 Steps',
          markers: ['arrow-right'],
          children: [
            { title: '1. 炒香 Sauté aromatics', labels: ['2 min'] },
            { title: '2. 小火炖煮 Simmer on low', labels: ['90 min'], markers: ['other-clock'] },
            { title: '3. 加入后一半番茄 Add remaining tomatoes', labels: ['20 min'] },
            { title: '4. 收汁 Reduce sauce', labels: ['15 min'], markers: ['task-half'] }
          ]
        },
        {
          title: '调味 Seasoning',
          markers: ['symbol-plus'],
          children: [
            { title: '盐 3g Salt' },
            { title: '糖 5g Sugar' },
            { title: '生抽 1 勺 Soy sauce × 1' }
          ]
        },
        {
          title: '提示 Tips',
          markers: ['other-lightbulb'],
          note: '炖煮中途加热水，避免肉质收紧。 / Add hot water while simmering to keep the beef tender.',
          children: [
            { title: '选带筋牛腩 Choose marbled brisket' },
            { title: '番茄分两次加 Add tomatoes in two batches' }
          ]
        },
        {
          title: '搭配 Serve',
          markers: ['smiley-love'],
          children: [
            { title: '米饭 Steamed rice' },
            { title: '香菜 Cilantro' },
            { title: '法棍 Baguette' }
          ]
        }
      ])
  },
  {
    id: 'event-planning',
    name: { zh: '活动策划', en: 'Event Planning' },
    category: 'life',
    description: {
      zh: '会议或线下活动的流程、团队、预算、物料与风险。',
      en: 'Run of show, team, budget, collateral and risks for an event.'
    },
    accent: themeAccent('preset-09'),
    create: () =>
      makeSheet('秋季用户大会 Autumn User Conference', 'preset-09', [
        {
          title: '活动概览 Overview',
          markers: ['other-calendar'],
          note: '所有对外信息以最终确认版为准。 / Treat the final confirmed version as the source of truth.',
          children: [
            { title: '日期 11/22 Date', labels: ['Saturday'] },
            { title: '地点 上海 Venue: Shanghai', markers: ['other-pin'] },
            { title: '规模 300 人 Capacity 300', markers: ['people-group'] },
            { title: '主题 Build Together Theme', markers: ['star-yellow'] }
          ]
        },
        {
          title: '流程 Run of show',
          markers: ['other-clock'],
          children: [
            { title: '09:00 签到 Check-in', labels: ['45 min'] },
            { title: '10:00 主题演讲 Keynote' },
            { title: '12:00 午餐 Lunch' },
            { title: '14:00 分会场 Breakouts' },
            { title: '18:00 晚宴 Dinner', markers: ['smiley-smile'] }
          ]
        },
        {
          title: '团队 Team',
          markers: ['people-team'],
          children: [
            { title: '总负责 Lead', markers: ['people-leader'] },
            { title: '场务 Ops', markers: ['people-two'] },
            { title: '内容 Content' },
            { title: '市场 Marketing' },
            { title: '直播 Livestream' }
          ]
        },
        {
          title: '预算 Budget',
          markers: ['other-money'],
          children: [
            { title: '场地 Venue ¥80k' },
            { title: '餐饮 F&B ¥60k' },
            { title: '物料 Collateral ¥30k' },
            { title: '直播 Streaming ¥20k' }
          ]
        },
        {
          title: '物料 Collateral',
          markers: ['task-done'],
          children: [
            { title: '主视觉 Key visual', markers: ['task-start'] },
            { title: '胸牌 Badges' },
            { title: '伴手礼 Swag', markers: ['smiley-love'] }
          ]
        },
        {
          title: '风险 Risks',
          markers: ['flag-red'],
          boundary: '风险区 Risk zone',
          children: [
            { title: '嘉宾缺席 Speaker cancellation', markers: ['priority-1'] },
            { title: '设备故障 AV failure', markers: ['symbol-warning'] },
            { title: '报名不足 Low sign-ups' }
          ]
        },
        {
          title: '宣传 Promotion',
          markers: ['arrow-right'],
          children: [
            { title: '报名页 Registration page', markers: ['other-link'] },
            { title: '社群 Community', markers: ['people-group'] },
            { title: '邮件 Email', markers: ['other-mail'] }
          ]
        }
      ])
  },
  {
    id: 'budget',
    name: { zh: '预算', en: 'Budget' },
    category: 'personal',
    description: {
      zh: '收入、固定支出、生活支出、储蓄目标与超支预警。',
      en: 'Income, fixed and living expenses, savings goals and overspend alerts.'
    },
    accent: themeAccent('preset-04'),
    create: () =>
      makeSheet('家庭月度预算 Family Monthly Budget', 'preset-04', [
        {
          title: '收入 Income',
          markers: ['arrow-up'],
          children: [
            { title: '工资 Salary ¥28,000' },
            { title: '副业 Side income ¥3,000' },
            { title: '理财 Investment ¥800' }
          ]
        },
        {
          title: '固定支出 Fixed expenses',
          markers: ['other-money'],
          children: [
            { title: '房贷 Mortgage ¥9,000' },
            { title: '物业与水电网 Utilities ¥600' },
            { title: '保险 Insurance ¥1,200' },
            { title: '教育 Education ¥2,500' }
          ]
        },
        {
          title: '生活支出 Living expenses',
          markers: ['arrow-down'],
          children: [
            { title: '餐饮 Food ¥4,000', markers: ['task-half'] },
            { title: '交通 Transport ¥1,200' },
            { title: '购物 Shopping ¥2,000' },
            { title: '娱乐 Leisure ¥1,000', markers: ['smiley-smile'] }
          ]
        },
        {
          title: '储蓄目标 Savings goals',
          markers: ['other-target'],
          children: [
            { title: '应急金 Emergency fund ¥5,000', markers: ['priority-1'] },
            { title: '旅行基金 Travel fund ¥3,000', markers: ['other-pin'] },
            { title: '长期投资 Long-term investing ¥3,000' }
          ]
        },
        {
          title: '预警 Alerts',
          markers: ['flag-red'],
          children: [
            { title: '餐饮超支 Food overspend', labels: ['> ¥4,500'], markers: ['priority-1'] },
            { title: '冲动购物 Impulse purchases', markers: ['symbol-minus'] }
          ]
        },
        {
          title: '复盘 Review',
          markers: ['task-done'],
          note: '每月最后一天结账，并为下月留出弹性。 / Close the books monthly and leave room for next month.',
          children: [
            { title: '每周对账 Weekly reconciliation', markers: ['other-calendar'] },
            { title: '自动转账 Automate transfers', markers: ['arrow-refresh'] },
            { title: '50/30/20 法则 50/30/20 rule', markers: ['other-lightbulb'] }
          ]
        }
      ])
  },
  {
    id: 'family-tree',
    name: { zh: '家谱', en: 'Family Tree' },
    category: 'personal',
    description: {
      zh: '按辈分整理家族成员、故事与待补充资料。',
      en: 'Organize relatives by generation with stories and research notes.'
    },
    accent: themeAccent('preset-15'),
    create: () =>
      makeSheet('林氏家谱 Lin Family Tree', 'preset-15', [
        {
          title: '祖辈 Grandparents',
          markers: ['people-person'],
          children: [
            { title: '祖父 林国栋 Grandpa Lin Guodong', labels: ['1938–2016'] },
            { title: '祖母 周秀兰 Grandma Zhou Xiulan', labels: ['1941–'] }
          ]
        },
        {
          title: '父辈 Parents',
          markers: ['people-two'],
          children: [
            { title: '父亲 林建华 Father Lin Jianhua', labels: ['1966'] },
            { title: '母亲 陈雅琴 Mother Chen Yaqin', labels: ['1968'] },
            { title: '姑姑 林建芳 Aunt Lin Jianfang', labels: ['1970'] }
          ]
        },
        {
          title: '同辈 Siblings',
          markers: ['people-group'],
          children: [
            { title: '林浩 Lin Hao', labels: ['1989'], markers: ['people-person'] },
            { title: '林悦 Lin Yue', labels: ['1993'] }
          ]
        },
        {
          title: '晚辈 Children',
          markers: ['smiley-smile'],
          children: [
            { title: '林子墨 Lin Zimo', labels: ['2016'] },
            { title: '林可欣 Lin Kexin', labels: ['2019'] }
          ]
        },
        {
          title: '家族故事 Family stories',
          markers: ['other-bookmark'],
          children: [
            {
              title: '迁徙路线 Migration route',
              markers: ['other-pin'],
              note: '福建 → 上海 → 温哥华 / Fujian → Shanghai → Vancouver'
            },
            { title: '家训 Family motto：勤勉、诚信 Diligence & integrity', markers: ['star-yellow'] },
            { title: '老照片 Old photos', markers: ['task-start'] }
          ]
        },
        {
          title: '待补充 To research',
          markers: ['task-oct'],
          children: [
            { title: '口述史 Oral history', markers: ['other-lightbulb'] },
            { title: '族谱扫描 Scan the genealogy book', markers: ['task-start'] }
          ]
        }
      ])
  },
  {
    id: 'writing-outline',
    name: { zh: '写作大纲', en: 'Writing Outline' },
    category: 'creative',
    description: {
      zh: '从选题、读者、论点到结构、素材与写作待办。',
      en: 'Move from topic, audience and thesis into structure and sources.'
    },
    accent: themeAccent('preset-25'),
    create: () =>
      makeSheet('长文大纲 Article Outline', 'preset-25', [
        {
          title: '选题 Topic',
          markers: ['other-lightbulb'],
          children: [
            { title: '为什么越忙越焦虑 Why busyness breeds anxiety', markers: ['star-yellow'] },
            { title: '核心问题 Core question', markers: ['symbol-question'] }
          ]
        },
        {
          title: '读者 Audience',
          markers: ['people-group'],
          children: [
            { title: '知识工作者 Knowledge workers', markers: ['people-person'] },
            { title: '团队管理者 Managers', markers: ['people-leader'] }
          ]
        },
        {
          title: '论点 Thesis',
          markers: ['other-target'],
          note: '注意力是稀缺资源，忙碌并不等于产出。 / Attention is scarce; busyness is not output.'
        },
        {
          title: '结构 Structure',
          markers: ['arrow-right'],
          children: [
            { title: '开头 Hook：场景故事 Opening scene', markers: ['task-start'] },
            { title: '第一部分 问题 Problem：忙碌的幻觉 Illusion of busyness' },
            { title: '第二部分 原因 Cause：任务切换成本 Context-switching cost' },
            { title: '第三部分 方法 Solution：深度工作 Deep work', markers: ['other-lightbulb'] },
            { title: '结尾 Ending：行动清单 Action checklist', markers: ['task-done'] }
          ]
        },
        {
          title: '素材 Sources',
          markers: ['other-bookmark'],
          children: [
            { title: '研究论文 Research papers' },
            { title: '用户访谈 Interviews', markers: ['people-client'] },
            { title: '数据图表 Data charts' }
          ]
        },
        {
          title: '语气 Tone',
          markers: ['smiley-smile'],
          children: [
            { title: '克制 Calm' },
            { title: '具体 Concrete' },
            { title: '有温度 Warm' }
          ]
        },
        {
          title: '待办 To do',
          markers: ['other-calendar'],
          children: [
            { title: '列出提纲 Outline', markers: ['task-done'] },
            { title: '完成初稿 First draft', labels: ['Due 11/12'], markers: ['task-half'] },
            { title: '修订 Revise', labels: ['Due 11/15'], markers: ['task-start'] }
          ]
        }
      ])
  },
  {
    id: 'blank-mind-map',
    name: { zh: '空白思维导图', en: 'Blank Mind Map' },
    category: 'general',
    description: {
      zh: '带少量提示的空白导图，适合快速开始任何主题。',
      en: 'A lightly guided blank map for starting any topic quickly.'
    },
    accent: themeAccent('preset-02'),
    create: () =>
      makeSheet('中心主题 Central Topic', 'preset-02', [
        {
          title: '主题一 Topic One',
          markers: ['star-yellow'],
          labels: ['双击编辑 Double-click to edit'],
          children: [
            { title: '子主题 Subtopic A' },
            {
              title: '子主题 Subtopic B',
              note: '在这里补充说明、链接或附件。 / Add details, links or attachments here.'
            }
          ]
        },
        {
          title: '主题二 Topic Two',
          children: [
            { title: '子主题 Subtopic A' },
            { title: '子主题 Subtopic B' }
          ]
        },
        {
          title: '主题三 Topic Three',
          children: [{ title: '子主题 Subtopic A' }]
        },
        {
          title: '主题四 Topic Four',
          children: [{ title: '子主题 Subtopic A' }]
        },
        {
          title: '灵感收集 Idea parking',
          markers: ['other-lightbulb'],
          note: '先把想法放进来，稍后再整理。 / Capture first, organize later.'
        },
        {
          title: '提示 Hints',
          markers: ['symbol-info'],
          children: [
            { title: '添加子主题 Add subtopic', labels: ['Tab'] },
            { title: '添加同级主题 Add sibling', labels: ['Enter'] },
            { title: '切换主题 Change theme', labels: ['Shift + T'] }
          ]
        }
      ])
  }
]

const TEMPLATE_BY_ID = new Map(TEMPLATES.map((template) => [template.id, template]))

export function templateById(id: string): TemplateDef | undefined {
  return TEMPLATE_BY_ID.get(id)
}
