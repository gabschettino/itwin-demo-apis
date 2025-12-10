import { Database, Drone, Repeat2, Folder } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from './ui/sidebar';
import { NavLink } from 'react-router-dom';

// Navigation items for the sidebar
const items = [
  { title: "My iTwins", url: "/itwins", icon: Database },
  { title: "Reality Modeling (V1)", url: "/reality-data", icon: Drone },
  { title: "Reality Modeling V2", url: "/reality-modeling-v2", icon: Drone },
  { title: "Synchronization", url: "/synchronization", icon: Repeat2 },
  { title: "Storage", url: "/storage", icon: Folder },
    { title: "Forms", url: "/forms", icon: Folder },
];

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <img src="/itwin.svg" alt="iTwin" className="h-6 w-6 dark:invert" />
          <h2 className="font-semibold text-lg">iTwin Demo Portal</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink to={item.url} className={({ isActive }) => isActive ? 'block' : 'block'}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
