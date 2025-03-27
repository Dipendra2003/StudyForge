import {
  BookOpen,
  Calendar,
  CircleUser,
  Clock,
  Code,
  FileQuestion,
  FileText,
  Home,
  LogOut,
  LucideProps,
  Menu,
  MessageCircle,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Award,
  Copy,
  Book,
  User,
  Loader2,
} from "lucide-react";
import { ComponentType } from "react";

type IconsType = Record<string, ComponentType<LucideProps>>;

export const Icons: IconsType & { spinner: ComponentType<LucideProps> } = {
  // Navigation icons
  home: Home,
  messageCircle: MessageCircle,
  messageSquare: MessageSquare,
  fileText: FileText,
  bookOpen: BookOpen,
  fileQuestion: FileQuestion,
  code: Code,
  calendar: Calendar,
  settings: Settings,
  user: User,
  logout: LogOut,
  
  // UI icons
  menu: Menu,
  sun: Sun,
  moon: Moon,
  sparkles: Sparkles,
  
  // Dashboard icons
  award: Award,
  clock: Clock,
  page: FileText,
  
  // Action icons
  copy: Copy,
  book: Book,
  
  // Default user icon
  circleUser: CircleUser,
  
  // Spinner icon for loading states
  spinner: Loader2,
};