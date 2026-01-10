'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Digite aqui...',
  disabled = false,
  className = ''
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering editor
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      })
    ],
    content,
    editable: !disabled,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
        'data-placeholder': placeholder,
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editor editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // Don't render editor until component is mounted (prevents SSR issues)
  if (!isMounted || !editor) {
    return (
      <div className={`border border-gray-300 rounded-lg p-4 min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-gray-500">Carregando editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden ${disabled ? 'bg-gray-50' : 'bg-white'} ${className}`}>
      {/* Toolbar */}
      {!disabled && (
        <div className="border-b border-gray-300 p-3 bg-gray-50 flex flex-wrap gap-2">
          {/* Text formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('bold') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            <strong>B</strong>
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('italic') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            <em>I</em>
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('strike') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            <s>S</s>
          </button>

          <div className="w-px h-8 bg-gray-300 mx-1"></div>

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            H1
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            H2
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('heading', { level: 3 }) ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            H3
          </button>

          <div className="w-px h-8 bg-gray-300 mx-1"></div>

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('bulletList') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            • Lista
          </button>
          
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('orderedList') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            1. Lista
          </button>

          <div className="w-px h-8 bg-gray-300 mx-1"></div>

          {/* Other formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 ${
              editor.isActive('blockquote') ? 'bg-[#197BBD] text-white border-[#197BBD]' : 'bg-white border-gray-300'
            }`}
            type="button"
          >
            " Citação
          </button>

          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 bg-white border-gray-300"
            type="button"
          >
            ―
          </button>

          <div className="w-px h-8 bg-gray-300 mx-1"></div>

          {/* Undo/Redo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 bg-white border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            ↶
          </button>
          
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-100 transition-colors duration-200 bg-white border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            ↷
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div className="relative min-h-[300px]">
        <EditorContent 
          editor={editor} 
          className={disabled ? 'opacity-60' : ''}
        />
      </div>
    </div>
  );
}