export interface NavItem {
  icon: React.ReactNode;
  tooltip: string;
  position?: "left" | "center" | "right";
  button?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  /** Render Custom Element. Providing this will ignore the button attribute. **/
  render?: () => React.ReactNode;
}

export interface Route {
  path: string;
  element: React.ReactNode;
  /** If provided, this route will appear as a button in the navbar */
  navbar?: Omit<NavItem, "onClick" | "button">;
}
