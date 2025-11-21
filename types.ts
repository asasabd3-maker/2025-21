export enum UserRole {
  ADMIN = 'Admin',
  AUDITOR = 'Auditor',
  GUEST = 'Guest',
}

export interface InventoryItem {
  name: string;
  quantity: number;
}

export interface Room {
  id: string;
  name: string;
  temperature: number;
  inventory: Record<string, number>; // Map of material name -> quantity
  fermentationStart: number | null; // Timestamp in ms
}

export interface LogEntry {
  id: string;
  userRole: UserRole;
  roomName: string;
  action: string;
  details: string;
  timestamp: number;
}

export interface AppState {
  rooms: Room[];
  logs: LogEntry[];
  currentUser: UserRole;
}

export const INITIAL_MATERIALS = [
  'تفاح', 'سكر', 'خميرة', 'عنب', 'شعير', 'ماء', 'خشب'
];