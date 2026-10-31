import React from 'react';
import { DocumentaryStyleConfig, DocumentaryStyleId } from '../../types/documentary';
import { DOCUMENTARY_STYLES } from '../../data/documentaryStyles';
import { Sparkles } from 'lucide-react';

interface StyleSelectorBarProps {
  currentStyleId: DocumentaryStyleId;
  onSelectStyle: (style: DocumentaryStyleConfig) => void;
}

export const StyleSelectorBar: React.FC<StyleSelectorBarProps> = ({
  currentStyleId,
  onSelectStyle,
}) => {
  return (
    <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Documentary Style:</span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {DOCUMENTARY_STYLES.map((style) => {
          const isActive = style.id === currentStyleId;
          return (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: style.previewColor }}
              />
              <span>{style.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
