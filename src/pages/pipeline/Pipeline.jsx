"use client";
import React, { useEffect } from "react";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";
import { useState } from "react";
import { Home, Briefcase, ChevronRight, Users, X } from "react-feather";
import { Checkbox } from "../../components/ui/checkbox";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRangePicker } from "react-date-range";
import { format } from "date-fns";
import MultiRangeSlider from "multi-range-slider-react";
import { User, ChevronDown, ChevronLeft } from "lucide-react";
// zad
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import { Copy } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import moment from "moment";
import GM from "../../../public/images/general-manager-536477.webp";
import AD from "../../../public/images/global-admin-icon-color-outline-vector.jpg";
import DH from "../../../public/images/OIP.jpg";
import EditModal from "../pipeline/components/EditModal";
import DeleteModel from "../pipeline/components/DeleteModel";

const pipeline = () => {
  const [showHRMSystem, setShowHRMSystem] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [active, setIsactive] = useState(null);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [minValue, set_minValue] = useState(25);
  const [maxValue, set_maxValue] = useState(75);
  const [isOpen, SetIsOpen] = useState(true);
  const [cardOPen, setCardOpen] = useState(true);
  const [showPerson, setShowPerson] = useState(true);

  const handleInput = (e) => {
    set_minValue(e.minValue);
    set_maxValue(e.maxValue);
  };
  const handleClick = () => {
    console.log("click", isOpen);
    console.log(cardOPen, "click2");

    SetIsOpen(!isOpen);
    setCardOpen(!cardOPen);
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lead, setLead] = useState("");
  const [person, setPerson] = useState("");
  const [deal, setDeal] = useState("");

  // zad
  const schema = z
    .object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      leadType: z.enum(["Person", "Organisation"], {
        required_error: "Lead Type is required",
      }),
      person: z.string().optional(),
      organisation: z.string().optional(),
      deal: z.string().min(1, "Deal Value is required"),
      pipeline: z.string().min(1, "Pipeline is required"),
      owner: z.string().min(1, "Owner is required"),
      expectedClosingDate: z
        .string()
        .min(1, "Expected closing date is required"),
    })
    .refine(
      (data) =>
        (data.leadType === "Person" && data.person?.trim()) ||
        (data.leadType === "Organisation" && data.organisation?.trim()),
      {
        message: "Name is required for the selected lead type",
        path: ["leadType"],
      }
    );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const [stage, setStage] = useState("");
  const [selectedDeal, setSelectedDeal] = useState(null);

  const onSubmit = async (data) => {
    console.log("Form Data:", data);
    const isPerson = data.leadType === "Person";
    try {
      const response = await axios.post(
        `${BASE_URL}/api/dealsAdded/crdeals`,
        {
          title: data.title,
          description: data.description,
          // person: data.person,
          // organisation: data.organisation,
          deal: parseFloat(data.deal),
          pipeline: data.pipeline,
          stage: stage,
          expectedClosingDate: data.expectedClosingDate,
          owner: data.owner,
          leadType: data.leadType,
          // [data.leadType === showPerson ? "person" : "organisation"]: showPerson
          //   ? data.person
          //   : data.organisation,
          ...(isPerson
            ? { person: data.person }
            : { organisation: data.organisation }),
        }
      );

      console.log("Saved successfully:", response.data);
      alert("Deal saved successfully!");
      reset();
    } catch (error) {
      console.error(
        "Failed to save deal:",
        error.response?.data || error.message
      );
      alert("Failed to save deal");
    }
  };

  // const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState({});
  const toggleCollapse = (stageName) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

  // for drap and drag
  const initialData = {
    scheduled: [
      {
        id: "card-1",
        name: "Dharma",
        role: "Developer",
        amount: "Rs. 100.000",
      },
      { id: "card-2", name: "Arun", role: "Manager", amount: "Rs. 50.000" },
    ],
    visited: [],
  };
  const [columns, setColumns] = useState(initialData);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Find the dragged deal
    const draggedDeal = deals.find(
      (deal) => deal._id.toString() === draggableId
    );
    if (!draggedDeal) return;

    // Create updated deal with new stage
    const updatedDeal = { ...draggedDeal, stage: destination.droppableId };

    // Remove original deal from the list
    const filteredDeals = deals.filter(
      (deal) => deal._id.toString() !== draggableId
    );

    // Insert updated deal at the correct position
    const updatedDealsInTargetStage = filteredDeals.filter(
      (deal) => deal.stage === destination.droppableId
    );
    updatedDealsInTargetStage.splice(destination.index, 0, updatedDeal);

    // Reconstruct full list of deals
    const finalDeals = [
      ...filteredDeals.filter((deal) => deal.stage !== destination.droppableId),
      ...updatedDealsInTargetStage,
    ];

    setDeals(finalDeals);

    // Update backend
    try {
      await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${draggableId}`,
        {
          stage: destination.droppableId,
        }
      );
      console.log("Stage updated successfully");
    } catch (err) {
      console.error("Failed to update stage", err);
    }
  };

  const getDealsByStage = (stage) =>
    deals.filter((deal) => deal.stage === stage);

  const [deals, setDeals] = useState([]);
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/dealsadded/crdeals`
        );
        console.log("Fetched deals:", res.data);
        setDeals(res.data || []);
        console.log("Fetched deals:", res.data);
      } catch (error) {
        console.error("Error fetching deals:", error);
      }
    };

    fetchDeals();
  }, []);

  const stages = [
    "Prospect",
    "Qualified",
    "Proposal Sent-Negotiation",
    "Invoice Sent",
    "Won",
    "Lost",
  ];

