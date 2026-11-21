import instructions from '../../skills/paper-notebook-practice/prompts/instructions.json';

/** Short launchers; the repository owns the detailed authoring workflow. */
export const PROJECT_URL='https://github.com/BurntRoses/paper-notebook-practice';
export const EDITABLE_DELIVERY='请交付可重新导入纸间的完整作者文件 practice.json，包含题目、答案与出处，并提供生成的 HTML 试卷。';
export const ENTRY_PROMPTS={
 agent:{
  label:'智能体',
  examples:'Codex、Claude Code、DeepSeek Harness、WorkBuddy 等智能体',
  instructions:instructions.agent,
  prompt:instructions.agent
 },
 chat:{
  label:'网页对话',
  examples:'ChatGPT · DeepSeek 等网页会话',
  instructions:instructions.chat,
  prompt:instructions.chat
 }
} as const;
