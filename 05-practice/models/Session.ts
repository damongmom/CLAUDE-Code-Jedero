import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const SessionSchema = new Schema(
  {
    // 원문 토큰은 쿠키에만 있고 DB에는 SHA-256 해시만 저장한다.
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // TTL 정리는 최대 60초 늦을 수 있으므로 조회 시에도 만료를 직접 비교한다.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true, versionKey: false },
);

export type SessionDoc = InferSchemaType<typeof SessionSchema>;

export const SessionModel: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) || mongoose.model<SessionDoc>('Session', SessionSchema);
