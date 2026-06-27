import { extname, normalize } from 'node:path';
import { terminalTsxSources } from '@/generated/portfolioContent';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function getSafeTerminalTsxKey(pathParam: string) {
  const normalizedPath = normalize(pathParam)
    .replace(/^(\.\.(\/|\\|$))+/, '')
    .replaceAll('\\', '/');

  if (
    normalizedPath.startsWith('/') ||
    normalizedPath.includes('../') ||
    extname(normalizedPath) !== '.tsx'
  ) {
    return null;
  }

  return normalizedPath;
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
  const sourceKey = getSafeTerminalTsxKey(pathParam);

  if (!sourceKey || !(sourceKey in terminalTsxSources)) {
    return null;
  }

  const entry = terminalTsxSources[sourceKey as keyof typeof terminalTsxSources];
  const { source, title } = entry;

  try {
    return {
      title,
      html: renderTsxSource(source),
    };
  } catch (error) {
    return {
      title,
      html: `<pre>${escapeHtml(error instanceof Error ? error.message : 'Render failed')}</pre>`,
    };
  }
}
