"use client";
import React, { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import axios from "axios";

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
    expectedClosingDate: z.string().min(1, "Expected closing date is required"),
  })
  .refine(
    (data) =>
      (data.leadType === "Person" && data.person?.trim()) ||
      (data.leadType === "Organisation" && data.organisation?.trim()),
    {
      message: "Name is required",
      path: ["person"],
    }
  );

/* ── Edit Modal Component ─────────────────────── */
const EditModal = ({ open, setOpen, deal }) => {
  const [showPerson, setShowPerson] = useState(true);
  const [stage, setStage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      leadType: "Person",
      person: "",
      organisation: "",
      deal: "",
      pipeline: "",
      owner: "",
      expectedClosingDate: "",
    },
  });

  useEffect(() => {
    if (deal) {
      console.log("Editing deal:", deal);
      reset({
        title: deal.title || "",
        description: deal.description || "",
        leadType: deal.leadType || "Person",
        person: deal.person || "",
        organisation: deal.organisation || "",
        deal: deal.deal?.toString() || "",
        pipeline: deal.pipeline || "",
        owner: deal.owner || "",
        expectedClosingDate: deal.expectedClosingDate?.split("T")[0] || "",
      });
      setShowPerson(deal.leadType === "Person");
      setStage(deal.stage || "");
    }
  }, [deal, reset]);

  const onSubmit = async (data) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/dealsadded/crdeals/${deal._id}`,
        {
          ...data,
          stage: stage, // include updated stage
        }
      );

      console.log("Updated successfully:", response.data);
      alert("Deal updated successfully!");
      setOpen(false); // close modal
    } catch (error) {
      console.error("Failed to update deal:", error);
      alert("Update failed.");
    }
  };

  return (
    <Dialog className="w-[1200px]" open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl sm:max-w-6xl !top-5 !translate-y-0 max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-center font-bold mb-4 text-[30px]">
              Edit Content
            </DialogTitle>
            <DialogDescription>
              <div className="grid grid-cols-[20%_80%]">
                <label className="text-black">title:</label>
                <div className="w-full ml-5">
                  <input
                    {...register("title")}
                    className="border w-full py-2 rounded-md"
                  />
                  {errors.title && (
                    <p className="text-red-500">{errors.title.message}</p>
                  )}
                </div>
                {/* </div> */}
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Description:</label>
                <div className="w-full ml-5">
                  <input
                    {...register("description")}
                    className="border w-full py-2 rounded-md"
                  />
                  {errors.description && (
                    <p className="text-red-500">{errors.description.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <div className="text-black">Lead Type</div>
                <div className="w-full ml-5 flex gap-5">
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
                      onClick={() => setShowPerson()}
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
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">
                  {showPerson ? "Person:" : "Organisation:"}
                </label>
                <div className="w-full ml-5">
                  <input
                    {...register(showPerson ? "person" : "organisation")}
                    className="border w-full py-2 rounded-md"
                  />
                  {showPerson
                    ? errors.person && (
                        <p className="text-red-500">{errors.person.message}</p>
                      )
                    : errors.organisation && (
                        <p className="text-red-500">
                          {errors.organisation.message}
                        </p>
                      )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Deal Value:</label>
                <div className="w-full ml-5">
                  <input
                    type="number"
                    {...register("deal")}
                    className="border w-full py-2 rounded-md"
                  />
                  {errors.deal && (
                    <p className="text-red-500">{errors.deal.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Pipe Line</label>
                <div className="w-full ml-5">
                  <select
                    {...register("pipeline")}
                    className="border w-full py-2 rounded-md"
                    defaultValue=""
                  >
                    <option value="LeadConversation">Lead Conversation</option>
                    <option value="Advertising">Advertising</option>
                    <option value="Development">Development</option>
                  </select>
                  {errors.deal && (
                    <p className="text-red-500">{errors.deal.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Stage</label>
                <div className="w-full ml-5">
                  <div className="flex justify-evenly">
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Prospect")}
                    >
                      Prospects
                    </button>
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Qualified")}
                    >
                      Qualified
                    </button>
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Proposal Sent-Negotiation")}
                    >
                      Proposal Sent-Negotiation
                    </button>
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Invoice Sent")}
                    >
                      Invoice Sent
                    </button>
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Won")}
                    >
                      Won
                    </button>
                    <button
                      type="button"
                      className="px-10 py-3  bg-gray-50 text-black hover:text-white hover:bg-blue-700 transition"
                      onClick={() => setStage("Lost")}
                    >
                      Lost
                    </button>
                  </div>
                  {errors.deal && (
                    <p className="text-red-500">{errors.deal.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Expecting closing date</label>
                <div className="w-full ml-5">
                  <input
                    type="date"
                    placeholder="Choose a date"
                    {...register("expectedClosingDate")}
                    className="border w-full py-2 rounded-md"
                  />
                  {errors.deal && (
                    <p className="text-red-500">{errors.deal.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[20%_80%] mt-4">
                <label className="text-black">Owner</label>
                <div className="w-full ml-5">
                  <select
                    {...register("owner")}
                    className="border w-full py-2 rounded-md text-black"
                    defaultValue=""
                  >
                    <option value="Admin">Admin</option>
                    <option value="GeneralManager">General Manager</option>
                    <option value="Dharma">Dharma</option>
                  </select>
                  {errors.deal && (
                    <p className="text-red-500">{errors.deal.message}</p>
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
  );
};

export default EditModal;
