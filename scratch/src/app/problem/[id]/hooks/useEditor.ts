'use client';
import { useCallback, useRef, useState } from 'react';
import type { LanguageId } from '../types';
import { DEFAULT_STARTERS } from '../types';
import type { ProblemDetail } from '../LeftPane';

export function useEditor(problem: ProblemDetail | null) {
  const [language, setLanguage] = useState<LanguageId>('javascript');
  const codeByLang = useRef<Record<LanguageId, string>>({ ...DEFAULT_STARTERS });
  const [code, setCode] = useState(DEFAULT_STARTERS.javascript);

  const handleLangChange = useCallback((next: LanguageId) => {
    codeByLang.current[language] = code;
    setLanguage(next);
    setCode(codeByLang.current[next] ?? DEFAULT_STARTERS[next]);
  }, [code, language]);

  const handleCodeChange = useCallback((v: string | undefined) => {
    const val = v ?? '';
    setCode(val);
    codeByLang.current[language] = val;
  }, [language]);

  const handleReset = useCallback(() => {
    if (!problem) return;
    const reset = (problem.starter_code?.[language] ?? '').trim() || DEFAULT_STARTERS[language];
    codeByLang.current[language] = reset;
    setCode(reset);
  }, [problem, language]);

  return { language, code, setCode, codeByLang, handleLangChange, handleCodeChange, handleReset };
}
