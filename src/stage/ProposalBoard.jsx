import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { FaCalendarAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";

const ProposalBoard = () => {
  const [startDate, setStartDate] = useState(null);
  const [groupedStages, setGroupedStages] = useState({});

  const fetchProposals = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/auth/proposal/getall`
      );
      const proposals = res.data;

      // Group by status
      const grouped = proposals.reduce((acc, proposal) => {
        const key = proposal.status || "Uncategorized";
        if (!acc[key]) acc[key] = [];
        acc[key].push(proposal);
        return acc;
      }, {});

      setGroupedStages(grouped);
    } catch (err) {
      console.error("Error fetching proposals:", err);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleOnDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    const sourceItems = Array.from(groupedStages[sourceCol]);
    const [movedItem] = sourceItems.splice(source.index, 1);

    if (sourceCol === destCol) {
      // Move within same column
      sourceItems.splice(destination.index, 0, movedItem);
      setGroupedStages((prev) => ({
        ...prev,
        [sourceCol]: sourceItems,
      }));
    } else {
      // Move to another column
      const destItems = Array.from(groupedStages[destCol] || []);
      movedItem.status = destCol;
      destItems.splice(destination.index, 0, movedItem);

      setGroupedStages((prev) => ({
        ...prev,
        [sourceCol]: sourceItems,
        [destCol]: destItems,
      }));

      // Optionally save updated proposal status to backend
      axios.put(
        `${BASE_URL}/api/auth/proposal/proposal/updatestatus/${movedItem._id}`,
        {
          status: destCol,
        }
      );
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Proposal Board</h1>
    <div className="flex justify-between items-center gap-2">
    <Link to="/proposal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="#1f1f1f"
            className=" h-7 bg-white w-7 text-black"
          >
            <path d="M219-144q-29 0-52-23t-23-52v-525q0-29.7 21.5-50.85Q187-816 216-816h528q29.7 0 50.85 21.15Q816-773.7 816-744v528q0 29-21.15 50.5T744-144H219Zm-3-72h228v-528H216v528Zm300 0h228v-264H516v264Zm0-336h228v-192H516v192Z" />
          </svg>
        </Link>
        <Link to="/stage">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="#1f1f1f"
            className=" h-7 bg-gray-300 w-7 text-black"

          >
            <path d="M600-144q-29.7 0-50.85-21.15Q528-186.3 528-216v-528q0-29 21.15-50.5T600-816h144q29 0 50.5 21.5T816-744v528q0 29.7-21.5 50.85Q773-144 744-144H600Zm-384 0q-29.7 0-50.85-21.15Q144-186.3 144-216v-528q0-29 21.15-50.5T216-816h144q29 0 50.5 21.5T432-744v528q0 29.7-21.5 50.85Q389-144 360-144H216Zm0-600v528h144v-528H216Z" />
          </svg>
        </Link>
        <Link to="/proposal/sendproposal">
          <button className="bg-[#4466f2] p-2 px-4 text-white rounded-sm">
            New Proposal
          </button>
        </Link>
    </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4 mt-6">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="yyyy/MM/dd"
              className="hidden"
              isOpen={false}
            />
            <button
              className="px-3 py-2 text-gray-400 bg-white shadow rounded"
              onClick={() => setStartDate(null)}
            >
              <FaCalendarAlt className="text-xl" />
            </button>
          </div>
          <button className="px-6 py-2 bg-white shadow rounded-3xl text-gray-500">
            Owner
          </button>
          <button className="px-6 py-2 bg-white shadow rounded-3xl text-gray-500">
            Status
          </button>
          <button className="px-6 py-2 bg-white shadow rounded-3xl text-gray-500">
            Has Deal
          </button>
          <button className="px-6 py-2 bg-white shadow rounded-3xl text-gray-500">
            Tags
          </button>
        </div>

        <input
          type="text"
          placeholder="Search"
          className="p-2 border rounded-3xl w-[250px] bg-white"
        />
      </div>

      {/* Columns */}
      <div className="mt-8">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3  lg:grid-cols-5 gap-6">
            {Object.entries(groupedStages).map(([status, proposals]) => (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-white border border-gray-200 rounded-2xl w-[250px] shadow p-4 flex flex-col max-h-[600px]"
                  >
                    {/* Header */}
                    <div className="flex gap-5 justify-between items-center mb-4 border-b pb-2">
                      <h2 className="text-lg font-semibold text-gray-800">
                        {status}
                      </h2>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {proposals.length}
                      </span>
                    </div>

                    {/* Draggable items list */}
                    <div className="space-y-4 overflow-y-auto">
                      {proposals.map((proposal, index) => (
                        <Draggable
                          key={proposal._id}
                          draggableId={proposal._id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-gray-50 hover:bg-gray-100 p-4 rounded-xl border border-gray-200 shadow-sm transition-all"
                            >
                              <h3 className="font-semibold text-gray-800">
                                {proposal.title}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {proposal.dealTitle}
                              </p>
                              <p className="text-sm text-gray-400">
                                {proposal.email}
                              </p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default ProposalBoard;

