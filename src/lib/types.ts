export type Profile = {
  id: number;
  name: string;
  color: string;
  category: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimeEntry = {
  id: number;
  profileId: number;
  profileName: string;
  profileColor: string;
  startAt: string;
  endAt: string;
  durationSeconds: number;
  note: string;
  tags: string[];
  source: 'manual' | 'timer';
  createdAt: string;
  updatedAt: string;
};

export type ActiveTimer = {
  id: number;
  profileId: number;
  profileName: string;
  profileColor: string;
  status: 'running' | 'paused';
  startedAt: string;
  pausedAt: string | null;
  accumulatedSeconds: number;
  tags: string[];
  elapsedSeconds: number;
};

export type Settings = {
  reminderTime: string;
  notificationsEnabled: boolean;
  allowOverlaps: boolean;
  timezone: string;
  firstRunComplete: boolean;
};

export type DashboardStats = {
  todaySeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  byProfile: Array<{
    profileId: number;
    profileName: string;
    profileColor: string;
    seconds: number;
  }>;
  calendar: Array<{
    date: string;
    seconds: number;
  }>;
  hasTodayEntry: boolean;
};
