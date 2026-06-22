import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

const RichTextEditor = () => {
  const editorRef = useRef(null);

  const logContent = () => {
    if (editorRef.current) {
      console.log(editorRef.current.getContent());
    }
  };

  return (
    <div>
      <Editor
        apiKey="gvtu365tvudohscw2casesui8np897anckhy300jvdzau9v9" 
        onInit={(evt, editor) => editorRef.current = editor}
        initialValue="<p></p>"
        init={{
          height: 300,
          menubar: false,
          plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table paste code help wordcount'
          ],
          toolbar:
            'undo redo | formatselect | bold italic backcolor | \
            alignleft aligncenter alignright alignjustify | \
            bullist numlist outdent indent | removeformat | help'
        }}
      />
      {/* <button onClick={logContent}>Log Content</button> */}
    </div>
  );
};

export default RichTextEditor;
