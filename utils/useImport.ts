import { useCallback } from 'react';
import unified from 'unified';
import markdown from 'remark-parse';
import { createEditor, Descendant, Editor, Element, Transforms } from 'slate';
import { toast } from 'react-toastify';
import wikiLinkPlugin from 'remark-wiki-link';
import { v4 as uuidv4 } from 'uuid';
import { store, useStore } from 'lib/store';
import { NoteUpsert } from 'lib/api/upsertNote';
import supabase from 'lib/supabase';
import { DEFAULT_EDITOR_VALUE } from 'editor/constants';
import remarkToSlate from 'editor/serialization/remarkToSlate';
import withLinks from 'editor/plugins/withLinks';
import withVoidElements from 'editor/plugins/withVoidElements';
import { caseInsensitiveStringEqual } from 'utils/string';
import { ElementType, NoteLink } from 'types/slate';
import { Note } from 'types/supabase';
import { Feature } from 'constants/pricing';
import { useAuth } from './useAuth';
import useFeature from './useFeature';

export default function useImport() {
  const { user } = useAuth();
  const canCreateNote = useFeature(Feature.NumOfNotes);
  const setIsUpgradeModalOpen = useStore(
    (state) => state.setIsUpgradeModalOpen
  );

  const onImport = useCallback(() => {
    if (!canCreateNote) {
      setIsUpgradeModalOpen(true);
      return;
    }

    if (!user) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.text, .txt, .md, .mkdn, .mdwn, .mdown, .markdown';
    input.multiple = true;

    input.onchange = async (e) => {
      if (!e.target) {
        return;
      }

      const inputElement = e.target as HTMLInputElement;

      if (!inputElement.files) {
        return;
      }

      const importingToast = toast.info('Importing notes, please wait...', {
        autoClose: false,
      });

      // Add a new note for each imported note
      const upsertData: NoteUpsert[] = [];
      const noteLinkUpsertData: NoteUpsert[] = [];
      const noteTitleToIdCache: Record<string, string | undefined> = {};
      for (const file of inputElement.files) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        if (!fileName) {
          continue;
        }
        const fileContent = await file.text();

        const { result } = unified()
          .use(markdown)
          .use(wikiLinkPlugin, { aliasDivider: '|' })
          .use(remarkToSlate)
          .processSync(fileContent);

        const { content: slateContent, upsertData: newUpsertData } =
          fixNoteLinks(result as Descendant[], noteTitleToIdCache);

        noteLinkUpsertData.push(...newUpsertData);
        upsertData.push({
          user_id: user.id,
          title: fileName,
          content:
            slateContent.length > 0 ? slateContent : DEFAULT_EDITOR_VALUE,
        });
      }

      // Create new notes that are linked to
      const { data: newLinkedNotes } = await supabase
        .from<Note>('notes')
        .upsert(noteLinkUpsertData, { onConflict: 'user_id, title' });

      // Create new notes from files
      const { data: newNotes } = await supabase
        .from<Note>('notes')
        .upsert(upsertData, { onConflict: 'user_id, title' });

      // Show a toast with the number of successfully imported notes
      toast.dismiss(importingToast);
      const numOfSuccessfulImports =
        [...(newLinkedNotes ?? []), ...(newNotes ?? [])]?.filter(
          (note) => !!note
        ).length ?? 0;
      if (numOfSuccessfulImports > 1) {
        toast.success(
          `${numOfSuccessfulImports} notes were successfully imported.`
        );
      } else if (numOfSuccessfulImports === 1) {
        toast.success(
          `${numOfSuccessfulImports} note was successfully imported.`
        );
      } else {
        toast.error('No notes were imported.');
      }
    };

    input.click();
  }, [user, canCreateNote, setIsUpgradeModalOpen]);

  return onImport;
}

/**
 * Fixes note links by adding the proper note id to the link.
 * The note id comes from an existing note, or a new note is created.
 */
const fixNoteLinks = (
  content: Descendant[],
  noteTitleToIdCache: Record<string, string | undefined> = {}
): { content: Descendant[]; upsertData: NoteUpsert[] } => {
  const upsertData = [];

  const editor = withVoidElements(withLinks(createEditor()));
  editor.children = content;

  // Find note link elements
  const matchingElements = Editor.nodes<NoteLink>(editor, {
    at: [],
    match: (n) => Element.isElement(n) && n.type === ElementType.NoteLink,
  });

  const notesArr = Object.values(store.getState().notes);
  for (const [node, path] of matchingElements) {
    const noteTitle = node.noteTitle;
    let noteId;

    const existingNoteId =
      noteTitleToIdCache[noteTitle.toLowerCase()] ??
      notesArr.find((note) => caseInsensitiveStringEqual(note.title, noteTitle))
        ?.id;

    if (existingNoteId) {
      noteId = existingNoteId;
    } else {
      noteId = uuidv4(); // Create new note id
      const userId = supabase.auth.user()?.id;
      if (userId) {
        upsertData.push({ id: noteId, user_id: userId, title: noteTitle });
      }
    }
    noteTitleToIdCache[noteTitle.toLowerCase()] = noteId; // Add to cache

    // Set proper note id on the note link
    Transforms.setNodes(
      editor,
      { noteId },
      {
        at: path,
        match: (n) =>
          Element.isElement(n) &&
          n.type === ElementType.NoteLink &&
          n.noteTitle === noteTitle,
      }
    );
  }

  return { content: editor.children, upsertData };
};
