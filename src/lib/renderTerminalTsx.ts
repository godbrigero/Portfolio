import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const terminalRoot = fileURLToPath(new URL('../../public/terminal/', import.meta.url));

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getSafeTerminalTsxPath(pathParam: string) {
  const normalizedPath = normalize(pathParam).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(terminalRoot, normalizedPath);

  if (!filePath.startsWith(terminalRoot) || extname(filePath) !== '.tsx') {
    return null;
  }

  return filePath;
}

export function renderTsxSource(source: string) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'React.createElement',
      jsxFragmentFactory: 'React.Fragment',
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  const exports = module.exports;
  const requireShim = (specifier: string) => {
    if (specifier === 'react') {
      return React;
    }

    throw new Error(`Unsupported import: ${specifier}`);
  };

  new Function('exports', 'module', 'React', 'require', transpiled)(exports, module, React, requireShim);

  const exported = module.exports.default ?? module.exports;
  const Component = typeof exported === 'function' ? exported : null;

  if (!Component) {
    return `<pre>${escapeHtml(source)}</pre>`;
  }

  return renderToStaticMarkup(React.createElement(Component as React.ComponentType));
}

export async function renderTerminalTsxPage(pathParam: string) {
  const filePath = getSafeTerminalTsxPath(pathParam);

  if (!filePath || !existsSync(filePath)) {
    return null;
  }

  const source = await readFile(filePath, 'utf-8');

  try {
    return {
      title: basename(filePath, '.tsx'),
      html: renderTsxSource(source),
    };
  } catch (error) {
    return {
      title: basename(filePath, '.tsx'),
      html: `<pre>${escapeHtml(error instanceof Error ? error.message : 'Render failed')}</pre>`,
    };
  }
}
