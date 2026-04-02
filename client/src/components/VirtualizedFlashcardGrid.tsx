import { useRef, useEffect, useState } from "react";
import { Grid } from "react-window";
import { FlashcardCard } from "./FlashcardCard";

interface Flashcard {
  id: number;
  userId: number;
  documentId?: number | null;
  question: string;
  answer: string;
  questionImage?: string | null;
  answerImage?: string | null;
  category: string;
  difficulty: string;
  nextReviewDate?: string | null;
  easeFactor?: number;
  createdAt: string;
}

interface VirtualizedFlashcardGridProps {
  flashcards: Flashcard[];
  onEdit: (card: Flashcard) => void;
  onAddToDeck: (cardId: number) => void;
  onDelete: (cardId: number) => void;
}

export function VirtualizedFlashcardGrid({
  flashcards,
  onEdit,
  onAddToDeck,
  onDelete,
}: VirtualizedFlashcardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Calculate grid dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(600, window.innerHeight - 300);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Calculate column count based on screen width
  const getColumnCount = () => {
    if (dimensions.width >= 1024) return 3; // lg
    if (dimensions.width >= 768) return 2; // md
    return 1; // sm
  };

  const columnCount = getColumnCount();
  const columnWidth = Math.floor(dimensions.width / columnCount);
  const rowHeight = 320; // Reduced height for better spacing
  const rowCount = Math.ceil(flashcards.length / columnCount);

  // Only use virtualization if there are many cards
  const shouldVirtualize = flashcards.length > 12;

  if (!shouldVirtualize) {
    // For small lists, render normally without virtualization
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {flashcards.map((card) => (
          <FlashcardCard
            key={card.id}
            card={card}
            onEdit={onEdit}
            onAddToDeck={onAddToDeck}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  // Cell renderer for virtualized grid
  const CellComponent = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= flashcards.length) return <div style={style} />;

    const card = flashcards[index];
    return (
      <div style={{ ...style, padding: "10px" }}>
        <FlashcardCard
          card={card}
          onEdit={onEdit}
          onAddToDeck={onAddToDeck}
          onDelete={onDelete}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full">
      {dimensions.width > 0 && (
        <Grid
          cellComponent={CellComponent}
          cellProps={{}}
          columnCount={columnCount}
          columnWidth={columnWidth}
          defaultHeight={dimensions.height}
          rowCount={rowCount}
          rowHeight={rowHeight}
          defaultWidth={dimensions.width}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        />
      )}
    </div>
  );
}