/* ── Handle Delete Function ─────────────────────── */
  const handleDelete = (_id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this deal?"
    );
    if (!confirmDelete) return;
    console.log("_id", _id);
    axios
      .delete(`${BASE_URL}/api/dealsadded/crdeals/${_id}`)
      .then((res) => {
        console.log("Deleted:", res.data);
      })
      .catch((error) => {
        console.error("Deleted error:", error);
      });
  };

/* ── Edit Deal Component ─────────────────────── */
  const handleEdit = async (_id, stage) => {
    try {
      const res = await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${_id}`,
        {
          stage: stage, //  must be a valid string like "Prospect", "Negotiation"
        }
      );
      console.log("Edited successfully:", res.data);
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

/* ── Move Deal to Won Component ─────────────────────── */
  const handleMoveToWon = async (deal) => {
    const updatedDeal = { ...deal, stage: "Won" };

    // Update UI locally
    setDeals((prevDeals) =>
      prevDeals.map((d) => (d._id === deal._id ? updatedDeal : d))
    );

    // Update backend
    try {
      const res = await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${deal._id}`,
        {
          stage: "Won",
        }
      );
      console.log("Stage updated to Won:", res.data);
    } catch (err) {
      console.error("Error updating to Won:", err);
    }
  };
  const handleMoveToLost = async (deal) => {
    const updatedDeal = { ...deal, stage: "Lost" };

    // Update UI locally
    setDeals((prevDeals) =>
      prevDeals.map((d) => (d._id === deal._id ? updatedDeal : d))
    );

    // Update backend
    try {
      const res = await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${deal._id}`,
        {
          stage: "Lost",
        }
      );
      console.log("Stage updated to Lost:", res.data);
    } catch (err) {
      console.error("Error updating to Lost:", err);
    }
  };

  const [markedDeals, setMarkedDeals] = useState([]);

  const isMarked = (id) => markedDeals.includes(id);

/* ── Handle Mark Function ─────────────────────── */
  const handleMark = async (_id) => {
    const isCurrentlyMarked = isMarked(_id);

    // Optimistically update frontend state
    setMarkedDeals((prev) =>
      isCurrentlyMarked ? prev.filter((id) => id !== _id) : [...prev, _id]
    );

    try {
      const res = await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${_id}`,
        { marked: !isCurrentlyMarked } // send new marked value
      );
      console.log("Marked updated:", res.data);
    } catch (err) {
      console.error("Error updating marked status:", err);
    }
  };

  useEffect(() => {
    const fetchDeals = async () => {
      const res = await axios.get(
        `${BASE_URL}/api/dealsadded/crdeals`
      );
      setDeals(res.data);

      // Marked deals based on backend field
      const marked = res.data
        .filter((deal) => deal.marked)
        .map((deal) => deal._id);
      setMarkedDeals(marked);
    };

    fetchDeals();
  }, []);

  return (
    <div className="bg-gray-100 flex flex-col ">
      {/* <DeleteModel/> */}
      <section className="">
        <div className="md:flex justify-between items-center mb-4 ">
          <h2 className="text-lg font-semibold">Lead Conversion</h2>

          {/* Buttons */}
          <div className="flex gap-2 mt-4 md:md-0">
            <div className="bg-green-500 text-white px-3 rounded-[2px]">
              <DropdownMenu
                className="border-hidden"
                onOpenChange={() => setShowHRMSystem(!showHRMSystem)}
              >
                <DropdownMenuTrigger className="border-none outline-none focus:ring-0 flex items-center mt-1 space-x-2 font-bold">
                  Actions
                  <ChevronDown
                    size={15}
                    className={` transition-transform duration-300 ml-5 ${
                      showHRMSystem ? "rotate-180" : ""
                    }`}
                  />
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuItem>Subscription</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <button
              className="bg-blue-500 text-white px-3 rounded-[2px]"
              // onClick={() => setIsModalOpen(true)}
            >
              <Dialog className="">
                <DialogTrigger asChild>
                  <Button variant="bg-blue-500 text-white px-4 py-2 rounded-md">
                    All deals
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl sm:max-w-6xl top-5 translate-y-0 max-h-screen overflow-y-auto overflow-x-auto">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader className="max-w-screen">
                      <DialogTitle>Add Deals</DialogTitle>
                      <DialogDescription>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen items-center">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Title :
                          </label>
                          <div className=" ml-5">
                            <input
                              {...register("title")}
                              className="border w-full py-2 rounded-md"
                            />
                            {errors.title && (
                              <p className="text-red-500">
                                {errors.title.message}
                              </p>
                            )}
                          </div>
                          {/* </div> */}
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Description :
                          </label>
                          <div className=" ml-5">
                            <input
                              {...register("description")}
                              className="border w-full py-2 rounded-md"
                            />
                            {errors.description && (
                              <p className="text-red-500">
                                {errors.description.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <div className="block text-black  text-left mb-2 md-md-0">
                            Lead Type :
                          </div>
                          <div className="max-w-screen ml-5 flex gap-5">
                            <div class="flex items-center mb-4">
                              <input
                                {...register("leadType")}
                                id="lead-person"
                                type="radio"
                                value="Person"
                                className="w-4 h-4 text-blue-600"
                                onClick={() => setShowPerson(true)}
                              />
                              <label
                                htmlFor="lead-person"
                                className="ms-2 text-sm font-medium text-gray-900"
                              >
                                Person
                              </label>
                            </div>
                            <div class="flex items-center mb-4">
                              <input
                                {...register("leadType")}
                                id="lead-org"
                                type="radio"
                                value="Organisation"
                                className="w-4 h-4 text-blue-600"
                                onClick={() => setShowPerson(false)}
                              />
                              <label
                                htmlFor="lead-org"
                                className="ms-2 text-sm font-medium text-gray-900"
                              >
                                Organisation
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            {showPerson ? "Person :" : "Organisation :"}
                          </label>
                          <div className=" ml-5">
                            <input
                              {...register(
                                showPerson ? "person" : "organisation"
                              )}
                              className="border w-full py-2 rounded-md"
                            />
                            {showPerson
                              ? errors.person && (
                                  <p className="text-red-500">
                                    {errors.person.message}
                                  </p>
                                )
                              : errors.organisation && (
                                  <p className="text-red-500">
                                    {errors.organisation.message}
                                  </p>
                                )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Deal Value :
                          </label>
                          <div className=" ml-5">
                            <input
                              type="number"
                              {...register("deal")}
                              className="border w-full py-2 rounded-md"
                            />
                            {errors.deal && (
                              <p className="text-red-500">
                                {errors.deal.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Pipe Line :
                          </label>
                          <div className=" ml-5">
                            <select
                              {...register("pipeline")}
                              className="border w-full py-2 rounded-md"
                              defaultValue=""
                            >
                              <option value="LeadConversation">
                                Lead Conversation
                              </option>
                              <option value="Advertising">Advertising</option>
                              <option value="Development">Development</option>
                            </select>
                            {errors.deal && (
                              <p className="text-red-500">
                                {errors.deal.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%]  mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Stage :
                          </label>
                          <div className=" ml-5">
                            <div className="flex justify-evenly ">
                              <button
                                type="button"
                                className={`px-10 py-3 transition 
                                 ${
                                   stage === "Prospect"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Prospect")}
                              >
                                Prospects
                              </button>
                              <button
                                type="button"
                                className={`px-10 py-3 transition 
                                 ${
                                   stage === "Qualified"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Qualified")}
                              >
                                Qualified
                              </button>
                              <button
                                type="button"
                                className={`px-10 py-3 transition 
                                 ${
                                   stage === "Proposal Sent-Negotiation"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Proposal Sent-Negotiation")}
                              >
                                Proposal Sent-Negotiation
                              </button>
                              <button
                                type="button"
                                className={`px-10 py-3 transition 
                                 ${
                                   stage === "Invoice Sent"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Invoice Sent")}
                              >
                                Invoice Sent
                              </button>
                              <button
                                type="button"
                                className={`px-10 py-3 transition 
                                 ${
                                   stage === "Won"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Won")}
                              >
                                Won
                              </button>
                              <button
                                type="button"
                                 className={`px-10 py-3 transition 
                                 ${
                                   stage === "Lost"
                                     ? "bg-blue-700 text-white"
                                     : "bg-gray-50 text-black hover:text-white hover:bg-blue-700"
                                 }`}
                                onClick={() => setStage("Lost")}
                              >
                                Lost
                              </button>
                            </div>
                            {errors.deal && (
                              <p className="text-red-500">
                                {errors.deal.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Expecting closing date
                          </label>
                          <div className=" ml-5">
                            <input
                              type="date"
                              placeholder="Choose a date"
                              {...register("expectedClosingDate")}
                              className="border w-full py-2 rounded-md"
                            />
                            {errors.deal && (
                              <p className="text-red-500">
                                {errors.deal.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="md:grid grid-cols-[20%_80%] max-w-screen mt-4">
                          <label className="block text-black  text-left mb-2 md-md-0">
                            Owner :
                          </label>
                          <div className=" ml-5">
                            <select
                              {...register("owner")}
                              className="border w-full py-2 rounded-md text-black"
                              defaultValue=""
                            >
                              <option value="Admin">Admin</option>
                              <option value="GeneralManager">
                                General Manager
                              </option>
                              <option value="Dharma">Dharma</option>
                            </select>
                            {errors.deal && (
                              <p className="text-red-500">
                                {errors.deal.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <CKEditor
                          editor={ClassicEditor}
                          data="<p>Hello from CKEditor 5 in React!</p>"
                          onReady={(editor) => {
                            console.log("Editor is ready!", editor);
                          }}
                          onChange={(event, editor) => {
                            const data = editor.getData();
                            console.log({ data });
                          }}
                          onBlur={(event, editor) => {
                            console.log("Blur.", editor);
                          }}
                          onFocus={(event, editor) => {
                            console.log("Focus.", editor);
                          }}
                        />
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="sm:justify-end">
                      <DialogClose asChild>
                        <Button
                          type="button"
                          onClick={() => reset()}
                          className="bg-red-700 text-white"
                        >
                          Cancel
                        </Button>
                      </DialogClose>

                      <Button type="submit" className="bg-green-700 text-white">
                        Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </button>
          </div>
        </div>
      </section>

      <section className="">
        <div className=" mb-4 ">
          <Tabs
            defaultValue="account "
            className="flex flex-wrap justify-between"
          >
            
            <TabsList>
              <div className="flex items-center text-gray-400 font-b text-[15px]">
                <span className="mr-3 text-black font-Extrabold-300">
                  Total Deals :
                </span>{" "}
                {deals.length} Deals
              </div>
            </TabsList>
            <TabsList>
              <div className="flex items-center order-first md:order-last ">
                <form class="max-w-[200px] mx-auto">
                  <label
                    for="default-search"
                    class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white"
                  >
                    Search
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <svg
                        class="w-4 h-4 text-gray-500 dark:text-gray-400"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                        />
                      </svg>
                    </div>
                    <input
                      type="search"
                      id="default-search"
                      class="block w-3/4 h-6 p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-full bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      placeholder="Search"
                      required
                    />
                  </div>
                </form>
              </div>
            </TabsList>
          </Tabs>
        </div>
      </section>

      <div className="max-w-screen overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <section className="tableSection mt-5 overflow-hidden">
            <div className="relative w-full">
              <div className="overflow-x-auto">
                <div className="flex gap-4 w-[1024px] px-2">
                  {stages.map((stageName) => {
                    const stageDeals = deals.filter(
                      (deal) => deal.stage === stageName
                    );

                    const totalAmount = stageDeals.reduce((sum, deal) => {
                      return sum + (Number(deal.deal) || 0); // handle NaN or missing values
                    }, 0);

                    return (
                      <Droppable
                        droppableId={stageName}
                        key={stageName}
                        type="CARD"
                      >
                        {(provided) => {
                          const isCollapsed = collapsedStages[stageName];
                          return (
                            <div
                              className={`"w-[300px]"
                            }`}
                            >
                              <div className="bg-gray-300 p-3  min-w-[150px] mb-2">
                                <div className=" text-gray-500 font-bold">
                                  {!isCollapsed ? (
                                    <div className="flex items-center justify-between">
                                      <p className="">{stageName}</p>
                                      <button
                                      // onClick={() => toggleCollapse(stageName)}
                                      >
                                        <ChevronLeft
                                          className={`transition-transform duration-300 ${
                                            isCollapsed ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <p className="transform -rotate-90 origin-center text-xs whitespace-nowrap mb-4">
                                        {stageName}
                                      </p>

                                      <button
                                      // onClick={() => toggleCollapse(stageName)}
                                      >
                                        <ChevronLeft
                                          className={`transition-transform duration-300 ${
                                            isCollapsed ? "rotate-180" : ""
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* <div>
                              {!isCollapsed ? (
                                <div className="flex items-center justify-between">
                                  <p>{stageName}</p>
                                  <button
                                    onClick={() => toggleCollapse(stageName)}
                                  >
                                    <ChevronLeft className="transition-transform duration-300" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-[150px]">
                                  <p className="transform -rotate-90 text-xs whitespace-nowrap">
                                    {stageName}
                                  </p>
                                  <button
                                    onClick={() => toggleCollapse(stageName)}
                                    className="mt-2"
                                  >
                                    <ChevronLeft className="rotate-180" />
                                  </button>
                                </div>
                              )}
                            </div> */}

                                {!isCollapsed && (
                                  <div className="flex gap-3 mt-2 text-gray-500 text-[13px]">
                                    <div className="font-bold">
                                      Rs. {totalAmount.toLocaleString("en-IN")}
                                    </div>
                                    <div className="font-bold">
                                      <span className="font-extrabold">. </span>
                                      {stageDeals.length} Deals
                                    </div>
                                    <div className="font-bold">
                                      <span className="font-extrabold">. </span>
                                      100%
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div
                                className={`transition-all duration-300 ease-in-out bg-gray-200 rounded shadow-md
                              ${
                                isCollapsed
                                  ? "w-[50px] overflow-hidden"
                                  : "w-[300px]"
                              }
                                `}
                              >
                                {!isCollapsed && (
                                  <div
                                    className="overflow-auto h-[490px] bg-gray-200 p-1"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {stageDeals.map((deal, index) => (
                                      <Draggable
                                        key={deal._id}
                                        draggableId={deal._id.toString()}
                                        index={index}
                                        type="CARD"
                                      >
                                        {(provided, snapshot) => (
                                          <Card
                                            key={deal._id}
                                            // className="mb-1 rounded-none"
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={`mb-3 rounded bg-white shadow ${
                                              snapshot.isDragging
                                                ? "shadow-lg"
                                                : "shadow-sm"
                                            }
                                         ${
                                           isMarked(deal._id)
                                             ? "border-4 border-blue-500"
                                             : ""
                                         }`}
                                          >
                                            <CardHeader>
                                              <CardTitle>
                                                <div className="flex justify-between">
                                                  <div className="flex gap-2">
                                                    <button className=" rounded-full px-2 text-white bg-[green] text-[12px]">
                                                      {deal.owner
                                                        ?.slice(0, 2)
                                                        .toUpperCase() || "NA"}
                                                    </button>
                                                    <div className="font-medium">
                                                      <div className="flex items-center text-gray-500">
                                                        {deal.pipeline}{" "}
                                                        <span className="text-black ml-1">
                                                          {/* #{deal._id?.slice(-4)} */}
                                                          #{index + 1}
                                                        </span>{" "}
                                                      </div>
                                                      <div>{deal.title}</div>
                                                    </div>
                                                  </div>

                                                  <div>
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger className="text-xl  outline-none hover:text-[blue]">
                                                        {" "}
                                                        ⋮{" "}
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent>
                                                        {/* <DropdownMenuItem>
                                                      Add activity
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                      Manage tag
                                                    </DropdownMenuItem> */}
                                                        <DropdownMenuItem
                                                          onClick={() =>
                                                            handleMoveToWon(
                                                              deal
                                                            )
                                                          }
                                                        >
                                                          Won the deal
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onClick={() =>
                                                            handleMoveToLost(
                                                              deal
                                                            )
                                                          }
                                                        >
                                                          make it lost
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onClick={() =>
                                                            handleMark(deal._id)
                                                          }
                                                        >
                                                          {isMarked(deal._id)
                                                            ? "UnMark"
                                                            : "Mark"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                          onClick={() => {
                                                            setIsModalOpen(
                                                              true
                                                            );
                                                            setSelectedDeal(
                                                              deal
                                                            );
                                                          }}
                                                        >
                                                          Edit
                                                        </DropdownMenuItem>

                                                        {/* <DropdownMenuItem
                                                          onClick={() =>
                                                            handleDelete(
                                                              deal._id
                                                            )
                                                          }
                                                        >
                                                          Delete
                                                        </DropdownMenuItem> */}

                                                          <DropdownMenuItem
                                                          onClick={() => {
                                                            setDeleteOpen(
                                                              true
                                                            );
                                                            setSelectedDeal(
                                                              deal
                                                            );
                                                          }}
                                                         
                                                        >
                                                         delete
                                                        </DropdownMenuItem>

                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    <EditModal
                                                      open={isModalOpen}
                                                      setOpen={setIsModalOpen}
                                                      deal={selectedDeal}
                                                    />
                                                    <DeleteModel
                                                    open={isDeleteOpen}
                                                      setOpen={setDeleteOpen}
                                                      deal={selectedDeal}
                                                      />
                                                  </div>
                                                </div>
                                              </CardTitle>
                                              {/* <CardDescription>Card Description</CardDescription> */}
                                            </CardHeader>
                                            <CardContent>
                                              <p className="flex items-center">
                                                <User className="text-gray-500 h-5" />
                                                <div>
                                                  {deal.leadType === "Person"
                                                    ? deal.person
                                                    : deal.organisation}
                                                </div>
                                              </p>
                                            </CardContent>
                                            <CardContent>
                                              <div className="flex justify-between">
                                                <div className="flex gap-2 items-center">
                                                  {deal.owner ===
                                                  "GeneralManager" ? (
                                                    <img
                                                      className="rounded-full w-[25px]"
                                                      src={GM}
                                                    />
                                                  ) : deal.owner === "Admin" ? (
                                                    <img
                                                      className="rounded-full w-[25px]"
                                                      src={AD}
                                                    />
                                                  ) : (
                                                    <img
                                                      className="rounded-full w-[25px]"
                                                      src={DH}
                                                    />
                                                  )}

                                                  <span className="ml-2 text-[14px]">
                                                    {deal.owner}
                                                  </span>
                                                </div>
                                                <div>
                                                  <p className="text-[14px]">
                                                    <span className="font-bold">
                                                      $
                                                    </span>{" "}
                                                    {deal.deal?.toLocaleString(
                                                      "en-IN"
                                                    )}
                                                  </p>
                                                </div>
                                              </div>
                                            </CardContent>
                                            <hr className="h-0" />
                                            <div className="h-0 items-center flex justify-end mr-2">
                                              <p className="font-bold text-[12px]">
                                                Created At :{" "}
                                                <span className="font-normal ml-1">
                                                  {" "}
                                                  {moment(
                                                    deal.createdAt
                                                  ).fromNow()}
                                                </span>
                                              </p>
                                            </div>
                                          </Card>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      </Droppable>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </DragDropContext>
      </div>
    </div>
  );
};

export default pipeline;
