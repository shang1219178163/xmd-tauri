import { beforeEach, describe, expect, it } from 'vitest'
import { runAction } from './actions'
import { useMapStore } from './store/mapStore'
import { useUiStore } from './store/uiStore'

function resetAll(): void {
  useMapStore.getState().reset()
  useUiStore.setState({ activeRelationId: undefined, toasts: [] })
}

function connections() {
  return useMapStore.getState().getActiveSheet().relationships ?? []
}

describe('关系线删除', () => {
  beforeEach(resetAll)

  it('选中关系线时 Delete 只删除该关系线', () => {
    const rootId = useMapStore.getState().workbook.sheets[0].rootTopic.id
    const a = useMapStore.getState().addChild(rootId)!
    const b = useMapStore.getState().addChild(rootId)!
    const relId = useMapStore.getState().addRelationship(a, b)!
    useUiStore.getState().setActiveRelation(relId)

    runAction('delete')

    expect(connections()).toHaveLength(0)
    expect(useUiStore.getState().activeRelationId).toBeUndefined()
    // 主题不受影响
    expect(useMapStore.getState().getTopic(a)).toBeDefined()
  })

  it('没有选中关系线时 Delete 仍删除主题', () => {
    const rootId = useMapStore.getState().workbook.sheets[0].rootTopic.id
    const child = useMapStore.getState().addChild(rootId)!
    useMapStore.getState().select([child], false)

    runAction('delete')

    expect(useMapStore.getState().getTopic(child)).toBeUndefined()
  })
})
