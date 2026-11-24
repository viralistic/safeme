import type { IconName } from "@/lib/categories";

type Name =
  | IconName
  | "plus"
  | "search"
  | "map"
  | "bell"
  | "user"
  | "pin"
  | "check"
  | "close"
  | "back"
  | "locate"
  | "clock"
  | "users"
  | "lock"
  | "phone"
  | "mic"
  | "play"
  | "stop"
  | "trash"
  | "moon";

const PATHS: Record<Name, string> = {
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-3.5-3.5",
  map: "M9 20 3 17V4l6 3 6-3 6 3v13l-6-3-6 3ZM9 7v13M15 4v13",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21a8 8 0 0 1 16 0",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  check: "M17 9.5 10.5 16 7 12.5",
  close: "M6 6l12 12M18 6 6 18",
  back: "M15 5l-7 7 7 7",
  locate: "M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 7",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
  pill: "M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7l7-7ZM7 10l7 7",
  volume: "M4 9v6h4l5 4V5L8 9H4ZM17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12",
  door: "M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01",
  hand: "M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-2a2 2 0 0 0-4 0",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1ZM17 8a4 4 0 0 1 0 8",
  footsteps: "M5 16v-3a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0ZM13 8V5a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0Z",
  alert: "M12 3 2 21h20L12 3ZM12 10v4M12 17.5h.01",
  bag: "M5 8h14l-1 13H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z",
  lamp: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z",
  flame: "M12 3s5 4.5 5 9.5a5 5 0 0 1-10 0C7 9 9 8 9 8s0 3 2 4c0-4 1-9 1-9Z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  play: "M7 4v16l13-8L7 4Z",
  stop: "M6 6h12v12H6z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
};

export default function Icon({ name, size = 20, stroke = 2, className }: { name: Name; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
