import React, { useState } from "react";

const CATEGORIES = {
  "😊 Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😇","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🫣","🤭","🤫","🫡","🫠","🥴","😵","🤐","🥱","😴","🤤","😪","🙄","😬","🫨","😮","🤐"],
  "👍 Gestures": ["👍","👎","👏","🙌","🤝","🤜","🤛","✊","👊","🤚","✋","🖐","👋","🤙","💪","🦾","🖖","☝️","👆","👇","👉","👈","🫵","🤞","✌️","🤟","🤘","🖕","🤙","💅","🫰","👌","🤌","🤏","👐","🤲","🙏","🫶","❤️‍🔥","💔","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕","💞","💓","💗","💖","💘","💝","💟","❣️"],
  "🎉 Celebration": ["🎉","🎊","🎈","🎁","🏆","🥇","🎖️","🏅","🎗️","🎀","🎆","🎇","✨","⭐","🌟","💫","🔥","🎯","🎮","🎲","🃏","🎴","🀄","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎸","🎹","🎺","🎻","🥁","🪘","🎷","🪗","🎙️"],
  "🐶 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦏","🦛","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🦙","🐑","🐏","🐐","🦌"],
  "🍕 Food": ["🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🥗","🥣","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🍸","🍹","🧉","🍾","🧊"],
  "⚽ Sports": ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🎣","🤿","🎽","🎿","🛷","🥌","🎯","🎱","🎳","🏹","🥊","🥋","🤺","🤼","🤸","⛹️","🤾","🏌️","🧘","🏋️","🚴","🤼","🤽","🏊","🧗","🏇","🤸","🏄"],
};

const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(Object.keys(CATEGORIES)[0]);
  const [search, setSearch] = useState("");

  const allEmojis = Object.values(CATEGORIES).flat();
  const filtered = search
    ? allEmojis.filter((e) => e.includes(search))
    : CATEGORIES[activeCategory] || [];

  return (
    <div className="w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#008ecc]"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex overflow-x-auto px-2 pt-2 gap-1 border-b border-gray-100 scrollbar-hide">
          {Object.keys(CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              title={cat}
              className={`flex-shrink-0 text-base px-2 py-1 rounded-lg transition
                ${activeCategory === cat ? "bg-[#e8f7ff]" : "hover:bg-gray-50"}`}
            >
              {cat.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {filtered.map((emoji, i) => (
          <button
            key={i}
            onClick={() => { onSelect(emoji); onClose?.(); }}
            className="text-xl w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
