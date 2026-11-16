import instructions from '../../skills/paper-notebook-practice/prompts/instructions.json';

/** One-sentence launchers and full portable instructions for each environment. */
export const PROJECT_URL='https://github.com/BurntRoses/paper-notebook-practice';
export const ENTRY_PROMPTS={
 agent:{
  label:'智能体',
  examples:'Codex · Claude Code · DeepSeek Harness · WorkBuddy',
  instructions:instructions.agent,
  prompt:`请阅读 ${PROJECT_URL} 的 AGENTS.md，先读我上传的资料并一次确认范围、版式、水印和导出格式，再按我的回复制作试卷、答案卷、答题卡或全量题库。`
 },
 chat:{
  label:'网页对话',
  examples:'ChatGPT · DeepSeek 等网页会话',
  instructions:instructions.chat,
  prompt:`请阅读 ${PROJECT_URL} 的 WEB_CHAT.md，先读我上传的资料并一次确认范围、版式、水印和导出格式，再按我的回复制作试卷、答案卷、答题卡或全量题库。`
 }
} as const;
