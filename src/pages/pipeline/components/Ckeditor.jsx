import React, { useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

const Ckeditor = () => {
    const [data, setData] = useState("");
  return (
    <div className="App">
      <CKEditor
        editor={ClassicEditor}
        data="<p>Hello from CKEditor 5!</p>"
        onChange={(event, editor) => {
          const data = editor.getData();
          setData(data);
        }}
      />
      <div className="mt-4">
        <strong>Preview:</strong>
        <div dangerouslySetInnerHTML={{ __html: data }} />
      </div>
    </div>
  )
}

export default Ckeditor