import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    plan: 'free' | 'pro' | 'enterprise';
    chatbotLimit: number;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false,
        },
        avatar: { type: String },
        plan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free',
        },
        chatbotLimit: {
            type: Number,
            default: 3, // free tier limit
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_doc, ret) => {
                delete ret.password;
                return ret;
            },
        },
    },
);

// Hash password before save
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password!, salt);
    next();
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (
    candidatePassword: string,
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};


export const User = mongoose.model<IUser>('User', UserSchema);
