import React, { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import cpp from 'highlight.js/lib/languages/cpp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import csharp from 'highlight.js/lib/languages/csharp';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import CopyButton from './CopyButton';
import 'highlight.js/styles/github-dark.min.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('php', php);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('swift', swift);

const LANG_ALIASES = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml',
  html: 'xml', htm: 'xml', svg: 'xml', c: 'cpp', 'c++': 'cpp', h: 'cpp',
  cs: 'csharp', 'c#': 'csharp', md: 'markdown',
};

const LANG_LABELS = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java',
  css: 'CSS', json: 'JSON', bash: 'Bash', xml: 'HTML', sql: 'SQL', cpp: 'C++',
  go: 'Go', rust: 'Rust', php: 'PHP', yaml: 'YAML', markdown: 'Markdown',
  csharp: 'C#', kotlin: 'Kotlin', swift: 'Swift',
};

function normalizeLang(lang) {
  if (!lang) return '';
  const key = lang.toLowerCase().trim();
  return LANG_ALIASES[key] || key;
}

function formatLangLabel(lang) {
  if (!lang) return 'Code';
  return LANG_LABELS[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

function highlightCode(code, lang) {
  const normalized = normalizeLang(lang);
  if (normalized && hljs.getLanguage(normalized)) {
    return hljs.highlight(code, { language: normalized });
  }
  return hljs.highlightAuto(code, [
    'javascript', 'typescript', 'python', 'java', 'css', 'json',
    'bash', 'xml', 'sql', 'cpp', 'go', 'rust', 'php', 'yaml', 'csharp',
  ]);
}

export default function CodeBlock({ code, lang: langHint = '' }) {
  const { html, language } = useMemo(() => {
    const result = highlightCode(code, langHint);
    return { html: result.value, language: result.language || normalizeLang(langHint) };
  }, [code, langHint]);

  const label = formatLangLabel(language);

  return (
    <div className="border border-[#30363d] rounded-xl overflow-hidden max-w-full bg-[#0d1117] shadow-md">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#161b22] border-b border-[#30363d]">
        <span className="text-xs font-semibold text-[#8b949e]">{label}</span>
        <CopyButton
          text={code}
          className="flex items-center justify-center w-7 h-7 rounded-md border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#484f58]"
          title="Copy code"
        />
      </div>
      <pre className="m-0 p-3.5 overflow-x-auto bg-[#0d1117]">
        <code className="hljs block font-mono text-[13px] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
