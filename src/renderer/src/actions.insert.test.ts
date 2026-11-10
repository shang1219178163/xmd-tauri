import { beforeEach, describe, expect, it } from 'vitest'
import { runAction } from './actions'
import { useMapStore } from './store/mapStore'
import { useUiStore } from './store/uiStore'
import { attachedOf, detachedOf, findTopic } from './model/tree'

function resetAll(): void {
  useMapStore.getState().reset()
  useUiStore.setState({
    dialog: null,
    popover: null,
    relationshipFrom: undefined,
    zen: false,
    pitch: false,
    toasts: []
  })
}

function root() {
  return useMapStore.getState().workbook.sheets[0].rootTopic
}

/** 建一个根主题下的子主题并选中。 */
function selectChild(): string {
  const rootId = root().id
  const id = useMapStore.getState().addChild(rootId)!
  useMapStore.getState().select([id], false)
  return id
}

describe('插入菜单动作', () => {
  beforeEach(resetAll)

  it('插入主题：根主题下新增一个子主题', () => {
    useMapStore.getState().select([root().id], false)
    runAction('insert-topic')
    expect(attachedOf(root())).toHaveLength(1)
  })

  it('插入同级主题：与选中主题同级', () => {
    const childId = selectChild()
    runAction('insert-sibling')
    const ids = attachedOf(root()).map((topic) => topic.id)
    expect(ids).toHaveLength(2)
    expect(ids).toContain(childId)
  })

  it('插入自由主题：进入 detached 列表', () => {
    runAction('insert-floating')
    expect(detachedOf(root())).toHaveLength(1)
  })

  it('插入备注：打开备注浮层', () => {
    selectChild()
    runAction('insert-note')
    expect(useUiStore.getState().popover).toBe('notes')
  })

  it('插入标签：打开标签对话框', () => {
    selectChild()
    runAction('insert-label')
    expect(useUiStore.getState().dialog).toBe('label')
  })

  it('插入标记：打开标记浮层', () => {
    selectChild()
    runAction('insert-marker')
    expect(useUiStore.getState().popover).toBe('markers')
  })

  it('插入关系线：记录起点主题', () => {
    const childId = selectChild()
    runAction('insert-relationship')
    expect(useUiStore.getState().relationshipFrom).toBe(childId)
  })

  it('插入关系线：未选中主题时提示错误', () => {
    useMapStore.setState({ activeTopicId: undefined, selection: [] })
    runAction('insert-relationship')
    expect(useUiStore.getState().relationshipFrom).toBeUndefined()
    expect(useUiStore.getState().toasts.at(-1)?.tone).toBe('error')
  })

  it('插入边界：边界挂到父主题上', () => {
    selectChild()
    runAction('insert-boundary')
    expect(root().boundaries).toHaveLength(1)
  })

  it('插入边界：选中中心主题时包围它的子主题', () => {
    useMapStore.getState().addChild(root().id)
    useMapStore.getState().addChild(root().id)
    useMapStore.getState().select([root().id], false)
    runAction('insert-boundary')
    expect(root().boundaries).toHaveLength(1)
  })

  it('插入边界：中心主题没有子主题时提示错误', () => {
    useMapStore.getState().select([root().id], false)
    runAction('insert-boundary')
    expect(root().boundaries).toBeUndefined()
    expect(useUiStore.getState().toasts.at(-1)?.tone).toBe('error')
  })

  it('插入摘要：摘要挂到父主题上', () => {
    selectChild()
    runAction('insert-summary')
    expect(root().summaries).toHaveLength(1)
  })

  it('插入摘要：选中中心主题时汇总它的子主题', () => {
    const a = useMapStore.getState().addChild(root().id)!
    const b = useMapStore.getState().addChild(root().id)!
    useMapStore.getState().select([root().id], false)
    runAction('insert-summary')
    expect(root().summaries).toHaveLength(1)
    expect(root().summaries![0].range).toContain(a)
    expect(root().summaries![0].range).toContain(b)
  })

  it('插入摘要：中心主题没有子主题时提示错误', () => {
    useMapStore.getState().select([root().id], false)
    runAction('insert-summary')
    expect(root().summaries).toBeUndefined()
    expect(useUiStore.getState().toasts.at(-1)?.tone).toBe('error')
  })

  it('插入图片：打开图片对话框', () => {
    selectChild()
    runAction('insert-image')
    expect(useUiStore.getState().dialog).toBe('image')
  })

  it('插入附件：打开附件对话框', () => {
    selectChild()
    runAction('insert-attachment')
    expect(useUiStore.getState().dialog).toBe('attachment')
  })
})
