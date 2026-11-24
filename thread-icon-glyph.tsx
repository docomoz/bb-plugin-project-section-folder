import { experimental_Icon as Icon } from "@get-bb/plugin-sdk/app";
import {
  Apple, BadgePercent, Banknote, BedDouble, Bike, BookOpen, Briefcase, Calculator, Camera, CarFront, Cat,
  CreditCard, Database, Dumbbell, FileCheck, Film, Flame, Footprints, Fuel, Funnel, Gamepad2, Gauge,
  Gift, GlassWater, GraduationCap, HandHeart, Handshake, Headphones, HeartPulse, House, Landmark,
  Layers3, Leaf, Lightbulb, Megaphone, Moon, Music, NotebookPen, Pill, Plane,
  Presentation, Puzzle, Radar, Receipt, Rocket, Route, Salad, Send, Server, ShoppingBag,
  ShoppingBasket, Smartphone, Sparkles, SquareParking, Stethoscope, Sun, Ticket, TrainFront,
  UsersRound, Utensils, Wallet, Weight, Workflow, Wrench, type LucideIcon,
} from "lucide-react";
import { threadIconColors, threadIconGlyph, type lucideThreadIcons, type ThreadIcon, type ThreadIconColor } from "./thread-icon-options";

const lucideGlyphs: Record<keyof typeof lucideThreadIcons, LucideIcon> = {
  Apple, BadgePercent, Banknote, BedDouble, Bike, BookOpen, Briefcase, Calculator, Camera, CarFront, Cat,
  CreditCard, Database, Dumbbell, FileCheck, Film, Flame, Footprints, Fuel, Funnel, Gamepad2, Gauge,
  Gift, GlassWater, GraduationCap, HandHeart, Handshake, Headphones, HeartPulse, House, Landmark,
  Layers3, Leaf, Lightbulb, Megaphone, Moon, Music, NotebookPen, Pill, Plane,
  Presentation, Puzzle, Radar, Receipt, Rocket, Route, Salad, Send, Server, ShoppingBag,
  ShoppingBasket, Smartphone, Sparkles, SquareParking, Stethoscope, Sun, Ticket, TrainFront,
  UsersRound, Utensils, Wallet, Weight, Workflow, Wrench,
};
const glyphs: Partial<Record<ThreadIcon, LucideIcon>> = lucideGlyphs;

export function ThreadIconGlyph({ icon, color = null }: { icon: ThreadIcon; color?: ThreadIconColor | null }) {
  const Glyph = glyphs[icon];
  const style = color ? { color: threadIconColors[color].css } : undefined;
  return Glyph
    ? <Glyph size={16} strokeWidth={1.7} style={style} aria-hidden="true" />
    : <Icon name={threadIconGlyph(icon)} style={style} aria-hidden />;
}
