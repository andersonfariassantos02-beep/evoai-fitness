export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  neck: number;
  chest: number;
  waist: number;
  abdomen: number;
  hips: number;
  rightArm: number;
  leftArm: number;
  rightForearm: number;
  leftForearm: number;
  rightThigh: number;
  leftThigh: number;
  rightCalf: number;
  leftCalf: number;
}

export interface TrainingSession {
  id: string;
  userId: string;
  workoutId: string;
  date: string;
  durationMinutes: number;
  perceivedEffort: number;
  completed: boolean;
  observations: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  objective: string;
  dayOfWeek: string;
  exercises: string[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  height: number;
  weight: number;
  sex: string;
  goal: string;
  photoUrl: string;
  createdAt: string;
}

export interface NutritionPlan {
  id: string;
  userId: string;
  objective: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: string[];
  createdAt: string;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  date: string;
  weight: number;
  observation: string;
  createdAt: string;
}

export interface GoalHistory {
  id: string;
  userId: string;
  oldGoal: string;
  newGoal: string;
  reason: string;
  createdAt: string;
}

export interface HydrationRecord {
  id: string;
  userId: string;
  date: string;
  liters: number;
  targetLiters: number;
}

export interface SleepRecord {
  id: string;
  userId: string;
  date: string;
  hours: number;
  quality: number;
}

export interface DailyCheckin {
  id: string;
  userId: string;
  date: string;
  weight: number;
  water: number;
  sleepHours: number;
  calories: number;
  workoutDone: boolean;
  notes: string;
}

export interface PhysicalAssessment {
  userId: string;
  date: string;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  neck: number;
  chest: number;
  waist: number;
  abdomen: number;
  hips: number;
  leftArm: number;
  rightArm: number;
  leftThigh: number;
  rightThigh: number;
  leftCalf: number;
  rightCalf: number;
  notes: string;
}

export interface AiRecommendation {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high";
  createdAt: string;
  read: boolean;
}
