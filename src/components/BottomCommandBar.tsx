'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
type TerminalFile = {
  name: string;
  displayName: string;
  href: string;
  extension?: string;
};
type TerminalDirectory = {
  name: string;
  files: TerminalFile[];
};
type TerminalManifest = {
  directories: TerminalDirectory[];
  rootFiles: TerminalFile[];
};
type CommandResult = {
  output?: CommandOutput[];
  nextTheme?: Theme;
  nextDirectory?: string;
  navigateUrl?: string;
  clear?: boolean;
};
type CommandOutput =
  | string
  | {
      text: string;
      file: TerminalFile;
      directory: string;
    };
type TerminalLine =
  | {
      id: number;
      kind: 'input';
      text: string;
    }
  | {
      id: number;
      kind: 'output';
      text: string;
      file?: {
        file: TerminalFile;
        directory: string;
      };
    };
type BottomCommandBarProps = {
  manifest: TerminalManifest;
};

declare global {
  interface Window {
    portfolioTheme?: {
      get: () => Theme;
      set: (theme: Theme) => void;
      toggle: () => void;
    };
    portfolioNavigate?: (url: string) => void;
  }
}

const commandNames = ['help', 'cd', 'ls', 'bash', 'nano', 'clear'];

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function normalizeArgument(argument: string) {
  return argument.trim().replace(/^\.\//, '').replace(/\/$/, '');
}

function formatPrompt(directory: string) {
  return directory ? `~/${directory}/ %` : '~ %';
}

function getCommandParts(input: string) {
  const [command = '', ...rest] = input.trim().split(/\s+/);
  return {
    command: command.toLowerCase(),
    argument: normalizeArgument(rest.join(' ')),
  };
}

function displayDirectoryFiles(directory: TerminalDirectory) {
  return directory.files.length > 0 ? directory.files.map((file) => file.displayName) : ['(empty)'];
}

function getVisibleEntries(manifest: TerminalManifest, directory: string) {
  if (!directory) {
    return [
      ...manifest.directories.map((entry) => `${entry.name}/`),
      ...manifest.rootFiles.map((file) => file.displayName),
    ];
  }

  const currentDirectory = manifest.directories.find((entry) => entry.name === directory);
  return currentDirectory ? displayDirectoryFiles(currentDirectory) : [];
}

function matchesFile(file: TerminalFile, argument: string) {
  const requestedName = normalizeArgument(argument);
  const markdownBase = file.displayName.replace(/\.md$/, '');
  return [file.name, file.displayName, markdownBase].includes(requestedName);
}

function findVisibleFile(manifest: TerminalManifest, directory: string, argument: string) {
  if (!argument || !directory) {
    return null;
  }

  const currentDirectory = manifest.directories.find((entry) => entry.name === directory);
  return currentDirectory?.files.find((file) => matchesFile(file, argument)) ?? null;
}

function getVisibleOutputEntries(manifest: TerminalManifest, directory: string): CommandOutput[] {
  if (!directory) {
    return [
      ...manifest.directories.map((entry) => `${entry.name}/`),
      ...manifest.rootFiles.map((file) => file.displayName),
    ];
  }

  const currentDirectory = manifest.directories.find((entry) => entry.name === directory);

  if (!currentDirectory || currentDirectory.files.length === 0) {
    return ['(empty)'];
  }

  return currentDirectory.files.map((file) => ({
    text: file.displayName,
    file,
    directory,
  }));
}

function readEchoLines(script: string) {
  return [...script.matchAll(/^echo\s+["']?(.+?)["']?\s*$/gm)].map((match) => match[1]);
}

function getProjectUrl(directory: string, file: TerminalFile) {
  const slug = file.name.replace(/\.[^.]+$/, '');
  return `/project/${encodeURIComponent(directory)}/${encodeURIComponent(slug)}`;
}

function navigateTo(url: string) {
  window.portfolioNavigate?.(url) ?? window.location.assign(url);
}

async function fetchText(href: string) {
  const response = await fetch(href);

  if (!response.ok) {
    throw new Error(`unable to read ${href}`);
  }

  return response.text();
}

export function BottomCommandBar({ manifest }: BottomCommandBarProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [directory, setDirectory] = useState('');
  const [input, setInput] = useState('');
  const [caretIndex, setCaretIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const nextLineId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const safeCaretIndex = Math.min(caretIndex, input.length);
  const isShowingHint = input.length === 0 && lines.length === 0;
  const textBeforeCursor = input.slice(0, safeCaretIndex);
  const cursorCharacter = isShowingHint ? '#' : input[safeCaretIndex] ?? '\u00a0';
  const cursorIsOverCharacter = isShowingHint || safeCaretIndex < input.length;
  const textAfterCursor = input.slice(safeCaretIndex + (safeCaretIndex < input.length ? 1 : 0));
  const completionOptions = useMemo(() => {
    const visibleFiles = directory
      ? getVisibleEntries(manifest, directory).map((entry) => entry.replace(/\/$/, ''))
      : [];
    return [
      ...commandNames,
      ...manifest.directories.map((entry) => `cd ${entry.name}`),
      'cd ..',
      ...manifest.rootFiles.map((file) => `bash ${file.displayName}`),
      ...visibleFiles.map((entry) => `nano ${entry}`),
    ];
  }, [directory, manifest]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.removeItem('portfolio:terminal-state:v1');
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, left: 0 });
  }, [lines]);

  useEffect(() => {
    function setRequestedTheme(event: Event) {
      const requestedTheme = (event as CustomEvent<Theme>).detail;
      if (requestedTheme === 'dark' || requestedTheme === 'light') {
        setTheme(requestedTheme);
      }
    }

    function toggleTheme() {
      setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    }

    window.portfolioTheme = {
      get: () => theme,
      set: setTheme,
      toggle: toggleTheme,
    };
    window.addEventListener('portfolio:set-theme', setRequestedTheme);
    window.addEventListener('portfolio:toggle-theme', toggleTheme);

    return () => {
      window.removeEventListener('portfolio:set-theme', setRequestedTheme);
      window.removeEventListener('portfolio:toggle-theme', toggleTheme);
      delete window.portfolioTheme;
    };
  }, [theme]);

  function createLine(
    kind: TerminalLine['kind'],
    text: string,
    file?: { file: TerminalFile; directory: string },
  ): TerminalLine {
    nextLineId.current += 1;
    return { id: nextLineId.current, kind, text, file } as TerminalLine;
  }

  function focusTerminal() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function syncCaretFromInput() {
    const selectionStart = inputRef.current?.selectionStart;
    if (typeof selectionStart === 'number') {
      setCaretIndex(selectionStart);
    }
  }

  function syncCaretSoon() {
    window.requestAnimationFrame(syncCaretFromInput);
  }

  function setCommandInput(nextInput: string, nextCaretIndex = nextInput.length) {
    setInput(nextInput);
    setCaretIndex(nextCaretIndex);
    window.requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(nextCaretIndex, nextCaretIndex);
      inputRef.current?.focus();
    });
  }

  async function executeCommand(commandInput: string): Promise<CommandResult> {
    const { command, argument } = getCommandParts(commandInput);

    if (command === 'help') {
      return {
        output: [
          '# Open a project:',
          '#   ls',
          '#   cd open_source/',
          '#   ls',
          '#   nano test.tsx',
          '# Scripts run from ~/ with bash contact.sh or bash theme.sh.',
          '',
          'help          show available commands',
          'ls            list folders and files in the current folder',
          'cd <folder>   enter a folder shown by ls',
          'bash <file>   run a .sh file shown by ls',
          'nano <file>   open a project file in the right panel',
          'clear         clear terminal output',
        ],
      };
    }

    if (command === 'clear') {
      return { clear: true };
    }

    if (command === 'ls') {
      return { output: getVisibleOutputEntries(manifest, directory) };
    }

    if (command === 'cd') {
      if (!argument || argument === '..' || argument === '~' || argument === '/') {
        return {
          nextDirectory: '',
          output: ['~/'],
        };
      }

      const requestedDirectory = manifest.directories.find((entry) => entry.name === argument);
      if (!requestedDirectory) {
        return { output: [`cd: no such folder: ${argument}`, 'try: ls'] };
      }

      return {
        nextDirectory: requestedDirectory.name,
        output: [`~/${requestedDirectory.name}/`],
      };
    }

    if (command === 'bash') {
      const script = manifest.rootFiles.find(
        (file) => file.extension === '.sh' && matchesFile(file, argument),
      );

      if (!script) {
        return { output: [`bash: no such script: ${argument || '<empty>'}`, 'try: ls'] };
      }

      if (script.name === 'theme.sh') {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        return {
          nextTheme,
          output: [`theme:${nextTheme}`],
        };
      }

      try {
        const scriptText = await fetchText(script.href);
        const echoOutput = readEchoLines(scriptText);
        return { output: echoOutput.length > 0 ? echoOutput : [`ran ${script.displayName}`] };
      } catch {
        return { output: [`bash: could not run ${script.displayName}`] };
      }
    }

    if (command === 'nano') {
      const file = findVisibleFile(manifest, directory, argument);

      if (!file) {
        return {
          output: [
            directory
              ? `nano: no such file: ${argument || '<empty>'}`
              : 'nano: cd into a folder first',
            'try: ls',
          ],
        };
      }

      return {
        output: [`opened ${file.displayName}`],
        navigateUrl: getProjectUrl(directory, file),
      };
    }

    return {
      output: [`command not found: ${commandInput}`, 'try: help'],
    };
  }

  function navigateToProject(file: TerminalFile, fileDirectory: string) {
    navigateTo(getProjectUrl(fileDirectory, file));
  }

  async function runCommand(rawInput: string) {
    const commandInput = rawInput.trim();
    if (!commandInput) {
      return;
    }

    const inputLine = createLine('input', `${formatPrompt(directory)} ${commandInput}`);
    const result = await executeCommand(commandInput);
    const outputLines = (result.output ?? []).map((line) =>
      typeof line === 'string'
        ? createLine('output', line)
        : createLine('output', line.text, { file: line.file, directory: line.directory }),
    );

    if (result.nextTheme) {
      setTheme(result.nextTheme);
    }

    if (typeof result.nextDirectory === 'string') {
      setDirectory(result.nextDirectory);
    }

    if (result.clear) {
      nextLineId.current = 0;
    }

    setLines((currentLines) => (result.clear ? [] : [...currentLines, inputLine, ...outputLines]));
    setHistory((currentHistory) => [...currentHistory, commandInput].slice(-24));
    setHistoryIndex(null);
    setCommandInput('', 0);

    if (result.navigateUrl) {
      navigateTo(result.navigateUrl);
      return;
    }

    focusTerminal();
  }

  function getCompletion(inputValue: string) {
    const normalizedInput = inputValue.trim().toLowerCase();
    if (!normalizedInput) {
      return 'help';
    }

    if (!directory) {
      const directFolderPrefix = normalizeArgument(normalizedInput);
      const cdFolderPrefix = normalizedInput.startsWith('cd ')
        ? normalizeArgument(normalizedInput.slice(3))
        : null;
      const folderPrefix = cdFolderPrefix ?? directFolderPrefix;
      const folderMatches = manifest.directories.filter((entry) => entry.name.startsWith(folderPrefix));

      if (folderMatches.length === 1) {
        return `cd ${folderMatches[0].name}/`;
      }
    }

    const matches = completionOptions.filter((completion) => completion.startsWith(normalizedInput));
    return matches.length === 1 ? matches[0] : null;
  }

  function completeCommand() {
    const completion = getCompletion(input);

    if (completion) {
      setCommandInput(completion);
      focusTerminal();
      return;
    }

    const matches = completionOptions.filter((completionOption) =>
      completionOption.startsWith(input.trim().toLowerCase()),
    );

    if (matches.length > 1) {
      setLines((currentLines) => [...currentLines, createLine('output', matches.join('  '))]);
      focusTerminal();
    }
  }

  function recallHistory(direction: 'previous' | 'next') {
    if (direction === 'previous') {
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
        focusTerminal();
      }
      return;
    }

    if (historyIndex === null) {
      return;
    }

    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) {
      setHistoryIndex(null);
      setCommandInput('', 0);
    } else {
      setHistoryIndex(nextIndex);
      setCommandInput(history[nextIndex]);
    }
    focusTerminal();
  }

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    void runCommand(input);
  }

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        document.activeElement === inputRef.current
      ) {
        return;
      }

      const shouldRouteToTerminal =
        event.key.length === 1 ||
        event.key === 'Backspace' ||
        event.key === 'Delete' ||
        event.key === 'Enter' ||
        event.key === 'Tab' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Home' ||
        event.key === 'End';

      if (!shouldRouteToTerminal) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();

      if (event.key.length === 1) {
        const nextInput = `${input.slice(0, safeCaretIndex)}${event.key}${input.slice(safeCaretIndex)}`;
        setCommandInput(nextInput, safeCaretIndex + 1);
      } else if (event.key === 'Backspace') {
        if (safeCaretIndex > 0) {
          const nextInput = `${input.slice(0, safeCaretIndex - 1)}${input.slice(safeCaretIndex)}`;
          setCommandInput(nextInput, safeCaretIndex - 1);
        }
      } else if (event.key === 'Delete') {
        if (safeCaretIndex < input.length) {
          const nextInput = `${input.slice(0, safeCaretIndex)}${input.slice(safeCaretIndex + 1)}`;
          setCommandInput(nextInput, safeCaretIndex);
        }
      } else if (event.key === 'Enter') {
        void runCommand(input);
      } else if (event.key === 'Tab') {
        completeCommand();
      } else if (event.key === 'ArrowLeft') {
        setCommandInput(input, Math.max(0, safeCaretIndex - 1));
      } else if (event.key === 'ArrowRight') {
        setCommandInput(input, Math.min(input.length, safeCaretIndex + 1));
      } else if (event.key === 'Home') {
        setCommandInput(input, 0);
      } else if (event.key === 'End') {
        setCommandInput(input, input.length);
      } else if (event.key === 'ArrowUp') {
        recallHistory('previous');
      } else if (event.key === 'ArrowDown') {
        recallHistory('next');
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  });

  function handleTerminalWheel(event: React.WheelEvent<HTMLElement>) {
    const outputElement = outputRef.current;
    if (outputElement) {
      outputElement.scrollLeft = 0;
    }

    if (!outputElement || outputElement.scrollHeight <= outputElement.clientHeight) {
      return;
    }

    event.preventDefault();
    outputElement.scrollTop += event.deltaY;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setCommandInput(input, Math.max(0, safeCaretIndex - 1));
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setCommandInput(input, Math.min(input.length, safeCaretIndex + 1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setCommandInput(input, 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setCommandInput(input, input.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      recallHistory('previous');
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      completeCommand();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void runCommand(input);
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      recallHistory('next');
    }
  }

  return (
    <section className="terminal-zone">
    <section
      className="bottom-terminal"
      aria-label="Portfolio terminal"
      onWheel={handleTerminalWheel}
    >
        <div
          className="terminal-output"
          aria-live="polite"
          ref={outputRef}
          onScroll={(event) => {
            if (event.currentTarget.scrollLeft !== 0) {
              event.currentTarget.scrollLeft = 0;
            }
          }}
        >
          {lines.map((line) => (
            <div
              className={`terminal-line terminal-line--${line.kind}${
                line.kind === 'output' && line.text.endsWith('/') ? ' terminal-line--folder' : ''
              }`}
              key={line.id}
            >
              {line.kind === 'output' && line.file
                ? (() => {
                    const fileAction = line.file!;
                    return (
                      <button
                        type="button"
                        className="terminal-file-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigateToProject(fileAction.file, fileAction.directory);
                        }}
                      >
                        {line.text}
                      </button>
                    );
                  })()
                : line.text}
            </div>
          ))}
          <form className="terminal-prompt" onSubmit={handleSubmit}>
            <span aria-hidden="true">{formatPrompt(directory)}</span>
            <label className="terminal-input-field">
              <span className="terminal-typed" aria-hidden="true">
                {textBeforeCursor}
              </span>
              <span
                className={`terminal-block-cursor${cursorIsOverCharacter ? ' terminal-block-cursor--character' : ''}`}
                aria-hidden="true"
              >
                {cursorCharacter}
              </span>
              {isShowingHint ? (
                <span className="terminal-hint" aria-hidden="true">
                  {' hint: type "help" (this is a normal terminal)'}
                </span>
              ) : (
                <span className="terminal-typed" aria-hidden="true">
                  {textAfterCursor}
                </span>
              )}
              <input
                ref={inputRef}
                aria-label="Terminal command"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setCaretIndex(event.target.selectionStart ?? event.target.value.length);
                }}
                onClick={syncCaretSoon}
                onKeyDown={handleKeyDown}
                onKeyUp={syncCaretSoon}
                onSelect={syncCaretFromInput}
              />
            </label>
          </form>
        </div>
      </section>
    </section>
  );
}
