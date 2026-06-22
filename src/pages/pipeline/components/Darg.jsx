import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

const initialData = {
  Prospect: [{ id: "1", title: "Development #1 - Developer", amount: 300 }],
  Qualified: [
    { id: "2", title: "Development #1 - Education", amount: 500 },
    { id: "3", title: "Development #1 - Developer", amount: 300 },
  ],
  Negotiation: [],
  Proposal: [{ id: "4", title: "Advertising #1 - Test", amount: 54 }],
};

export default function DragBoard() {
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("dragBoard");
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem("dragBoard", JSON.stringify(columns));
  }, [columns]);

  const onDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceList = Array.from(columns[source.droppableId]);
    const destList =
      source.droppableId === destination.droppableId
        ? sourceList
        : Array.from(columns[destination.droppableId]);

    const [movedItem] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, movedItem);

    setColumns((prev) => ({
      ...prev,
      [source.droppableId]: sourceList,
      [destination.droppableId]: destList,
    }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Pipeline Board</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto">
          {Object.entries(columns).map(([columnId, items]) => (
            <Droppable key={columnId} droppableId={columnId}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="w-64 bg-gray-100 p-4 rounded-lg shadow min-h-[300px]"
                >
                  <h2 className="font-semibold text-lg mb-4">{columnId}</h2>
                  {items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            backgroundColor: "#fff",
                            padding: 16,
                            marginBottom: 12,
                            borderRadius: 8,
                            boxShadow: snapshot.isDragging
                              ? "0 8px 20px rgba(0,0,0,0.2)"
                              : "0 1px 3px rgba(0,0,0,0.1)",
                            cursor: "grab",
                          }}
                        >
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-gray-500">
                            Rs. {item.amount}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
