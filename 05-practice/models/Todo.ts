import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { PRIORITIES, TODO_STATUSES } from '@/types';

const TodoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: TODO_STATUSES, default: 'todo' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    dueDate: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayOfWeek: { type: Number, default: null, min: 0, max: 6 },
    order: { type: String, required: true },
    weeklyPlanId: { type: Schema.Types.ObjectId, ref: 'WeeklyPlan', default: null },
    // null = 주간 목표가 삭제되어 미연결된 상태 (PRD 4장 삭제 규칙)
    weeklyGoalId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, versionKey: false },
);

TodoSchema.index({ weeklyPlanId: 1, status: 1, order: 1 });
TodoSchema.index({ status: 1, order: 1 });
TodoSchema.index({ weeklyGoalId: 1 });

export type TodoDoc = InferSchemaType<typeof TodoSchema>;

export const TodoModel: Model<TodoDoc> =
  (mongoose.models.Todo as Model<TodoDoc>) || mongoose.model<TodoDoc>('Todo', TodoSchema);
