import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export const NoteWidget = ({ note, onUpdate }) => {
  const [content, setContent] = useState(note.content || "");
  const [isFocused, setIsFocused] = useState(false);

  // Debounced save
  useEffect(() => {
    if (content === note.content) return;
    const timer = setTimeout(() => {
      onUpdate(note.id, content);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, note.id, note.content, onUpdate]);

  return (
    <Card className={`h-full flex flex-col shadow-sm border ${isFocused ? 'ring-2 ring-blue-500 border-transparent' : 'border-yellow-200'} bg-yellow-50/80 transition-all duration-200`}>
      <CardHeader className="py-3 px-4 border-b border-yellow-200/50 bg-yellow-100/50 rounded-t-xl flex justify-between items-center flex-row">
        <CardTitle className="text-sm font-medium text-yellow-800">
          {note.title || "Note"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        <textarea 
          className="w-full h-full p-4 bg-transparent border-0 resize-none focus:outline-none text-gray-700 placeholder:text-gray-400 text-sm leading-relaxed"
          placeholder="Jot down a quick note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </CardContent>
    </Card>
  );
};
