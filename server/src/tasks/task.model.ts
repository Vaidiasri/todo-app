import { Schema, model, type InferSchemaType } from "mongoose";

const taskSchema = new Schema(
  {
    clientId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high", null], default: null },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
  },
  { timestamps: true },
);

taskSchema.index({ clientId: 1, startAt: 1 });

export type TaskDoc = InferSchemaType<typeof taskSchema> & { _id: unknown };
export const Task = model("Task", taskSchema);
