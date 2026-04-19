import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";

// These are the TipTap Extensions We Use In The Editor.
export const BASE_EDITOR_EXTENSIONS = [
  StarterKit.configure({ link: false }), // disable StarterKit's built-in link so ours below is the only one
  TaskList,
  TaskItem.configure({ nested: true }),
  Link.configure({ openOnClick: false }),
];
