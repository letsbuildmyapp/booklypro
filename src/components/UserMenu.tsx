import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/utils";

interface ExtraItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface Props {
  /** Optional small caption shown above the user name in the menu header (e.g. business name + tier). */
  contextLabel?: React.ReactNode;
  /** Extra items rendered above Sign out (e.g. "View public page", "Switch to admin view"). */
  extra?: ExtraItem[];
}

export function UserMenu({ contextLabel, extra }: Props) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-shadow"
        >
          <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="h-9 w-9">
            {user.avatar && <AvatarImage src={user.avatar} alt="" />}
            <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user.displayName}</div>
            {contextLabel ? (
              <div className="text-[11px] text-muted-foreground truncate">{contextLabel}</div>
            ) : (
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            )}
          </div>
        </DropdownMenuLabel>
        {extra && extra.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {extra.map((item) => (
              <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
                {item.icon}
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { signOut(); nav("/"); }}>
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
