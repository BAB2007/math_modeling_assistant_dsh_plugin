/** 数学建模 Skill Suite：内置技能注册 + mm_* 工作流工具 + 系统提示协议。 */
import type { Context } from '@deepseek-ai/cordis'

/** 插件行配置：当前版本不读取任何配置项，知识库路径由 import.meta.url 推导。 */
export interface Config {}

/** Cordis 插件身份。 */
export declare const name: 'math-modeling'

/**
 * 注册内置技能（路由 + 子技能）、mm_* 工具、系统提示段，并初始化项目状态目录。
 * @param ctx - 携带 tools / skills / fs / shell / systemPrompt 服务的宿主上下文。
 */
export declare function apply(ctx: Context): Promise<void>

/** 技能发现：解析 YAML frontmatter，返回可注册的技能条目。 */
export declare function discoverSkills(): Array<{
  name: string
  description: string
  whenToUse?: string
  content: string
  path: string
}>