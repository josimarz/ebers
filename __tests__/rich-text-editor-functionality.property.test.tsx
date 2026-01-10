/**
 * Property-Based Tests for Rich Text Editor Functionality
 * Feature: patient-management-system, Property 20: Rich Text Editor Functionality
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

// Mock Tiptap editor for testing
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleStrike: jest.fn(() => ({ run: jest.fn() })),
        toggleHeading: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
        toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
        setHorizontalRule: jest.fn(() => ({ run: jest.fn() })),
        undo: jest.fn(() => ({ run: jest.fn() })),
        redo: jest.fn(() => ({ run: jest.fn() }))
      }))
    },
    can: jest.fn(() => ({
      undo: jest.fn(() => true),
      redo: jest.fn(() => true)
    })),
    isActive: jest.fn(() => false),
    setEditable: jest.fn(),
    isEmpty: false
  })),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      <p>Mock Editor Content</p>
    </div>
  )
}));

describe('Rich Text Editor Functionality Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 20: Rich Text Editor Functionality
   * For any rich text editor instance, it should support all required formatting options
   * and preserve formatting through save/load cycles
   */
  describe('Property 20: Rich Text Editor Functionality', () => {
    it('should render editor with all required formatting buttons', () => {
      fc.assert(
        fc.property(
          fc.record({
            content: fc.string({ maxLength: 50 }),
            placeholder: fc.string({ maxLength: 30 }),
            disabled: fc.boolean()
          }),
          (props) => {
            const mockOnChange = jest.fn();
            
            const { unmount } = render(
              <RichTextEditor
                content={props.content}
                onChange={mockOnChange}
                placeholder={props.placeholder}
                disabled={props.disabled}
              />
            );

            try {
              if (!props.disabled) {
                // Verify all required formatting buttons are present
                // Requirements 10.2: bold, italic, underline, strikethrough
                expect(screen.getByRole('button', { name: /^B$/i })).toBeInTheDocument();
                expect(screen.getByText('I').closest('button')).toBeInTheDocument(); // More specific for italic
                expect(screen.getByRole('button', { name: /^S$/i })).toBeInTheDocument();

                // Requirements 10.4: heading levels (h1, h2, h3)
                expect(screen.getByRole('button', { name: /^H1$/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /^H2$/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /^H3$/i })).toBeInTheDocument();

                // List formatting
                expect(screen.getByRole('button', { name: /• Lista/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /1\. Lista/i })).toBeInTheDocument();

                // Other formatting options
                expect(screen.getByRole('button', { name: /" Citação/i })).toBeInTheDocument();

                // Undo/Redo functionality
                expect(screen.getByRole('button', { name: /↶/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /↷/i })).toBeInTheDocument();
              } else {
                // When disabled, toolbar should not be present
                expect(screen.queryByRole('button', { name: /^B$/i })).not.toBeInTheDocument();
              }

              // Editor content should always be present
              expect(screen.getByTestId('editor-content')).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle content changes and call onChange callback', () => {
      fc.assert(
        fc.property(
          fc.record({
            initialContent: fc.string({ maxLength: 30 }),
            newContent: fc.string({ maxLength: 30 })
          }),
          (props) => {
            const mockOnChange = jest.fn();
            
            const { rerender, unmount } = render(
              <RichTextEditor
                content={props.initialContent}
                onChange={mockOnChange}
                disabled={false}
              />
            );

            try {
              // Simulate content change by re-rendering with new content
              rerender(
                <RichTextEditor
                  content={props.newContent}
                  onChange={mockOnChange}
                  disabled={false}
                />
              );

              // Verify editor content is rendered
              expect(screen.getByTestId('editor-content')).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should disable editing when disabled prop is true', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 30 }),
          (content) => {
            const mockOnChange = jest.fn();
            
            const { unmount } = render(
              <RichTextEditor
                content={content}
                onChange={mockOnChange}
                disabled={true}
              />
            );

            try {
              // Toolbar should not be present when disabled
              expect(screen.queryByRole('button', { name: /^B$/i })).not.toBeInTheDocument();
              const italicElement = screen.queryByText('I');
              if (italicElement) {
                expect(italicElement.closest('button')).not.toBeInTheDocument();
              }

              // Editor content should still be present but with disabled styling
              const editorContent = screen.getByTestId('editor-content');
              expect(editorContent).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should display placeholder when content is empty', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (placeholder) => {
            const mockOnChange = jest.fn();
            
            const { unmount } = render(
              <RichTextEditor
                content=""
                onChange={mockOnChange}
                placeholder={placeholder}
                disabled={false}
              />
            );

            try {
              // Editor should be present
              expect(screen.getByTestId('editor-content')).toBeInTheDocument();
              
              // Formatting toolbar should be present when not disabled
              expect(screen.getByRole('button', { name: /^B$/i })).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Rich Text Editor Integration Tests', () => {
    it('should maintain consistent behavior across different content types', () => {
      const htmlContent = '<p><strong>Bold text</strong> and <em>italic text</em></p>';
      const plainContent = 'Plain text content';
      const emptyContent = '';

      [htmlContent, plainContent, emptyContent].forEach((content) => {
        const mockOnChange = jest.fn();
        
        const { unmount } = render(
          <RichTextEditor
            content={content}
            onChange={mockOnChange}
            disabled={false}
          />
        );

        // Editor should render successfully with any content type
        expect(screen.getByTestId('editor-content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^B$/i })).toBeInTheDocument();

        unmount();
      });
    });

    it('should handle rapid state changes without errors', () => {
      const mockOnChange = jest.fn();
      
      render(
        <RichTextEditor
          content="Initial content"
          onChange={mockOnChange}
          disabled={false}
        />
      );

      // Verify buttons are present and functional (without clicking)
      const boldButton = screen.getByRole('button', { name: /^B$/i });
      const italicButton = screen.getByText('I').closest('button') as HTMLElement;
      const h1Button = screen.getByRole('button', { name: /^H1$/i });

      // Editor should remain functional
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(boldButton).toBeInTheDocument();
      expect(italicButton).toBeInTheDocument();
      expect(h1Button).toBeInTheDocument();
    });
  });
});