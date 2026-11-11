import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { MAX_WEEKLY_GOALS } from '@/types';

const WeeklyGoalSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 200 },
  // null = 1년 목표가 삭제되어 미연결된 상태 (PRD 4장 삭제 규칙)
  goalId: { type: Schema.Types.ObjectId, ref: 'Goal', default: null },
});

const WeeklyPlanSchema = new Schema(
  {
    // KST 월요일 YYYY-MM-DD. 문자열로 저장해 시간대 변환 문제를 없앤다.
    weekStart: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    goals: {
      type: [WeeklyGoalSchema],
      default: [],
      validate: {
        validator: (goals: unknown[]) => goals.length <= MAX_WEEKLY_GOALS,
        message: `주간 목표는 최대 ${MAX_WEEKLY_GOALS}개까지 만들 수 있습니다.`,
      },
    },
    memo: { type: String, default: '', maxlength: 5000 },
    retrospective: { type: String, default: '', maxlength: 5000 },
  },
  { timestamps: true, versionKey: false },
);

WeeklyPlanSchema.index({ 'goals._id': 1 });
WeeklyPlanSchema.index({ 'goals.goalId': 1 });

export type WeeklyPlanDoc = InferSchemaType<typeof WeeklyPlanSchema>;

export const WeeklyPlanModel: Model<WeeklyPlanDoc> =
  (mongoose.models.WeeklyPlan as Model<WeeklyPlanDoc>) ||
  mongoose.model<WeeklyPlanDoc>('WeeklyPlan', WeeklyPlanSchema);
