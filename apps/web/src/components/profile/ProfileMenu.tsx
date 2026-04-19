import { useState } from "react";

import { KeyIcon, UserIcon } from "raster-react";
import { NavIconButton } from "../layout/Navbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/providers/AuthProvider";
import { ProfileForm } from "./ProfileEditor";

export function ProfileMenu() {
  const { user, loading, login, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (loading) {
    return (
      <NavIconButton disabled>
        <UserIcon />
      </NavIconButton>
    );
  }

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <NavIconButton {...props} onClick={login}>
              <KeyIcon />
            </NavIconButton>
          )}
        />
        <TooltipContent>
          <p>Sign In</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(props) => (
            <NavIconButton {...props}>
              <UserIcon />
            </NavIconButton>
          )}
        />
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {user.displayName ?? user.email ?? user.username}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setTimeout(() => setProfileOpen(true), 0)}
            >
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={logout}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ProfileForm onSuccess={() => setProfileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
