import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const GoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, versionKey: false },
);

export type GoalDoc = InferSchemaType<typeof GoalSchema>;

export const GoalModel: Model<GoalDoc> =
  (mongoose.models.Goal as Model<GoalDoc>) || mongoose.model<GoalDoc>('Goal', GoalSchema);
