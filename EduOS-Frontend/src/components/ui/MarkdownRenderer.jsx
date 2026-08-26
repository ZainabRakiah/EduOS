import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const MarkdownRenderer = ({ content = '' }) => {
  if (!content) return null;

  const parseContent = (text) => {
    // Escape HTML to prevent injection
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Parse Block equations $$ ... $$ or \[ ... \]
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return `<div class="my-4 overflow-x-auto flex justify-center py-2 bg-neutral-50 rounded-xl border border-neutral-100 shadow-inner">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch (e) {
        return `<pre class="text-xs text-red-500">${formula}</pre>`;
      }
    });

    html = html.replace(/\\\[([\s\S]+?)\\\]/g, (match, formula) => {
      try {
        return `<div class="my-4 overflow-x-auto flex justify-center py-2 bg-neutral-50 rounded-xl border border-neutral-100 shadow-inner">${katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch (e) {
        return `<pre class="text-xs text-red-500">${formula}</pre>`;
      }
    });

    // 2. Parse Inline equations $ ... $ or \( ... \)
    html = html.replace(/\$([^$]+?)\$/g, (match, formula) => {
      try {
        return `<span class="inline-math px-1">${katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })}</span>`;
      } catch (e) {
        return `<code class="text-red-500">${formula}</code>`;
      }
    });

    html = html.replace(/\\\(([\s\S]+?)\\\)/g, (match, formula) => {
      try {
        return `<span class="inline-math px-1">${katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })}</span>`;
      } catch (e) {
        return `<code class="text-red-500">${formula}</code>`;
      }
    });

    // 3. Parse Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-extrabold text-neutral-800 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-extrabold text-brand-700 mt-5 mb-2.5 border-b pb-1">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-extrabold text-neutral-900 mt-6 mb-3">$1</h1>');

    // 4. Parse Bold & Italic
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="font-extrabold text-neutral-850">$1</strong>');
    html = html.replace(/\*([\s\S]+?)\*/g, '<em class="italic text-neutral-600">$1</em>');

    // 5. Parse Tables
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        // Skip separator line (e.g. |---|---|)
        if (cells.every(c => c.match(/^:-*-?:*$/) || c.match(/^-+$/))) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHtml += '<div class="overflow-x-auto my-4 border rounded-xl shadow-sm"><table class="w-full text-xs text-left border-collapse">';
          tableHtml += '<thead class="bg-neutral-50 font-extrabold text-neutral-700 border-b"><tr>';
          cells.forEach(c => {
            tableHtml += `<th class="p-3">${c}</th>`;
          });
          tableHtml += '</tr></thead><tbody class="divide-y">';
        } else {
          tableHtml += '<tr class="hover:bg-neutral-50/50">';
          cells.forEach(c => {
            tableHtml += `<td class="p-3 font-semibold text-neutral-650">${c}</td>`;
          });
          tableHtml += '</tr>';
        }
        lines[i] = '';
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</tbody></table></div>';
          lines[i] = tableHtml + '\n' + lines[i];
          tableHtml = '';
        }
      }
    }
    
    if (inTable) {
      tableHtml += '</tbody></table></div>';
      lines[lines.length - 1] = tableHtml;
    }
    
    html = lines.join('\n');

    // 6. Parse Lists
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="ml-4 list-disc pl-1 py-0.5 text-xs font-semibold text-neutral-650">$1</li>');

    // 7. Parse line breaks (only single breaks, keep multiple paragraphs distinct)
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  return (
    <div 
      className="markdown-body w-full max-w-none text-neutral-800 select-text"
      dangerouslySetInnerHTML={{ __html: parseContent(content) }}
    />
  );
};
