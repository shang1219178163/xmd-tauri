import type { AttachmentRef } from '@shared/types'

/**
 * 只有一个带本地路径的附件时，点击角标可以直接打开它；
 * 其余情况（多个附件、或附件没有路径）应打开附件列表让用户选择。
 */
export function directAttachmentPath(list: AttachmentRef[]): string | undefined {
  return list.length === 1 && list[0].path ? list[0].path : undefined
}
