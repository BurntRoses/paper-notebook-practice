import instructions from '../../skills/paper-notebook-practice/prompts/instructions.json';

export const PROJECT_URL='https://github.com/BurntRoses/paper-notebook-practice';
const entryPrompt=(mode:'agent'|'chat')=>[instructions[mode],instructions.workflow].join('\n\n');
export const ENTRY_PROMPTS={
 agent:{
  label:'智能体',
  examples:'Codex、Claude Code、DeepSeek Harness、WorkBuddy 等智能体',
  prompt:entryPrompt('agent')
 },
 chat:{
  label:'网页对话',
  examples:'ChatGPT · DeepSeek 等网页会话',
  prompt:entryPrompt('chat')
 }
} as const;
