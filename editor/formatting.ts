import {
  Editor as SlateEditor,
  Element as SlateElement,
  Transforms,
  Range,
} from 'slate';
import { ReactEditor } from 'slate-react';

export const LIST_TYPES = ['numbered-list', 'bulleted-list'];

export const isMarkActive = (editor: ReactEditor, format: string) => {
  const [match] = SlateEditor.nodes(editor, {
    match: (n) => n[format] === true,
    mode: 'all',
  });
  return !!match;
};

export const toggleMark = (editor: ReactEditor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
};

export const isBlockActive = (editor: ReactEditor, format: string) => {
  const [match] = SlateEditor.nodes(editor, {
    match: (n) =>
      !SlateEditor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === format,
  });

  return !!match;
};

export const toggleBlock = (editor: ReactEditor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !SlateEditor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type as string),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : format,
  };
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

export const unwrapLink = (editor: ReactEditor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !SlateEditor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === 'link',
  });
};

export const insertLink = (editor: ReactEditor, url: string, text?: string) => {
  const { selection } = editor;
  if (!selection) {
    return;
  }

  if (isBlockActive(editor, 'link')) {
    unwrapLink(editor);
  }

  const isCollapsed = selection && Range.isCollapsed(selection);
  const shouldInsertNode = isCollapsed || text;
  const link = {
    type: 'link',
    url,
    children: shouldInsertNode ? [{ text: text ?? url }] : [],
  };

  if (shouldInsertNode) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
};
