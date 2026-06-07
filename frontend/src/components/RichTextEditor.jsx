import { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

/**
 * RichTextEditor — Wrapper TinyMCE self-hosted (tanpa API key)
 * Menggunakan paket npm `tinymce` langsung, tidak pakai tiny.cloud
 */
export default function RichTextEditor({ value, onChange, placeholder = '', minHeight = 200 }) {
  const editorRef = useRef(null);

  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        onInit={(_evt, editor) => { editorRef.current = editor; }}
        value={value}
        onEditorChange={(content) => onChange(content)}
        init={{
          license_key: 'gpl',
          height: minHeight,
          menubar: false,
          placeholder,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'charmap',
            'searchreplace', 'visualblocks', 'code',
            'insertdatetime', 'table', 'wordcount',
          ],
          toolbar:
            'bold italic underline strikethrough | ' +
            'bullist numlist | outdent indent | ' +
            'removeformat | table | code',
          skin: 'oxide-dark',
          content_css: 'dark',
          content_style: `
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              font-size: 13px;
              background: #0d0f1a;
              color: #e2e8f0;
              margin: 10px;
              line-height: 1.6;
            }
            p { margin: 0 0 8px; }
            ul, ol { margin: 0 0 8px; padding-left: 20px; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #2a2d3e; padding: 4px 8px; }
          `,
          branding: false,
          promotion: false,
          resize: true,
          statusbar: true,
          elementpath: false,
          base_url: '/tinymce',
        }}
      />
    </div>
  );
}
